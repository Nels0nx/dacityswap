# Deadlines

Money in escrow is always waiting for someone. A deadline is what happens when that someone
does not act. Every state that holds money has one, and when it passes the party who was kept
waiting gets the money.

<FlowDiagram name="deadlines" />

## The five windows

| The escrow is waiting for | Window     | If it passes                          | Event                |
| ------------------------- | ---------- | ------------------------------------- | -------------------- |
| The buyer to pay          | 30 minutes | The order lapses. Nothing was charged | `PAYMENT_EXPIRED`    |
| The seller to accept      | 12 hours   | The buyer is refunded                 | `ACCEPTANCE_EXPIRED` |
| The seller to deliver     | 24 hours   | The buyer is refunded                 | `DELIVERY_EXPIRED`   |
| The buyer to confirm      | 24 hours   | The seller is paid                    | `AUTO_RELEASED`      |
| The arbiter to rule       | 14 days    | The buyer is refunded                 | `DISPUTE_EXPIRED`    |

These are the defaults in `DEFAULT_ESCROW_POLICY`. An operator can set different windows, but
cannot remove one: the engine rejects a window that is not a positive number.

## The principle behind each default

- **Who is waiting gets the money.** While the seller is expected to act, the buyer is the one
  waiting, so a missed deadline refunds the buyer. After delivery the seller is waiting, so
  silence pays the seller.
- **An unresolved dispute goes to the buyer.** It is the buyer's money that is locked. An
  arbiter who cannot be reached must not be able to keep it.

## A deadline is exact

A timeout cannot be applied a second early. The engine compares the clock with the deadline
stored on the order and refuses the event until it has passed:

```ts
applyEvent(order, { type: 'AUTO_RELEASED' }, oneMinuteBefore);
// InvalidTransitionError: Cannot apply AUTO_RELEASED to an escrow in state "delivered":
//   the buyer confirmation window is still open
```

The opposite also holds. Once the confirmation window has closed, the buyer can no longer open
a dispute: the seller's right to be paid has already arisen.

## Reading a deadline

```ts
import { nextDeadline, dueTimeout, tick } from '@dacityswap/escrow-core';

nextDeadline(order);
// { at: '2026-11-20T18:10:00.000Z', event: 'AUTO_RELEASED' }   or null if the order is final

dueTimeout(order, new Date()); // the event to apply now, or null
tick(order, new Date()); // applies it if it is due; otherwise returns the order unchanged
```

`tick` is safe to call on a schedule, as often as you like.

## Deadlines on-chain

The [contract](/developers/contract) has the same windows, fixed when it is deployed and
readable by anyone. One thing differs. Off-chain, the system fires a timeout. On-chain there is
no system, so a passed deadline is a right that the protected party exercises:

| After this deadline        | This party may call        |
| -------------------------- | -------------------------- |
| The seller did not deliver | Buyer: `cancel`            |
| The buyer did not confirm  | Seller: `claim`            |
| The arbiter did not rule   | Buyer: `reclaimUnresolved` |

No approval is needed for any of them, and no one can prevent them.
