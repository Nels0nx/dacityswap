// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @dev The subset of ERC-20 the escrow needs.
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title DacityEscrow
/// @notice Holds a buyer's stablecoin payment until an off-chain delivery is confirmed.
///
/// The contract is the on-chain mirror of the state machine in the `escrow-core` package:
///
///   fund ─► Funded ─accept─► Accepted ─markDelivered─► Delivered ─confirm / claim─► Completed
///             │                 │                          │
///             │ cancel          │ cancel (late)            │
///             ▼                 ▼                          │
///          Refunded ◄───────────┴─────── refund ───────────┤
///                                                          │
///                 Accepted / Delivered ─openDispute─► Disputed ─resolve─► Completed
///                                                                         Refunded
///                                                                         Split
///
/// Guarantees a user can verify by reading this file:
///
///  1. A trade's price can only ever be paid to that trade's buyer or seller. The platform
///     receives the fees that were fixed when the trade was funded, and nothing else.
///  2. Fees are fixed at funding and each is capped at `MAX_FEE_BPS` (10 %). Changing them
///     later never touches an open trade.
///  3. The arbiter can only act on a trade one of its parties has disputed, and can only
///     divide the money between those two parties.
///  4. Nothing can be held for ever. Every waiting state has a deadline, after which the party
///     kept waiting takes the money without anyone's permission: the buyer if the seller does
///     not accept or deliver, the seller if the buyer stays silent after delivery, the buyer
///     if the arbiter never rules.
///  5. The owner cannot stop a settlement. Pausing only prevents new trades, and `sweep` can
///     only take tokens that are not owed to anyone.
///  6. A recipient who cannot be paid does not block the other side: a failed transfer is
///     credited and can be withdrawn later.
///
/// @custom:security-contact security@dacityswap.com
/// @custom:status Unaudited. Never deployed to a production network. Do not use with real funds.
contract DacityEscrow {
    enum State {
        None,
        Funded,
        Accepted,
        Delivered,
        Disputed,
        Completed,
        Refunded,
        Split
    }

    struct Trade {
        address buyer;
        /// @dev When the current state times out. Zero once the trade is settled.
        uint64 deadline;
        State state;
        address seller;
        /// @dev The price: what the seller is selling for.
        uint128 amount;
        /// @dev Paid by the buyer on top of the price.
        uint128 buyerFee;
        /// @dev Deducted from what the seller receives.
        uint128 sellerFee;
    }

    uint16 public constant MAX_FEE_BPS = 1_000;
    uint64 public constant MAX_WINDOW = 90 days;
    uint256 private constant BPS = 10_000;
    /// @dev A buyer share of everything: a full refund.
    uint16 private constant EVERYTHING = 10_000;

    /// @notice The settlement token, e.g. USDC.
    IERC20 public immutable token;
    /// @notice Seconds the seller has to accept a funded trade.
    uint64 public immutable acceptWindow;
    /// @notice Seconds the seller has to deliver after accepting.
    uint64 public immutable deliveryWindow;
    /// @notice Seconds the buyer has to confirm or dispute once delivery is marked.
    uint64 public immutable releaseWindow;
    /// @notice Seconds the arbiter has to rule on a dispute.
    uint64 public immutable disputeWindow;

    address public owner;
    address public pendingOwner;
    address public arbiter;
    address public treasury;
    /// @notice Fee charged to the buyer on top of the price, in basis points.
    uint16 public buyerFeeBps;
    /// @notice Fee deducted from the seller's payout, in basis points.
    uint16 public sellerFeeBps;
    /// @notice When true, no new trade can be funded. Open trades are unaffected.
    bool public fundingPaused;

    /// @notice Tokens held for trades that are still open.
    uint256 public totalEscrowed;
    /// @notice Tokens credited to recipients whose payment could not be delivered.
    uint256 public totalOwed;

    mapping(bytes32 id => Trade) public trades;
    /// @notice Payments that failed to arrive and wait to be withdrawn.
    mapping(address account => uint256) public owed;

    uint256 private _entered = 1;

    event TradeFunded(
        bytes32 indexed id,
        address indexed buyer,
        address indexed seller,
        bytes32 orderId,
        uint256 amount,
        uint256 buyerFee,
        uint256 sellerFee,
        uint64 acceptBy
    );
    event TradeAccepted(bytes32 indexed id, uint64 deliverBy);
    event TradeDelivered(bytes32 indexed id, uint64 releasableAt);
    event TradeDisputed(bytes32 indexed id, address indexed by, uint64 rulingDue);
    event TradeCompleted(bytes32 indexed id, uint256 sellerAmount, uint256 fee);
    event TradeRefunded(bytes32 indexed id, uint256 buyerAmount);
    event TradeSplit(
        bytes32 indexed id, uint16 buyerShareBps, uint256 buyerAmount, uint256 sellerAmount, uint256 fee
    );
    event PaymentDeferred(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, address indexed to, uint256 amount);
    event FeesUpdated(uint16 buyerFeeBps, uint16 sellerFeeBps);
    event ArbiterUpdated(address indexed arbiter);
    event TreasuryUpdated(address indexed treasury);
    event FundingPaused(bool paused);
    event Swept(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferStarted(address indexed owner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error Unauthorized();
    error ZeroAddress();
    error ZeroAmount();
    error SelfTrade();
    error TradeExists();
    error InvalidState(State current);
    error DeadlineNotReached(uint64 deadline);
    error WindowClosed(uint64 deadline);
    error FeeTooHigh();
    error InvalidWindow();
    error InvalidShare();
    error FundingIsPaused();
    error TransferFailed();
    error UnsupportedToken();
    error NothingToWithdraw();
    error Reentrancy();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_entered != 1) revert Reentrancy();
        _entered = 2;
        _;
        _entered = 1;
    }

    /// @param token_ The settlement token. It must be a plain ERC-20: no fee on transfer, no rebasing.
    /// @param windows_ Seconds for, in order: accepting, delivering, confirming, ruling on a dispute.
    constructor(
        IERC20 token_,
        address arbiter_,
        address treasury_,
        uint16 buyerFeeBps_,
        uint16 sellerFeeBps_,
        uint64[4] memory windows_
    ) {
        if (address(token_).code.length == 0 || arbiter_ == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }
        if (buyerFeeBps_ > MAX_FEE_BPS || sellerFeeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        for (uint256 i = 0; i < 4; ++i) {
            if (windows_[i] == 0 || windows_[i] > MAX_WINDOW) revert InvalidWindow();
        }

        token = token_;
        arbiter = arbiter_;
        treasury = treasury_;
        buyerFeeBps = buyerFeeBps_;
        sellerFeeBps = sellerFeeBps_;
        acceptWindow = windows_[0];
        deliveryWindow = windows_[1];
        releaseWindow = windows_[2];
        disputeWindow = windows_[3];
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ─────────────────────────────────── Views ───────────────────────────────────

    /// @notice The id of the trade `buyer` creates for `orderId`.
    /// @dev Bound to the buyer, this contract and this chain, so nobody else can occupy it.
    function tradeId(address buyer, bytes32 orderId) public view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), buyer, orderId));
    }

    /// @notice The fees a trade of `amount` would be charged if it were funded now.
    /// @return buyerFee Paid by the buyer on top of `amount`.
    /// @return sellerFee Deducted from the seller's payout.
    function quote(uint128 amount) public view returns (uint128 buyerFee, uint128 sellerFee) {
        buyerFee = uint128(_share(amount, buyerFeeBps));
        sellerFee = uint128(_share(amount, sellerFeeBps));
    }

    // ────────────────────────────── Trade lifecycle ──────────────────────────────

    /// @notice Buyer locks `amount` plus the buyer fee for `seller`. Requires prior approval.
    /// @param orderId The order's id on the platform, e.g. keccak256 of its off-chain id.
    /// @return id The trade's id, as returned by `tradeId(msg.sender, orderId)`.
    function fund(bytes32 orderId, address seller, uint128 amount)
        external
        nonReentrant
        returns (bytes32 id)
    {
        if (fundingPaused) revert FundingIsPaused();
        if (seller == address(0)) revert ZeroAddress();
        if (seller == msg.sender) revert SelfTrade();
        if (amount == 0) revert ZeroAmount();

        id = tradeId(msg.sender, orderId);
        if (trades[id].state != State.None) revert TradeExists();

        (uint128 buyerFee, uint128 sellerFee) = quote(amount);
        uint64 acceptBy = uint64(block.timestamp) + acceptWindow;
        trades[id] = Trade({
            buyer: msg.sender,
            deadline: acceptBy,
            state: State.Funded,
            seller: seller,
            amount: amount,
            buyerFee: buyerFee,
            sellerFee: sellerFee
        });

        uint256 total = uint256(amount) + buyerFee;
        totalEscrowed += total;
        emit TradeFunded(id, msg.sender, seller, orderId, amount, buyerFee, sellerFee, acceptBy);

        // The escrow must hold exactly what it accounts for.
        uint256 before = token.balanceOf(address(this));
        _call(abi.encodeCall(IERC20.transferFrom, (msg.sender, address(this), total)));
        if (token.balanceOf(address(this)) - before != total) revert UnsupportedToken();
    }

    /// @notice Seller commits to the trade and starts the delivery clock.
    function accept(bytes32 id) external {
        Trade storage trade = trades[id];
        if (msg.sender != trade.seller) revert Unauthorized();
        if (trade.state != State.Funded) revert InvalidState(trade.state);

        trade.state = State.Accepted;
        trade.deadline = uint64(block.timestamp) + deliveryWindow;
        emit TradeAccepted(id, trade.deadline);
    }

    /// @notice Seller declares the in-game delivery done and starts the buyer's window.
    /// @dev Marking a funded trade delivered accepts it at the same time.
    function markDelivered(bytes32 id) external {
        Trade storage trade = trades[id];
        if (msg.sender != trade.seller) revert Unauthorized();
        if (trade.state != State.Funded && trade.state != State.Accepted) {
            revert InvalidState(trade.state);
        }

        trade.state = State.Delivered;
        trade.deadline = uint64(block.timestamp) + releaseWindow;
        emit TradeDelivered(id, trade.deadline);
    }

    /// @notice Buyer releases the funds to the seller. Allowed at any time before a dispute.
    function confirm(bytes32 id) external nonReentrant {
        Trade storage trade = trades[id];
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (!_isOpen(trade.state)) revert InvalidState(trade.state);
        _settle(id, trade, 0);
    }

    /// @notice Seller collects once the buyer's window has passed without a dispute.
    function claim(bytes32 id) external nonReentrant {
        Trade storage trade = trades[id];
        if (msg.sender != trade.seller) revert Unauthorized();
        if (trade.state != State.Delivered) revert InvalidState(trade.state);
        if (block.timestamp < trade.deadline) revert DeadlineNotReached(trade.deadline);
        _settle(id, trade, 0);
    }

    /// @notice Buyer takes the money back: freely before the seller accepts, and after the
    /// delivery deadline if the seller accepted but did not deliver.
    function cancel(bytes32 id) external nonReentrant {
        Trade storage trade = trades[id];
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (trade.state == State.Accepted) {
            if (block.timestamp < trade.deadline) revert DeadlineNotReached(trade.deadline);
        } else if (trade.state != State.Funded) {
            revert InvalidState(trade.state);
        }
        _settle(id, trade, EVERYTHING);
    }

    /// @notice Seller backs out and returns everything to the buyer.
    function refund(bytes32 id) external nonReentrant {
        Trade storage trade = trades[id];
        if (msg.sender != trade.seller) revert Unauthorized();
        if (!_isOpen(trade.state)) revert InvalidState(trade.state);
        _settle(id, trade, EVERYTHING);
    }

    /// @notice Either party freezes the trade and hands the decision to the arbiter.
    /// @dev Before the seller accepts there is nothing to dispute: the buyer can `cancel`.
    /// After delivery the buyer must dispute inside the release window.
    function openDispute(bytes32 id) external {
        Trade storage trade = trades[id];
        bool isBuyer = msg.sender == trade.buyer;
        if (!isBuyer && msg.sender != trade.seller) revert Unauthorized();
        if (trade.state != State.Accepted && trade.state != State.Delivered) {
            revert InvalidState(trade.state);
        }
        if (isBuyer && trade.state == State.Delivered && block.timestamp >= trade.deadline) {
            revert WindowClosed(trade.deadline);
        }

        trade.state = State.Disputed;
        trade.deadline = uint64(block.timestamp) + disputeWindow;
        emit TradeDisputed(id, msg.sender, trade.deadline);
    }

    /// @notice Arbiter settles a disputed trade by dividing it between its two parties.
    /// @param buyerShareBps The buyer's share of the price: 0 pays the seller in full,
    /// 10 000 refunds the buyer in full, anything between splits it.
    function resolve(bytes32 id, uint16 buyerShareBps) external nonReentrant {
        if (msg.sender != arbiter) revert Unauthorized();
        if (buyerShareBps > BPS) revert InvalidShare();
        Trade storage trade = trades[id];
        if (trade.state != State.Disputed) revert InvalidState(trade.state);
        _settle(id, trade, buyerShareBps);
    }

    /// @notice Buyer takes the money back when the arbiter has not ruled in time.
    function reclaimUnresolved(bytes32 id) external nonReentrant {
        Trade storage trade = trades[id];
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (trade.state != State.Disputed) revert InvalidState(trade.state);
        if (block.timestamp < trade.deadline) revert DeadlineNotReached(trade.deadline);
        _settle(id, trade, EVERYTHING);
    }

    /// @notice Collects payments that could not be delivered to the caller when they were due.
    /// @param to Where to send them. It may differ from the caller.
    function withdraw(address to) external nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = owed[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        owed[msg.sender] = 0;
        totalOwed -= amount;
        emit Withdrawn(msg.sender, to, amount);
        _call(abi.encodeCall(IERC20.transfer, (to, amount)));
    }

    // ─────────────────────────────────── Admin ───────────────────────────────────

    /// @notice Sets the fees for trades funded from now on. Open trades keep theirs.
    function setFees(uint16 newBuyerFeeBps, uint16 newSellerFeeBps) external onlyOwner {
        if (newBuyerFeeBps > MAX_FEE_BPS || newSellerFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        buyerFeeBps = newBuyerFeeBps;
        sellerFeeBps = newSellerFeeBps;
        emit FeesUpdated(newBuyerFeeBps, newSellerFeeBps);
    }

    function setArbiter(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert ZeroAddress();
        arbiter = newArbiter;
        emit ArbiterUpdated(newArbiter);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /// @notice Stops or resumes new trades. Every other function keeps working.
    function setFundingPaused(bool paused) external onlyOwner {
        fundingPaused = paused;
        emit FundingPaused(paused);
    }

    /// @notice Recovers tokens sent to the contract by mistake.
    /// @dev For the settlement token, only the surplus above what is escrowed or owed.
    function sweep(IERC20 token_, address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = token_.balanceOf(address(this));
        if (token_ == token) amount -= totalEscrowed + totalOwed;
        if (amount == 0) revert ZeroAmount();

        emit Swept(address(token_), to, amount);
        (bool ok, bytes memory result) = address(token_).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!ok || (result.length != 0 && !abi.decode(result, (bool)))) revert TransferFailed();
    }

    /// @notice Starts handing the contract to `newOwner`, who must then call `acceptOwnership`.
    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    // ───────────────────────────────── Internals ─────────────────────────────────

    function _isOpen(State state) private pure returns (bool) {
        return state == State.Funded || state == State.Accepted || state == State.Delivered;
    }

    /// @dev `value × rateBps / 10 000`, rounded half up: the one rounding rule of the platform,
    /// identical to `bps()` in escrow-core.
    function _share(uint256 value, uint256 rateBps) private pure returns (uint256) {
        return (value * rateBps + BPS / 2) / BPS;
    }

    /// @dev Closes a trade, giving the buyer `buyerShareBps` of the price back. Every amount is
    /// shared at that rate; the seller and the treasury take what is left, so the three parts
    /// always add up to exactly what the trade held. Mirrors `settleSplit` in escrow-core.
    function _settle(bytes32 id, Trade storage trade, uint16 buyerShareBps) private {
        uint256 amount = trade.amount;
        uint256 buyerFee = trade.buyerFee;

        uint256 priceBack = _share(amount, buyerShareBps);
        uint256 feeBack = _share(buyerFee, buyerShareBps);
        uint256 commission = trade.sellerFee - _share(trade.sellerFee, buyerShareBps);

        uint256 toBuyer = priceBack + feeBack;
        uint256 toSeller = amount - priceBack - commission;
        uint256 toTreasury = buyerFee - feeBack + commission;

        address buyer = trade.buyer;
        address seller = trade.seller;
        trade.deadline = 0;
        totalEscrowed -= amount + buyerFee;

        if (buyerShareBps == 0) {
            trade.state = State.Completed;
            emit TradeCompleted(id, toSeller, toTreasury);
        } else if (buyerShareBps == BPS) {
            trade.state = State.Refunded;
            emit TradeRefunded(id, toBuyer);
        } else {
            trade.state = State.Split;
            emit TradeSplit(id, buyerShareBps, toBuyer, toSeller, toTreasury);
        }

        _pay(buyer, toBuyer);
        _pay(seller, toSeller);
        _pay(treasury, toTreasury);
    }

    /// @dev Pays `to`, or credits the amount for a later `withdraw` if the transfer fails, so
    /// that one recipient who cannot be paid never holds up the others.
    function _pay(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok, bytes memory result) = address(token).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (ok && (result.length == 0 || (result.length == 32 && abi.decode(result, (bool))))) return;

        owed[to] += amount;
        totalOwed += amount;
        emit PaymentDeferred(to, amount);
    }

    /// @dev Tolerates tokens that return nothing instead of a bool (e.g. USDT).
    function _call(bytes memory data) private {
        (bool ok, bytes memory result) = address(token).call(data);
        if (!ok || (result.length != 0 && !abi.decode(result, (bool)))) revert TransferFailed();
    }
}
