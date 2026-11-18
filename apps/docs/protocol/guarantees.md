# Guarantees

What you can rely on, and what each claim rests on. A guarantee here is something enforced by
published code and covered by a test, not a statement of intent.

<p class="status">The contract is unaudited and not deployed</p>

These hold for the code as written. They become guarantees about _your_ money only once that
code is audited, deployed and verified at a published address. Until then, treat this page as
the specification an audit will be held to.

## Engine guarantees

| #   | Guarantee                                                       | Enforced by                      |
| --- | --------------------------------------------------------------- | -------------------------------- |
| 1   | An order moves only along declared transitions                  | `TRANSITIONS`, `transition()`    |
| 2   | Funds are released only after delivery, a deadline or a ruling  | The transition table             |
| 3   | A role can send only its own events                             | `EVENT_ACTORS`, `applyEventAs()` |
| 4   | A timeout cannot fire before its deadline                       | `guard()`                        |
| 5   | Every state that holds money has a deadline                     | `TIMEOUTS`, tested per state     |
| 6   | Fees are exactly what `quote()` returns, with one rounding rule | `quote()`, `bps()`               |
| 7   | Every finished trade accounts for every cent                    | `settle()`, randomised test      |
| 8   | A record's state follows from its history                       | `verifyRecord()`                 |

## Contract guarantees

Each of these is stated at the top of
[`DacityEscrow.sol`](https://github.com/Nels0nx/dacityswap/blob/main/packages/contracts/src/DacityEscrow.sol)
and has at least one test named for it.

### 1. A trade's price goes only to its buyer or its seller

There is no function that sends a trade's price anywhere else. The platform receives the fees
fixed at funding, and nothing more.

_Tests: `test_AStrangerCannotMoveATrade`, `test_TheOwnerHasNoSayOverATrade`, the conservation
fuzz test._

### 2. Fees are fixed at funding and capped

The fees are stored in the trade when it is funded. `setFees` changes the rate for future
trades only, and reverts above 10 % for either side.

_Tests: `test_FeesAreFixedAtFunding`, `test_FeesAreCapped`._

### 3. The arbiter is limited to disputed trades

`resolve` reverts unless the trade is `Disputed`, and it can only divide the trade between its
two parties.

_Tests: `test_ArbiterCannotTouchAnUndisputedTrade`, `test_ArbiterCannotAwardMoreThanEverything`._

### 4. Nothing can be held for ever

| If                                    | Then                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| The seller never accepts              | The buyer calls `cancel` at any time                         |
| The seller accepts and never delivers | The buyer calls `cancel` after the delivery window           |
| The buyer never confirms              | The seller calls `claim` after the release window            |
| The arbiter never rules               | The buyer calls `reclaimUnresolved` after the dispute window |

None of these needs anyone's approval.

_Tests: `test_BuyerCancelsWhenTheSellerMissesTheDeliveryDeadline`,
`test_SellerClaimsOnceTheWindowHasClosed`, `test_BuyerReclaimsWhenTheArbiterNeverRules`._

### 5. The owner cannot stop a settlement or take escrowed funds

Pausing blocks `fund` and nothing else. `sweep` can move only tokens that are neither held for
an open trade nor owed to anyone.

_Tests: `test_PausingStopsNewTradesAndNothingElse`, `test_SweepCannotTouchEscrowedFunds`._

### 6. One recipient cannot block another

If a payment to one address fails, for example because a stablecoin issuer has blocked it, the
amount is credited to that address and the other payments go through. The credit can be
withdrawn later, to any address.

_Tests: `test_ABlockedSellerDoesNotHoldUpTheTreasuryOrLoseTheMoney`,
`test_ABlockedBuyerDoesNotHoldUpASplit`._

## Invariants

Four properties are checked after every call of random multi-trade sequences: 64 sequences of 96
calls each, over 6,000 calls per property, across many trades at once:

| Invariant                                                                                 |
| ----------------------------------------------------------------------------------------- |
| The contract's token balance equals `totalEscrowed + totalOwed`                           |
| `totalEscrowed` equals the sum of what every open trade holds                             |
| No token is created or destroyed: every one is with a party, the treasury or the contract |
| A settled trade has no deadline and an open trade always has one                          |

## What is not guaranteed

Being clear about the limits is part of the guarantee.

- **That the item was delivered.** Delivery happens inside a game. The contract cannot see it.
  That is why there is a confirmation window and an arbiter.
- **That the arbiter rules fairly.** The arbiter is trusted to judge evidence. The design
  limits what a wrong ruling can do, to one disputed trade, and what a missing one can do, to
  nothing.
- **Anything about the token.** If a stablecoin's issuer freezes the contract's own balance,
  no escrow can release it. The contract supports plain ERC-20 tokens only and refuses one that
  takes a fee on transfer.
- **What happens to the fees.** The contract pays them to the treasury and stops there. That
  fees are used to buy $DCSWAP is a [company policy](/guide/fees#where-the-fees-go), not a
  property of the code.
- **The off-chain platform.** Card payments are held by a payment provider, not by this
  contract. The engine's rules apply to them, but their enforcement rests on DacitySwap running
  the published code. See the [security model](/security/model).
