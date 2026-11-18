// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DacityEscrow, IERC20} from "../src/DacityEscrow.sol";
import {BlocklistUSDC, FeeOnTransferToken, MockUSDC, NoReturnToken} from "./mocks/Tokens.sol";

abstract contract EscrowFixture is Test {
    BlocklistUSDC internal usdc;
    DacityEscrow internal escrow;

    address internal buyer = makeAddr("buyer");
    address internal seller = makeAddr("seller");
    address internal arbiter = makeAddr("arbiter");
    address internal treasury = makeAddr("treasury");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant ORDER = keccak256("ord_1");
    uint128 internal constant AMOUNT = 100e6; // 100 USDC
    uint128 internal constant BUYER_FEE = 2.5e6; // 2.5 %
    uint128 internal constant SELLER_FEE = 5e6; // 5 %
    uint256 internal constant START = 1_000e6;

    uint64 internal constant ACCEPT = 12 hours;
    uint64 internal constant DELIVERY = 1 days;
    uint64 internal constant RELEASE = 1 days;
    uint64 internal constant DISPUTE = 14 days;

    bytes32 internal id;

    function setUp() public virtual {
        usdc = new BlocklistUSDC();
        escrow = _deploy(address(usdc));
        usdc.mint(buyer, START);
        vm.prank(buyer);
        usdc.approve(address(escrow), type(uint256).max);
        id = escrow.tradeId(buyer, ORDER);
    }

    function _deploy(address token) internal returns (DacityEscrow) {
        return new DacityEscrow(IERC20(token), arbiter, treasury, 250, 500, _windows());
    }

    function _windows() internal pure returns (uint64[4] memory) {
        return [ACCEPT, DELIVERY, RELEASE, DISPUTE];
    }

    function _fund() internal {
        vm.prank(buyer);
        escrow.fund(ORDER, seller, AMOUNT);
    }

    function _accept() internal {
        _fund();
        vm.prank(seller);
        escrow.accept(id);
    }

    function _deliver() internal {
        _accept();
        vm.prank(seller);
        escrow.markDelivered(id);
    }

    function _dispute() internal {
        _deliver();
        vm.prank(buyer);
        escrow.openDispute(id);
    }

    function _state() internal view returns (DacityEscrow.State state) {
        (,, state,,,,) = escrow.trades(id);
    }

    function _deadline() internal view returns (uint64 deadline) {
        (, deadline,,,,,) = escrow.trades(id);
    }

    function _expectInvalidState(DacityEscrow.State current) internal {
        vm.expectRevert(abi.encodeWithSelector(DacityEscrow.InvalidState.selector, current));
    }
}

