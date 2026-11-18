# Changelog

Changes to the escrow engine and the contract. Both follow semantic versioning; before 1.0 a
minor version may break the API.

## 0.2.0 — 18 November 2026

The escrow is complete: every state that holds money now has a way out that does not depend on
anyone's goodwill.

### escrow-core

- **Added** deadlines for every waiting state: `paymentWindowMs`, `acceptanceWindowMs`,
  `deliveryWindowMs` and `disputeWindowMs` join `autoReleaseWindowMs`, with the events
  `PAYMENT_EXPIRED`, `ACCEPTANCE_EXPIRED`, `DELIVERY_EXPIRED` and `DISPUTE_EXPIRED`.
- **Added** `deadlineAt` on every record, and `nextDeadline`, `dueTimeout` and `tick`.
- **Added** roles: `EVENT_ACTORS`, `applyEventAs`, `availableActions` and
  `UnauthorizedActorError`.
- **Added** split rulings: `DISPUTE_RESOLVED` with `outcome: 'split'`, and the final state
  `split`.
- **Added** `settle` and `settleSplit`, which account for every cent of a finished trade.
- **Added** `verifyRecord`, which replays a record's history.
- **Added** a build, so the package can be published.
- **Changed** a seller can cancel and refund after accepting; a buyer no longer can.
- **Changed** a dispute can be opened only after the seller has accepted, and by the buyer only
  while the confirmation window is open.
- **Changed** `fundsLocation` can return `'split'`.

### contracts

- **Added** `accept`, `cancel`, `reclaimUnresolved` and `withdraw`.
- **Added** a buyer fee alongside the seller fee, both snapshotted at funding.
- **Added** split rulings: `resolve(id, buyerShareBps)` replaces `resolve(id, bool)`.
- **Added** deadlines for acceptance, delivery and disputes.
- **Added** deferred payments, so a recipient who cannot be paid does not block a settlement.
- **Added** `sweep`, limited to tokens that are neither escrowed nor owed.
- **Added** two-step ownership transfer and a funding pause.
- **Changed** trade ids are derived from the chain, the contract, the buyer and the order id.
- **Changed** fees round half up, matching the engine.
- **Changed** `fund` reverts for a token that does not deliver the full amount.
- **Renamed** `claimAfterWindow` to `claim`.
- **Tests** 52, including shared vectors and four invariants.

## 0.1.0 — 17 November 2026

- First version of the state machine, the fee engine and the reference contract.
