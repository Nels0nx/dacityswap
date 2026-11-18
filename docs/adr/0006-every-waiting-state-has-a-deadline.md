# ADR 0006: Every waiting state has a deadline

- Status: accepted
- Date: 2026-11-18

## Context

The first version of the escrow had one deadline: the buyer's window to confirm a delivery.
Everywhere else a trade could wait for ever. A seller who never accepted, a seller who accepted
and never delivered and an arbiter who never ruled each left the buyer's money locked with no
way out that did not depend on someone's goodwill. On-chain this was worse: with the arbiter's
key lost, a disputed trade was frozen permanently.

## Decision

Give every state that holds money a deadline and a default outcome, and make the default
favour the party who was kept waiting.

| Waiting for           | Default window | If it passes          |
| --------------------- | -------------- | --------------------- |
| The buyer to pay      | 30 minutes     | The order lapses      |
| The seller to accept  | 12 hours       | The buyer is refunded |
| The seller to deliver | 24 hours       | The buyer is refunded |
| The buyer to confirm  | 24 hours       | The seller is paid    |
| The arbiter to rule   | 14 days        | The buyer is refunded |

Off-chain, the system fires the timeout (`tick`). On-chain there is no system, so a passed
deadline is a right the protected party exercises itself (`cancel`, `claim`,
`reclaimUnresolved`). Nobody else can fire it.

An unresolved dispute goes to the buyer because it is the buyer's money that is locked.

## Consequences

- No state can hold money indefinitely, and no key whose loss can freeze a trade remains.
- A buyer could open a dispute hoping the arbiter is slow. The window is long, and a dispute
  does not return the money by itself, so this buys a delay at most.
- The engine and the contract differ in who triggers a timeout. The difference is documented,
  and the outcome is the same.
- Windows are policy. They are parameters of the engine and constructor arguments of the
  contract; on-chain they are immutable once deployed.
- Making on-chain deadlines permissionless (anyone can fire them) was rejected: a third party
  could then cancel a trade whose seller is a few minutes late and whose buyer is happy to wait.