contract FundingTest is EscrowFixture {
    function test_FundLocksThePriceAndTheBuyerFee() public {
        vm.expectEmit(address(escrow));
        emit DacityEscrow.TradeFunded(
            id, buyer, seller, ORDER, AMOUNT, BUYER_FEE, SELLER_FEE, uint64(block.timestamp) + ACCEPT
        );
        vm.prank(buyer);
        bytes32 returned = escrow.fund(ORDER, seller, AMOUNT);

        assertEq(returned, id);
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT + BUYER_FEE);
        assertEq(usdc.balanceOf(buyer), START - AMOUNT - BUYER_FEE);
        assertEq(escrow.totalEscrowed(), AMOUNT + BUYER_FEE);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Funded));
        assertEq(_deadline(), block.timestamp + ACCEPT);
    }

    function test_QuoteRoundsHalfUpLikeTheEngine() public view {
        (uint128 buyerFee, uint128 sellerFee) = escrow.quote(21_900);
        assertEq(buyerFee, 548); // 547.5 rounds up
        assertEq(sellerFee, 1_095);
        (buyerFee,) = escrow.quote(19);
        assertEq(buyerFee, 0); // 0.475 rounds down
        (buyerFee,) = escrow.quote(20);
        assertEq(buyerFee, 1); // 0.5 rounds up
    }

    function test_RejectsBadFunding() public {
        vm.startPrank(buyer);
        vm.expectRevert(DacityEscrow.ZeroAddress.selector);
        escrow.fund(ORDER, address(0), AMOUNT);
        vm.expectRevert(DacityEscrow.SelfTrade.selector);
        escrow.fund(ORDER, buyer, AMOUNT);
        vm.expectRevert(DacityEscrow.ZeroAmount.selector);
        escrow.fund(ORDER, seller, 0);

        escrow.fund(ORDER, seller, AMOUNT);
        vm.expectRevert(DacityEscrow.TradeExists.selector);
        escrow.fund(ORDER, seller, AMOUNT);
        vm.stopPrank();
    }

    function test_AnotherBuyerCannotOccupyAnOrderId() public {
        usdc.mint(stranger, START);
        vm.startPrank(stranger);
        usdc.approve(address(escrow), type(uint256).max);
        escrow.fund(ORDER, seller, 1e6);
        vm.stopPrank();

        // The same order id from the real buyer is a different trade.
        _fund();
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Funded));
        assertTrue(escrow.tradeId(stranger, ORDER) != id);
    }

    function test_FeesAreFixedAtFunding() public {
        _fund();
        escrow.setFees(1_000, 1_000);
        vm.prank(buyer);
        escrow.confirm(id);
        assertEq(usdc.balanceOf(treasury), BUYER_FEE + SELLER_FEE);
    }

    function test_RefusesATokenThatTakesAFeeOnTransfer() public {
        FeeOnTransferToken taxed = new FeeOnTransferToken();
        DacityEscrow other = _deploy(address(taxed));
        taxed.mint(buyer, START);
        vm.startPrank(buyer);
        taxed.approve(address(other), type(uint256).max);
        vm.expectRevert(DacityEscrow.UnsupportedToken.selector);
        other.fund(ORDER, seller, AMOUNT);
        vm.stopPrank();
    }

    function test_WorksWithATokenThatReturnsNothing() public {
        NoReturnToken tether = new NoReturnToken();
        DacityEscrow other = _deploy(address(tether));
        tether.mint(buyer, START);
        vm.startPrank(buyer);
        tether.approve(address(other), type(uint256).max);
        bytes32 otherId = other.fund(ORDER, seller, AMOUNT);
        other.confirm(otherId);
        vm.stopPrank();
        assertEq(tether.balanceOf(seller), AMOUNT - SELLER_FEE);
        assertEq(tether.balanceOf(treasury), BUYER_FEE + SELLER_FEE);
    }
}

