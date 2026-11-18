# State machine

The whole escrow is one table: for each state, the events it accepts and where each leads.
Anything not in the table throws. The source is
[`escrow.ts`](https://github.com/Nels0nx/dacityswap/blob/main/packages/escrow-core/src/escrow.ts).

<StateDiagram />

## States

| State              | Meaning                                          | Money is        | Final |
| ------------------ | ------------------------------------------------ | --------------- | ----- |
| `awaiting_payment` | Order placed, payment not captured               | with the buyer  |       |
| `funded`           | Payment locked, waiting for the seller to accept | in escrow       |       |
| `in_delivery`      | Seller accepted and is delivering                | in escrow       |       |
| `delivered`        | Seller marked delivery, buyer's window is open   | in escrow       |       |
| `disputed`         | A party asked for an arbiter                     | in escrow       |       |
| `completed`        | Released to the seller                           | with the seller | ✓     |
| `refunded`         | Returned to the buyer                            | with the buyer  | ✓     |
| `split`            | Divided by an arbiter                            | with both       | ✓     |
| `cancelled`        | Closed before any payment was captured           | with the buyer  | ✓     |

## Transitions

| From               | Event                     | Sent by         | To                                 |
| ------------------ | ------------------------- | --------------- | ---------------------------------- |
| `awaiting_payment` | `PAYMENT_CAPTURED`        | system          | `funded`                           |
|                    | `PAYMENT_FAILED`          | system          | `cancelled`                        |
|                    | `PAYMENT_EXPIRED` ⏱       | system          | `cancelled`                        |
|                    | `CANCELLED`               | buyer, seller   | `cancelled`                        |
| `funded`           | `SELLER_ACCEPTED`         | seller          | `in_delivery`                      |
|                    | `ACCEPTANCE_EXPIRED` ⏱    | system          | `refunded`                         |
|                    | `CANCELLED`               | buyer, seller   | `refunded`                         |
| `in_delivery`      | `SELLER_MARKED_DELIVERED` | seller          | `delivered`                        |
|                    | `DELIVERY_EXPIRED` ⏱      | system          | `refunded`                         |
|                    | `CANCELLED`               | seller only     | `refunded`                         |
|                    | `DISPUTE_OPENED`          | buyer, seller   | `disputed`                         |
| `delivered`        | `BUYER_CONFIRMED`         | buyer           | `completed`                        |
|                    | `AUTO_RELEASED` ⏱         | system          | `completed`                        |
|                    | `CANCELLED`               | seller only     | `refunded`                         |
|                    | `DISPUTE_OPENED`          | buyer ¹, seller | `disputed`                         |
| `disputed`         | `DISPUTE_RESOLVED`        | arbiter         | `completed`, `refunded` or `split` |
|                    | `DISPUTE_EXPIRED` ⏱       | system          | `refunded`                         |

⏱ Only once the state's [deadline](/guide/deadlines) has passed.
¹ Only while the confirmation window is open.

The four final states accept no event at all.

## Guards

Three rules cannot be expressed as a table lookup, so `applyEvent` checks them separately:

1. **Time.** A timeout event is refused until the deadline stored on the record has passed.
2. **Who is cancelling.** Once the seller has accepted, a `CANCELLED` from the buyer is refused.
   The buyer's route from there is a dispute or a missed deadline.
3. **Shares.** A split ruling must give the buyer between 1 and 9 999 basis points. All or
   nothing is a `release` or a `refund`, so each final state means exactly one thing.

## Events

```ts
type EscrowEvent =
  | { type: 'PAYMENT_CAPTURED'; paymentRef: string }
  | { type: 'PAYMENT_FAILED'; reason: string }
  | { type: 'PAYMENT_EXPIRED' }
  | { type: 'SELLER_ACCEPTED' }
  | { type: 'ACCEPTANCE_EXPIRED' }
  | { type: 'SELLER_MARKED_DELIVERED'; proofRef?: string }
  | { type: 'DELIVERY_EXPIRED' }
  | { type: 'BUYER_CONFIRMED' }
  | { type: 'AUTO_RELEASED' }
  | { type: 'DISPUTE_OPENED'; by: 'buyer' | 'seller'; reason: string }
  | { type: 'DISPUTE_RESOLVED'; outcome: 'release' | 'refund' }
  | { type: 'DISPUTE_RESOLVED'; outcome: 'split'; buyerShareBps: number }
  | { type: 'DISPUTE_EXPIRED' }
  | { type: 'CANCELLED'; by: 'buyer' | 'seller' };
```

## Properties the tests hold it to

- **Pure.** `applyEvent` never changes the record it is given. It returns a new one.
- **Total over the table.** Every state and event pair either transitions or throws
  `InvalidTransitionError`. There is no silent no-op.
- **No release without delivery.** Every path to `completed` passes through `delivered`: the
  seller is paid only after a confirmation, a closed confirmation window or an arbiter's ruling.
- **No dispute before acceptance.** Until the seller accepts, either side can walk away and
  the buyer is refunded, so there is nothing for an arbiter to decide.
- **Final means final.** No event leaves `completed`, `refunded`, `split` or `cancelled`.
- **Every waiting state has a deadline** and no final state has one.

## How the contract differs

The [on-chain escrow](/developers/contract) implements the same machine with two
differences, each forced by the chain:

| Engine                          | Contract                                                                   |
| ------------------------------- | -------------------------------------------------------------------------- |
| `awaiting_payment`, `cancelled` | Do not exist. Funding the trade is the payment                             |
| The system fires timeouts       | The protected party exercises them: `cancel`, `claim`, `reclaimUnresolved` |
