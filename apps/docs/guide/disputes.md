# Disputes

A dispute is how a trade is settled when the two sides disagree about whether it happened. It
freezes the money and hands the decision to an arbiter.

## Opening one

Either party can open a dispute once the seller has accepted the order:

- **The buyer**, when the item did not arrive or was not what was sold. After delivery is
  marked, this must happen inside the 24-hour confirmation window.
- **The seller**, when the buyer cannot be reached to receive a delivery, or confirms nothing
  while refusing to cooperate.

Before the seller accepts there is nothing to dispute: the buyer can simply cancel.

## What freezing means

The moment a dispute opens:

- the confirmation clock stops, so the seller cannot be paid by default;
- the buyer cannot confirm, the seller cannot refund, neither can cancel;
- a new clock starts: the arbiter has 14 days.

The only way out of a dispute is a ruling or that deadline.

<SequenceDiagram name="dispute" />

## What the arbiter can do

| Ruling  | Result                                                                         |
| ------- | ------------------------------------------------------------------------------ |
| Release | The seller is paid as if the buyer had confirmed                               |
| Refund  | The buyer gets everything back                                                 |
| Split   | The price is divided. The buyer's share can be anything from 0.01 % to 99.99 % |

A split divides every amount at the same rate. If the buyer is awarded 40 % of a €219.00 order
paid by card:

| Goes to    | Amount  | How                                                             |
| ---------- | ------- | --------------------------------------------------------------- |
| Buyer      | €92.51  | 40 % of the price, of the service fee and of the processing fee |
| Seller     | €124.83 | 60 % of the price, less 5 % commission on that part             |
| DacitySwap | €9.86   | 60 % of the service fee and the commission on the seller's part |

## What the arbiter cannot do

- Rule on an order that neither party has disputed.
- Send the money anywhere other than to the buyer and the seller of that order.
- Keep an order frozen. After 14 days without a ruling the buyer is refunded in full, and
  on-chain the buyer can take the refund without the arbiter's involvement.

These are not policies. They are properties of the
[state machine](/protocol/state-machine) and of the [contract](/protocol/guarantees).

## Who is the arbiter?

At launch, DacitySwap's own dispute team. That is a point of trust, and the design narrows it
as far as it can: the arbiter's power is limited to dividing one disputed order between its two
parties, and a ruling is recorded in the order's history like every other event.

Evidence handling, appeal and the tooling arbiters use are not open source. They are part of
what [stays private](/security/model#what-is-not-open).