contract HappyPathTest is EscrowFixture {
    function test_AcceptStartsTheDeliveryClock() public {
        _fund();
        vm.expectEmit(address(escrow));
        emit DacityEscrow.TradeAccepted(id, uint64(block.timestamp) + DELIVERY);
        vm.prank(seller);
        escrow.accept(id);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Accepted));
        assertEq(_deadline(), block.timestamp + DELIVERY);
    }

    function test_MarkDeliveredStartsTheReleaseWindow() public {
        _accept();
        vm.expectEmit(address(escrow));
        emit DacityEscrow.TradeDelivered(id, uint64(block.timestamp) + RELEASE);
        vm.prank(seller);
        escrow.markDelivered(id);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Delivered));
    }

    function test_MarkingAFundedTradeDeliveredAcceptsIt() public {
        _fund();
        vm.prank(seller);
        escrow.markDelivered(id);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Delivered));
    }

    function test_ConfirmPaysSellerAndTreasury() public {
        _deliver();
        vm.expectEmit(address(escrow));
        emit DacityEscrow.TradeCompleted(id, AMOUNT - SELLER_FEE, BUYER_FEE + SELLER_FEE);
        vm.prank(buyer);
        escrow.confirm(id);

        assertEq(usdc.balanceOf(seller), AMOUNT - SELLER_FEE);
        assertEq(usdc.balanceOf(treasury), BUYER_FEE + SELLER_FEE);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(escrow.totalEscrowed(), 0);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Completed));
        assertEq(_deadline(), 0);
    }

    function test_BuyerMayConfirmEarly() public {
        _fund();
        vm.prank(buyer);
        escrow.confirm(id);
        assertEq(usdc.balanceOf(seller), AMOUNT - SELLER_FEE);
    }

    function test_SellerCannotClaimBeforeTheWindowCloses() public {
        _deliver();
        uint64 deadline = _deadline();
        vm.warp(deadline - 1);
        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(DacityEscrow.DeadlineNotReached.selector, deadline));
        escrow.claim(id);
    }

    function test_SellerClaimsOnceTheWindowHasClosed() public {
        _deliver();
        vm.warp(block.timestamp + RELEASE);
        vm.prank(seller);
        escrow.claim(id);
        assertEq(usdc.balanceOf(seller), AMOUNT - SELLER_FEE);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Completed));
    }

    function test_ClaimNeedsADelivery() public {
        _accept();
        vm.warp(block.timestamp + 365 days);
        vm.prank(seller);
        _expectInvalidState(DacityEscrow.State.Accepted);
        escrow.claim(id);
    }

    function test_ASettledTradeCannotBeSettledAgain() public {
        _deliver();
        vm.prank(buyer);
        escrow.confirm(id);

        vm.prank(buyer);
        _expectInvalidState(DacityEscrow.State.Completed);
        escrow.confirm(id);
        vm.prank(seller);
        _expectInvalidState(DacityEscrow.State.Completed);
        escrow.refund(id);
        vm.prank(seller);
        _expectInvalidState(DacityEscrow.State.Completed);
        escrow.claim(id);
        vm.prank(buyer);
        _expectInvalidState(DacityEscrow.State.Completed);
        escrow.openDispute(id);
    }
}

contract RefundTest is EscrowFixture {
    function _assertRefunded() internal view {
        assertEq(usdc.balanceOf(buyer), START);
        assertEq(usdc.balanceOf(seller), 0);
        assertEq(usdc.balanceOf(treasury), 0);
        assertEq(escrow.totalEscrowed(), 0);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Refunded));
    }

    function test_BuyerCancelsFreelyBeforeTheSellerAccepts() public {
        _fund();
        vm.expectEmit(address(escrow));
        emit DacityEscrow.TradeRefunded(id, AMOUNT + BUYER_FEE);
        vm.prank(buyer);
        escrow.cancel(id);
        _assertRefunded();
    }

    function test_BuyerCannotCancelAnAcceptedTradeBeforeTheDeadline() public {
        _accept();
        uint64 deadline = _deadline();
        vm.warp(deadline - 1);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(DacityEscrow.DeadlineNotReached.selector, deadline));
        escrow.cancel(id);
    }

    function test_BuyerCancelsWhenTheSellerMissesTheDeliveryDeadline() public {
        _accept();
        vm.warp(block.timestamp + DELIVERY);
        vm.prank(buyer);
        escrow.cancel(id);
        _assertRefunded();
    }

    function test_BuyerCannotCancelADeliveredTrade() public {
        _deliver();
        vm.warp(block.timestamp + 365 days);
        vm.prank(buyer);
        _expectInvalidState(DacityEscrow.State.Delivered);
        escrow.cancel(id);
    }

    function test_SellerCanBackOutAtAnyOpenStage() public {
        for (uint256 stage = 0; stage < 3; ++stage) {
            uint256 snapshot = vm.snapshotState();
            if (stage == 0) _fund();
            else if (stage == 1) _accept();
            else _deliver();
            vm.prank(seller);
            escrow.refund(id);
            _assertRefunded();
            vm.revertToState(snapshot);
        }
    }
}

