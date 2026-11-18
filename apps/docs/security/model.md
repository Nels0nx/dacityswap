# Security model

What DacitySwap asks you to trust, what it does not, and how the design keeps the first list
short.

## The trust question

A marketplace that holds money between strangers has to answer one question: _what stops the
platform from doing the wrong thing with it?_ There are only three kinds of answer.

| Answer           | Example                                             |
| ---------------- | --------------------------------------------------- |
| It is impossible | A contract with no function that pays a third party |
| It is detectable | An order whose history can be replayed and checked  |
| It is promised   | A policy page                                       |

The design moves as much as it can from the third row to the first two, and says plainly what
is left in the third.

<FlowDiagram name="trust" />

## What you do not have to trust

**For a stablecoin order**, once the contract is audited and deployed:

- that DacitySwap will not take your payment: the contract has no way to send it anywhere but
  to you or the seller;
- that it will not change the fee on your order: the fee is stored in the trade when it is
  funded;
- that it will stay online: every deadline can be exercised by the party it protects, directly
  on-chain;
- that it will not freeze your order: pausing stops new trades only.

**For any order:**

- that the fee shown is the fee charged: both come from the same public function;
- that a stored order was not quietly altered: `verifyRecord` replays its history.

## What you do have to trust

| Trust                                                    | Why it cannot be removed                                  | What limits it                                                |
| -------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| The arbiter judges disputes fairly                       | Delivery happens inside a game. No program can observe it | It can only divide one disputed trade between its two parties |
| For card orders, that DacitySwap runs the published code | Card money is held by a payment provider, off-chain       | The code and its tests are public; records are verifiable     |
| The stablecoin's issuer                                  | An issuer can freeze any address, this contract included  | Nothing. It is a property of the token                        |
| The seller, until delivery                               | That is what the escrow is for                            | The buyer's money stays locked until delivery or a refund     |

## Threats and how they are met

| Threat                                              | Defence                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Seller takes the money and does not deliver         | Payment is locked until confirmation; missed deadlines refund the buyer                  |
| Buyer receives the item and refuses to confirm      | Automatic release when the confirmation window closes                                    |
| Buyer disputes everything to stall                  | A dispute hands the decision to an arbiter with a deadline; it does not return the money |
| Platform or owner key is compromised                | The owner cannot move escrowed funds, change an open trade's fee or block a settlement   |
| Arbiter key is compromised                          | It can misjudge only trades already in dispute; the owner can replace it                 |
| Arbiter disappears                                  | The buyer reclaims a dispute that is not ruled on in time                                |
| Someone front-runs an order id to block it          | The trade id includes the buyer's address                                                |
| A blocked address halts a settlement                | Failed payments are credited for later withdrawal; the rest proceed                      |
| A token that under-delivers corrupts the accounting | `fund` verifies the balance change and reverts                                           |
| Re-entrancy through the token                       | State is updated before transfers; a guard covers every function that moves money        |
| Rounding drift between the app and the contract     | One rounding rule, enforced on both by shared vectors                                    |
| A request claims to be another role                 | `applyEventAs` checks the role; the role comes from the server-side session              |

## What is not open

The line is drawn at one question: _does this code decide what happens to a user's money?_ If
yes, it is public. The parts that stay private are the ones where publishing the rules would
help someone beat them:

- fraud and risk scoring;
- identity verification integrations;
- moderation, and the tooling arbiters use.

None of them can move money outside the rules on this site. The reasoning is recorded in
[ADR 0002](https://github.com/Nels0nx/dacityswap/blob/main/docs/adr/0002-open-core-boundary.md).

## Operational commitments at launch

These are intentions, listed so they can be held against what is eventually deployed:

- the contract's owner is a multisig behind a timelock;
- the deployed bytecode is verified and its address is published on this site;
- an audit report is published before real funds are accepted;
- card details are entered into the payment provider's hosted fields and never reach
  DacitySwap's servers.
