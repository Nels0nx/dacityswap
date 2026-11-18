# Run an order yourself

One order for a €219.00 item, paid by card. You play every role and you control the clock.
Each button calls the same engine DacitySwap runs, so the page cannot let you do anything a
real order would refuse.

<ClientOnly>
  <EscrowSimulator />
</ClientOnly>

## Things to try

- **The healthy path.** System: _Payment captured_. Seller: _Accept the order_, then _Mark
  delivered_. Buyer: _Confirm and release_. The settlement shows who received what.
- **A seller who disappears.** Capture the payment, then press _Let the deadline pass_. The
  buyer is refunded without anyone deciding anything.
- **A buyer who goes quiet.** Deliver the order, then let the deadline pass. The seller is paid.
- **A dispute.** After delivery, open a dispute as the buyer. Notice that neither side has any
  button left: the money is frozen. Rule as the arbiter, or let the ruling deadline pass and
  see the buyer refunded by default.
- **A split.** In a dispute, choose a share and press _Split_. Every amount, the fees included,
  is divided at the same rate.
- **Tampering.** Press _Tamper with the stored state_. It marks the order completed without an
  event, the way a dishonest database could. `verifyRecord()` notices at once.

## What you are looking at

| Part              | Comes from                                         |
| ----------------- | -------------------------------------------------- |
| The buttons       | `availableActions(state, actor)`                   |
| A refusal         | `applyEventAs()` throwing `InvalidTransitionError` |
| The deadline      | `nextDeadline(record)`                             |
| The settlement    | `settle(record)`                                   |
| The history check | `verifyRecord(record)`                             |

The reference for each is in [escrow-core](/developers/escrow-core).