contract DisputeTest is EscrowFixture {
    function test_EitherPartyCanDisputeAfterAcceptance() public {
        _accept();
        vm.expectEmit(address(escrow));
        emit DacityEscrow.TradeDisputed(id, seller, uint64(block.timestamp) + DISPUTE);
        vm.prank(seller);
        escrow.openDispute(id);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Disputed));
        assertEq(_deadline(), block.timestamp + DISPUTE);
    }

    function test_NothingToDisputeBeforeAcceptance() public {
        _fund();
        vm.prank(buyer);
        _expectInvalidState(DacityEscrow.State.Funded);
        escrow.openDispute(id);
    }

    function test_BuyerMustDisputeInsideTheReleaseWindow() public {
        _deliver();
        uint64 deadline = _deadline();
        vm.warp(deadline);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(DacityEscrow.WindowClosed.selector, deadline));
        escrow.openDispute(id);

        vm.warp(deadline - 1);
        vm.prank(buyer);
        escrow.openDispute(id);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Disputed));
    }

    function test_ADisputeFreezesTheTrade() public {
        _dispute();
        vm.warp(block.timestamp + RELEASE);

        vm.prank(seller);
        _expectInvalidState(DacityEscrow.State.Disputed);
        escrow.claim(id);
        vm.prank(buyer);
        _expectInvalidState(DacityEscrow.State.Disputed);
        escrow.confirm(id);
        vm.prank(seller);
        _expectInvalidState(DacityEscrow.State.Disputed);
        escrow.refund(id);
        vm.prank(buyer);
        _expectInvalidState(DacityEscrow.State.Disputed);
        escrow.cancel(id);
    }

    function test_ArbiterCannotTouchAnUndisputedTrade() public {
        _deliver();
        vm.prank(arbiter);
        _expectInvalidState(DacityEscrow.State.Delivered);
        escrow.resolve(id, 0);
    }

    function test_ArbiterReleasesToTheSeller() public {
        _dispute();
        vm.prank(arbiter);
        escrow.resolve(id, 0);
        assertEq(usdc.balanceOf(seller), AMOUNT - SELLER_FEE);
        assertEq(usdc.balanceOf(treasury), BUYER_FEE + SELLER_FEE);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Completed));
    }

    function test_ArbiterRefundsTheBuyerInFull() public {
        _dispute();
        vm.prank(arbiter);
        escrow.resolve(id, 10_000);
        assertEq(usdc.balanceOf(buyer), START);
        assertEq(usdc.balanceOf(treasury), 0);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Refunded));
    }

    function test_ArbiterSplitsEveryAmountAtTheSameRate() public {
        _dispute();
        // 40 % back to the buyer: of the price and of the buyer fee. The seller keeps 60 % of
        // the price and pays commission on that part only.
        uint256 toBuyer = 40e6 + 1e6;
        uint256 toSeller = 60e6 - 3e6;
        uint256 toTreasury = 1.5e6 + 3e6;

        vm.expectEmit(address(escrow));
        emit DacityEscrow.TradeSplit(id, 4_000, toBuyer, toSeller, toTreasury);
        vm.prank(arbiter);
        escrow.resolve(id, 4_000);

        assertEq(usdc.balanceOf(buyer), START - AMOUNT - BUYER_FEE + toBuyer);
        assertEq(usdc.balanceOf(seller), toSeller);
        assertEq(usdc.balanceOf(treasury), toTreasury);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Split));
    }

    function test_ArbiterCannotAwardMoreThanEverything() public {
        _dispute();
        vm.prank(arbiter);
        vm.expectRevert(DacityEscrow.InvalidShare.selector);
        escrow.resolve(id, 10_001);
    }

    function test_BuyerReclaimsWhenTheArbiterNeverRules() public {
        _dispute();
        uint64 deadline = _deadline();

        vm.warp(deadline - 1);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(DacityEscrow.DeadlineNotReached.selector, deadline));
        escrow.reclaimUnresolved(id);

        vm.warp(deadline);
        vm.prank(buyer);
        escrow.reclaimUnresolved(id);
        assertEq(usdc.balanceOf(buyer), START);
        assertEq(uint8(_state()), uint8(DacityEscrow.State.Refunded));
    }
}

