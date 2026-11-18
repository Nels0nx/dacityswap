# Audit trail

An order is not a row with a status column that someone updates. It is a list of events, each
with a time and the state it moved the order from and to. The current state is whatever that
list leads to.

## What a record contains

```json
{
  "id": "esc_m4k2q9",
  "state": "completed",
  "createdAt": "2026-11-19T18:00:00.000Z",
  "deadlineAt": null,
  "autoReleaseAt": null,
  "quote": { "totalMinor": 23129, "sellerPayoutMinor": 20805, "…": "…" },
  "history": [
    {
      "from": "awaiting_payment",
      "to": "funded",
      "at": "2026-11-19T18:01:12.000Z",
      "actor": "system",
      "event": { "type": "PAYMENT_CAPTURED", "paymentRef": "pay_8f2c" }
    },
    {
      "from": "funded",
      "to": "in_delivery",
      "at": "2026-11-19T18:04:40.000Z",
      "actor": "seller",
      "event": { "type": "SELLER_ACCEPTED" }
    },
    {
      "from": "in_delivery",
      "to": "delivered",
      "at": "2026-11-19T18:19:03.000Z",
      "actor": "seller",
      "event": { "type": "SELLER_MARKED_DELIVERED", "proofRef": "clip_91" }
    },
    {
      "from": "delivered",
      "to": "completed",
      "at": "2026-11-19T18:22:47.000Z",
      "actor": "buyer",
      "event": { "type": "BUYER_CONFIRMED" }
    }
  ]
}
```

The history is append-only. `applyEvent` never edits an entry; it returns a new record with one
more at the end.

<FlowDiagram name="audit" />

## Verifying a record

`verifyRecord` replays the history from the beginning and checks that it is a legal walk
through the state machine:

```ts
import { verifyRecord } from '@dacityswap/escrow-core';

verifyRecord(order);
// { valid: true }
// or
// { valid: false, index: 2, reason: 'BUYER_CONFIRMED is not allowed in "funded"' }
```

It fails when:

- a step does not start from the state the previous step ended in;
- an event is not allowed in the state it was applied to, or leads somewhere else;
- a step is dated before the one it follows;
- a step claims an actor who could not have sent that event;
- the record's `state` is not the one the history ends in.

So a stored order cannot be moved to `completed` without a confirmation, a deadline or a
ruling in its history, and a step cannot be removed without breaking the chain around it.
The [live order](/guide/try-it) has a button that tampers with a record so you can watch the
check fail.

## What it does and does not prove

`verifyRecord` proves a record is **internally consistent**: its state follows from its
history under the published rules. It does not prove the history is the true one. A party who
controls the storage could write a different, equally consistent history.

Two things close that gap, and both are on the [roadmap](/resources/roadmap):

- **Receipts.** Each party is given the record after every event. A later version that
  contradicts an earlier receipt is evidence of tampering.
- **On-chain settlement.** For stablecoin orders the contract's events are the history, and no
  one can rewrite them.

## Why it is built this way

- **Disputes need it.** An arbiter decides from what happened and when. The trail is that, in
  order, with who did it.
- **Regulators ask for it.** A platform that moves money between strangers has to be able to
  show the life of every payment.
- **It keeps the engine honest.** A pure function over an immutable record is easy to test, and
  the tests are the specification.
