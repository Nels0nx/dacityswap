// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DacityEscrow, IERC20} from "../src/DacityEscrow.sol";
import {BlocklistUSDC} from "./mocks/Tokens.sol";

/// @dev Drives the escrow with random, legal moves from four buyers and four sellers, across
/// many trades at once, with time passing and recipients being blocked and unblocked.
contract Handler is Test {
    DacityEscrow public immutable escrow;
    BlocklistUSDC public immutable usdc;
    address public immutable arbiter;
    address public immutable treasury;

    address[] public actors;
    bytes32[] public ids;
    uint256 public minted;

    constructor(DacityEscrow escrow_, BlocklistUSDC usdc_, address arbiter_, address treasury_) {
        escrow = escrow_;
        usdc = usdc_;
        arbiter = arbiter_;
        treasury = treasury_;
        for (uint256 i = 0; i < 8; ++i) {
            actors.push(makeAddr(string.concat("actor", vm.toString(i))));
        }
    }

    function idCount() external view returns (uint256) {
        return ids.length;
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function _trade(uint256 seed)
        private
        view
        returns (bytes32 id, address buyer, uint64 deadline, DacityEscrow.State state, address seller)
    {
        id = ids[seed % ids.length];
        (buyer, deadline, state, seller,,,) = escrow.trades(id);
    }

    function fund(uint256 buyerSeed, uint256 sellerSeed, uint128 amount) external {
        address buyer = actors[buyerSeed % 4];
        address seller = actors[4 + (sellerSeed % 4)];
        amount = uint128(bound(amount, 1, 50_000e6));

        (uint128 buyerFee,) = escrow.quote(amount);
        uint256 total = uint256(amount) + buyerFee;
        usdc.mint(buyer, total);
        minted += total;

        vm.startPrank(buyer);
        usdc.approve(address(escrow), total);
        ids.push(escrow.fund(bytes32(ids.length), seller, amount));
        vm.stopPrank();
    }

    function accept(uint256 seed) external {
        if (ids.length == 0) return;
        (bytes32 id,,, DacityEscrow.State state, address seller) = _trade(seed);
        if (state != DacityEscrow.State.Funded) return;
        vm.prank(seller);
        escrow.accept(id);
    }

    function markDelivered(uint256 seed) external {
        if (ids.length == 0) return;
        (bytes32 id,,, DacityEscrow.State state, address seller) = _trade(seed);
        if (state != DacityEscrow.State.Funded && state != DacityEscrow.State.Accepted) return;
        vm.prank(seller);
        escrow.markDelivered(id);
    }

    function confirm(uint256 seed) external {
        if (ids.length == 0) return;
        (bytes32 id, address buyer,, DacityEscrow.State state,) = _trade(seed);
        if (!_open(state)) return;
        vm.prank(buyer);
        escrow.confirm(id);
    }

    function claim(uint256 seed) external {
        if (ids.length == 0) return;
        (bytes32 id,, uint64 deadline, DacityEscrow.State state, address seller) = _trade(seed);
        if (state != DacityEscrow.State.Delivered || block.timestamp < deadline) return;
        vm.prank(seller);
        escrow.claim(id);
    }

    function cancel(uint256 seed) external {
        if (ids.length == 0) return;
        (bytes32 id, address buyer, uint64 deadline, DacityEscrow.State state,) = _trade(seed);
        bool late = state == DacityEscrow.State.Accepted && block.timestamp >= deadline;
        if (state != DacityEscrow.State.Funded && !late) return;
        vm.prank(buyer);
        escrow.cancel(id);
    }

    function refund(uint256 seed) external {
        if (ids.length == 0) return;
        (bytes32 id,,, DacityEscrow.State state, address seller) = _trade(seed);
        if (!_open(state)) return;
        vm.prank(seller);
        escrow.refund(id);
    }

    function openDispute(uint256 seed, bool byBuyer) external {
        if (ids.length == 0) return;
        (bytes32 id, address buyer, uint64 deadline, DacityEscrow.State state, address seller) = _trade(seed);
        if (state != DacityEscrow.State.Accepted && state != DacityEscrow.State.Delivered) return;
        if (byBuyer && state == DacityEscrow.State.Delivered && block.timestamp >= deadline) return;
        vm.prank(byBuyer ? buyer : seller);
        escrow.openDispute(id);
    }

    function resolve(uint256 seed, uint16 buyerShareBps) external {
        if (ids.length == 0) return;
        (bytes32 id,,, DacityEscrow.State state,) = _trade(seed);
        if (state != DacityEscrow.State.Disputed) return;
        vm.prank(arbiter);
        escrow.resolve(id, uint16(bound(buyerShareBps, 0, 10_000)));
    }

    function reclaimUnresolved(uint256 seed) external {
        if (ids.length == 0) return;
        (bytes32 id, address buyer, uint64 deadline, DacityEscrow.State state,) = _trade(seed);
        if (state != DacityEscrow.State.Disputed || block.timestamp < deadline) return;
        vm.prank(buyer);
        escrow.reclaimUnresolved(id);
    }

    function setBlocked(uint256 seed, bool blocked) external {
        usdc.setBlocked(actors[seed % actors.length], blocked);
    }

    function withdraw(uint256 seed) external {
        address account = actors[seed % actors.length];
        if (escrow.owed(account) == 0 || usdc.blocked(account)) return;
        vm.prank(account);
        escrow.withdraw(account);
    }

    function setFees(uint16 buyerFeeBps, uint16 sellerFeeBps) external {
        vm.prank(escrow.owner());
        escrow.setFees(uint16(bound(buyerFeeBps, 0, 1_000)), uint16(bound(sellerFeeBps, 0, 1_000)));
    }

    function warp(uint32 by) external {
        vm.warp(block.timestamp + bound(by, 1, 3 days));
    }

    function _open(DacityEscrow.State state) private pure returns (bool) {
        return state == DacityEscrow.State.Funded || state == DacityEscrow.State.Accepted
            || state == DacityEscrow.State.Delivered;
    }
}

contract DacityEscrowInvariantTest is Test {
    DacityEscrow internal escrow;
    BlocklistUSDC internal usdc;
    Handler internal handler;
    address internal arbiter = makeAddr("arbiter");
    address internal treasury = makeAddr("treasury");

    function setUp() public {
        usdc = new BlocklistUSDC();
        uint64[4] memory windows = [uint64(12 hours), 1 days, 1 days, 14 days];
        escrow = new DacityEscrow(IERC20(address(usdc)), arbiter, treasury, 250, 500, windows);
        handler = new Handler(escrow, usdc, arbiter, treasury);
        targetContract(address(handler));
    }

    /// @dev The contract holds exactly what it owes: open trades plus deferred payments.
    function invariant_HoldsExactlyWhatItOwes() public view {
        assertEq(usdc.balanceOf(address(escrow)), escrow.totalEscrowed() + escrow.totalOwed());
    }

    /// @dev `totalEscrowed` is the sum of what every open trade holds, and nothing else.
    function invariant_EscrowedIsTheSumOfOpenTrades() public view {
        uint256 sum = 0;
        for (uint256 i = 0; i < handler.idCount(); ++i) {
            (,, DacityEscrow.State state,, uint128 amount, uint128 buyerFee,) = escrow.trades(handler.ids(i));
            bool open = state == DacityEscrow.State.Funded || state == DacityEscrow.State.Accepted
                || state == DacityEscrow.State.Delivered || state == DacityEscrow.State.Disputed;
            if (open) sum += uint256(amount) + buyerFee;
        }
        assertEq(sum, escrow.totalEscrowed());
    }

    /// @dev Money is never created or destroyed: it is with a party, the treasury or the escrow.
    function invariant_EveryTokenIsAccountedFor() public view {
        uint256 sum = usdc.balanceOf(address(escrow)) + usdc.balanceOf(treasury);
        for (uint256 i = 0; i < handler.actorCount(); ++i) {
            sum += usdc.balanceOf(handler.actors(i));
        }
        assertEq(sum, handler.minted());
    }

    /// @dev A settled trade has no deadline; an open one always has one in the future or past.
    function invariant_OnlyOpenTradesCarryADeadline() public view {
        for (uint256 i = 0; i < handler.idCount(); ++i) {
            (, uint64 deadline, DacityEscrow.State state,,,,) = escrow.trades(handler.ids(i));
            bool settled = state == DacityEscrow.State.Completed || state == DacityEscrow.State.Refunded
                || state == DacityEscrow.State.Split;
            assertEq(deadline == 0, settled);
        }
    }
}