contract AccessTest is EscrowFixture {
    function test_AStrangerCannotMoveATrade() public {
        _deliver();
        vm.startPrank(stranger);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.confirm(id);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.claim(id);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.cancel(id);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.refund(id);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.openDispute(id);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.resolve(id, 0);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.reclaimUnresolved(id);
        vm.stopPrank();
    }

    function test_EachPartyIsLimitedToItsOwnMoves() public {
        _fund();
        vm.prank(buyer);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.accept(id);
        vm.prank(buyer);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.markDelivered(id);
        vm.prank(seller);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.confirm(id);
        vm.prank(seller);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.cancel(id);
        vm.prank(arbiter);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.confirm(id);
    }

    function test_TheOwnerHasNoSayOverATrade() public {
        _dispute();
        // The test contract is the owner.
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.resolve(id, 0);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.reclaimUnresolved(id);
    }
}

contract AdminTest is EscrowFixture {
    function test_ConstructorValidatesItsArguments() public {
        vm.expectRevert(DacityEscrow.ZeroAddress.selector);
        new DacityEscrow(IERC20(address(0xdead)), arbiter, treasury, 250, 500, _windows());
        vm.expectRevert(DacityEscrow.ZeroAddress.selector);
        new DacityEscrow(IERC20(address(usdc)), address(0), treasury, 250, 500, _windows());
        vm.expectRevert(DacityEscrow.ZeroAddress.selector);
        new DacityEscrow(IERC20(address(usdc)), arbiter, address(0), 250, 500, _windows());
        vm.expectRevert(DacityEscrow.FeeTooHigh.selector);
        new DacityEscrow(IERC20(address(usdc)), arbiter, treasury, 1_001, 500, _windows());
        vm.expectRevert(DacityEscrow.FeeTooHigh.selector);
        new DacityEscrow(IERC20(address(usdc)), arbiter, treasury, 250, 1_001, _windows());

        uint64[4] memory windows = _windows();
        windows[2] = 0;
        vm.expectRevert(DacityEscrow.InvalidWindow.selector);
        new DacityEscrow(IERC20(address(usdc)), arbiter, treasury, 250, 500, windows);
        windows[2] = 91 days;
        vm.expectRevert(DacityEscrow.InvalidWindow.selector);
        new DacityEscrow(IERC20(address(usdc)), arbiter, treasury, 250, 500, windows);
    }

    function test_FeesAreCapped() public {
        vm.expectRevert(DacityEscrow.FeeTooHigh.selector);
        escrow.setFees(1_001, 0);
        vm.expectRevert(DacityEscrow.FeeTooHigh.selector);
        escrow.setFees(0, 1_001);
        escrow.setFees(1_000, 1_000);
        assertEq(escrow.buyerFeeBps(), 1_000);
        assertEq(escrow.sellerFeeBps(), 1_000);
    }

    function test_OnlyTheOwnerAdministers() public {
        vm.startPrank(stranger);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.setFees(0, 0);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.setArbiter(stranger);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.setTreasury(stranger);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.setFundingPaused(true);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.sweep(IERC20(address(usdc)), stranger);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.transferOwnership(stranger);
        vm.stopPrank();
    }

    function test_ArbiterAndTreasuryCannotBeZero() public {
        vm.expectRevert(DacityEscrow.ZeroAddress.selector);
        escrow.setArbiter(address(0));
        vm.expectRevert(DacityEscrow.ZeroAddress.selector);
        escrow.setTreasury(address(0));
    }

    function test_ANewArbiterTakesOverOpenDisputes() public {
        _dispute();
        escrow.setArbiter(stranger);
        vm.prank(arbiter);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.resolve(id, 0);
        vm.prank(stranger);
        escrow.resolve(id, 10_000);
        assertEq(usdc.balanceOf(buyer), START);
    }

    function test_OwnershipMovesInTwoSteps() public {
        escrow.transferOwnership(stranger);
        assertEq(escrow.owner(), address(this));

        vm.prank(buyer);
        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.acceptOwnership();

        vm.prank(stranger);
        escrow.acceptOwnership();
        assertEq(escrow.owner(), stranger);
        assertEq(escrow.pendingOwner(), address(0));

        vm.expectRevert(DacityEscrow.Unauthorized.selector);
        escrow.setFees(0, 0);
    }

    function test_PausingStopsNewTradesAndNothingElse() public {
        _deliver();
        escrow.setFundingPaused(true);

        vm.prank(buyer);
        vm.expectRevert(DacityEscrow.FundingIsPaused.selector);
        escrow.fund(keccak256("ord_2"), seller, AMOUNT);

        vm.prank(buyer);
        escrow.confirm(id);
        assertEq(usdc.balanceOf(seller), AMOUNT - SELLER_FEE);
    }

    function test_SweepCannotTouchEscrowedFunds() public {
        _fund();
        vm.expectRevert(DacityEscrow.ZeroAmount.selector);
        escrow.sweep(IERC20(address(usdc)), stranger);

        // Tokens sent by mistake are the only thing it can move.
        usdc.mint(address(escrow), 7e6);
        escrow.sweep(IERC20(address(usdc)), stranger);
        assertEq(usdc.balanceOf(stranger), 7e6);
        assertEq(usdc.balanceOf(address(escrow)), escrow.totalEscrowed());
    }

    function test_SweepRecoversAnyOtherToken() public {
        MockUSDC other = new MockUSDC();
        other.mint(address(escrow), 3e6);
        escrow.sweep(IERC20(address(other)), stranger);
        assertEq(other.balanceOf(stranger), 3e6);
    }
}

contract DeferredPaymentTest is EscrowFixture {
    function test_ABlockedSellerDoesNotHoldUpTheTreasuryOrLoseTheMoney() public {
        _deliver();
        usdc.setBlocked(seller, true);

        vm.expectEmit(address(escrow));
        emit DacityEscrow.PaymentDeferred(seller, AMOUNT - SELLER_FEE);
        vm.prank(buyer);
        escrow.confirm(id);

        assertEq(uint8(_state()), uint8(DacityEscrow.State.Completed));
        assertEq(usdc.balanceOf(treasury), BUYER_FEE + SELLER_FEE);
        assertEq(escrow.owed(seller), AMOUNT - SELLER_FEE);
        assertEq(escrow.totalOwed(), AMOUNT - SELLER_FEE);
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT - SELLER_FEE);

        // The owner cannot sweep what is owed.
        vm.expectRevert(DacityEscrow.ZeroAmount.selector);
        escrow.sweep(IERC20(address(usdc)), stranger);

        // The seller collects it at an address that can receive.
        address fresh = makeAddr("fresh");
        vm.prank(seller);
        escrow.withdraw(fresh);
        assertEq(usdc.balanceOf(fresh), AMOUNT - SELLER_FEE);
        assertEq(escrow.totalOwed(), 0);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_ABlockedBuyerDoesNotHoldUpASplit() public {
        _dispute();
        usdc.setBlocked(buyer, true);
        vm.prank(arbiter);
        escrow.resolve(id, 5_000);

        assertEq(usdc.balanceOf(seller), 50e6 - 2.5e6);
        assertEq(escrow.owed(buyer), 50e6 + 1.25e6);
    }

    function test_WithdrawNeedsSomethingOwedAndSomewhereToSendIt() public {
        vm.prank(seller);
        vm.expectRevert(DacityEscrow.NothingToWithdraw.selector);
        escrow.withdraw(seller);
        vm.prank(seller);
        vm.expectRevert(DacityEscrow.ZeroAddress.selector);
        escrow.withdraw(address(0));
    }
}

contract ConservationTest is EscrowFixture {
    /// @dev However a trade ends, the three recipients receive exactly what the buyer put in.
    function testFuzz_EveryOutcomePaysOutExactlyWhatWasHeld(
        uint128 amount,
        uint16 buyerFeeBps,
        uint16 sellerFeeBps,
        uint16 buyerShareBps
    ) public {
        amount = uint128(bound(amount, 1, 1e15));
        buyerFeeBps = uint16(bound(buyerFeeBps, 0, escrow.MAX_FEE_BPS()));
        sellerFeeBps = uint16(bound(sellerFeeBps, 0, escrow.MAX_FEE_BPS()));
        buyerShareBps = uint16(bound(buyerShareBps, 0, 10_000));
        escrow.setFees(buyerFeeBps, sellerFeeBps);

        (uint128 buyerFee,) = escrow.quote(amount);
        uint256 paid = uint256(amount) + buyerFee;
        usdc.mint(buyer, paid);
        uint256 buyerBefore = usdc.balanceOf(buyer);

        vm.startPrank(buyer);
        bytes32 tradeId = escrow.fund(ORDER, seller, amount);
        vm.stopPrank();
        vm.prank(seller);
        escrow.markDelivered(tradeId);
        vm.prank(buyer);
        escrow.openDispute(tradeId);
        vm.prank(arbiter);
        escrow.resolve(tradeId, buyerShareBps);

        uint256 back = usdc.balanceOf(buyer) - (buyerBefore - paid);
        assertEq(back + usdc.balanceOf(seller) + usdc.balanceOf(treasury), paid);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(escrow.totalEscrowed(), 0);
        // The buyer never gets back more than they paid, the seller never more than the price.
        assertLe(back, paid);
        assertLe(usdc.balanceOf(seller), amount);
    }
}

/// @dev The contract must compute what escrow-core computes. Both read the same vectors.
contract VectorTest is EscrowFixture {
    function test_MatchesTheEngineOnEverySharedVector() public {
        string memory json = vm.readFile("../escrow-core/vectors/settlement.json");
        uint256 count = 0;
        while (vm.keyExistsJson(json, _key(count, ""))) ++count;
        assertGt(count, 50, "vectors missing");

        for (uint256 i = 0; i < count; ++i) {
            uint128 amount = uint128(vm.parseJsonUint(json, _key(i, ".amount")));
            escrow.setFees(
                uint16(vm.parseJsonUint(json, _key(i, ".buyerFeeBps"))),
                uint16(vm.parseJsonUint(json, _key(i, ".sellerFeeBps")))
            );

            (uint128 buyerFee, uint128 sellerFee) = escrow.quote(amount);
            assertEq(buyerFee, vm.parseJsonUint(json, _key(i, ".buyerFee")), "buyer fee");
            assertEq(sellerFee, vm.parseJsonUint(json, _key(i, ".sellerFee")), "seller fee");

            uint256 paid = uint256(amount) + buyerFee;
            usdc.mint(buyer, paid);
            uint256[3] memory before =
                [usdc.balanceOf(buyer) - paid, usdc.balanceOf(seller), usdc.balanceOf(treasury)];

            bytes32 order = bytes32(i);
            vm.prank(buyer);
            bytes32 tradeId = escrow.fund(order, seller, amount);
            vm.prank(seller);
            escrow.markDelivered(tradeId);
            vm.prank(buyer);
            escrow.openDispute(tradeId);
            vm.prank(arbiter);
            escrow.resolve(tradeId, uint16(vm.parseJsonUint(json, _key(i, ".buyerShareBps"))));

            assertEq(
                usdc.balanceOf(buyer) - before[0], vm.parseJsonUint(json, _key(i, ".buyerRefund")), "buyer"
            );
            assertEq(
                usdc.balanceOf(seller) - before[1], vm.parseJsonUint(json, _key(i, ".sellerPayout")), "seller"
            );
            assertEq(
                usdc.balanceOf(treasury) - before[2], vm.parseJsonUint(json, _key(i, ".treasury")), "treasury"
            );
        }
    }

    function _key(uint256 index, string memory field) private pure returns (string memory) {
        return string.concat(".cases[", vm.toString(index), "]", field);
    }
}
