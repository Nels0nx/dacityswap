# escrow-core reference

`@dacityswap/escrow-core` is the escrow state machine, the fee engine and the settlement
maths. It is pure TypeScript with no dependencies, about 700 lines, and every function is
synchronous and free of side effects.

| Module          | What it holds                                               |
| --------------- | ----------------------------------------------------------- |
| `money.ts`      | Integer amounts and the one rounding rule                   |
| `fees.ts`       | The fee schedule and `quote()`                              |
| `escrow.ts`     | States, events, transitions, deadlines, roles, verification |
| `settlement.ts` | `settle()`: who received what                               |

## Money

### `bps(amountMinor, basisPoints)`

Applies a rate to an amount and rounds half up. The only place a fraction is ever rounded.

```ts
bps(21_900, 250); // 548   (547.5 rounds up)
bps(1, 4_999); // 0
```

Throws `RangeError` if the amount is not a non-negative safe integer, or the rate is not an
integer from 0 to 10 000.

### `money(amountMinor, currency)` · `formatMoney(value, locale?)`

Construct and display an amount. Currencies: `'EUR' | 'USD' | 'USDC'`.

## Fees

### `quote(input, schedule?)`

```ts
quote(input: {
  unitPriceMinor: number;
  quantity?: number;          // default 1
  currency: Currency;
  method: 'card' | 'crypto';
}, schedule?: FeeSchedule): Quote
```

| `Quote` field           | Meaning                                           |
| ----------------------- | ------------------------------------------------- |
| `subtotalMinor`         | Unit price × quantity                             |
| `buyerServiceFeeMinor`  | Charged to the buyer on top                       |
| `processingFeeMinor`    | The payment rail's fee, on subtotal + service fee |
| `totalMinor`            | What the buyer is charged                         |
| `sellerCommissionMinor` | Deducted from the seller                          |
| `sellerPayoutMinor`     | What the seller receives on release               |
| `platformRevenueMinor`  | Service fee + commission                          |

### `DEFAULT_FEE_SCHEDULE`

```ts
{
  buyerServiceBps: 250,
  sellerCommissionBps: 500,
  processing: {
    card:   { bps: 290, fixedMinor: 30 },
    crypto: { bps: 100, fixedMinor: 0 },
  },
}
```

## Escrow

### `createEscrow({ id, quote, now, policy? })`

Returns a new `EscrowRecord` in `awaiting_payment`, with its payment deadline set.

### `applyEvent(record, event, now, policy?, actor?)`

Applies an event and returns the next record. Throws `InvalidTransitionError` when the state,
a deadline or a guard does not allow it. Use it where the caller's identity is already
established, such as a payment webhook or a scheduler.

### `applyEventAs(record, event, actor, now, policy?)`

The same, but first checks that `actor` may send this event, and throws
`UnauthorizedActorError` if not. Use it for anything a person asked for.

```ts
type Actor = 'buyer' | 'seller' | 'arbiter' | 'system';
```

### `tick(record, now, policy?)`

Applies the timeout that is due at `now`. Returns the same record, by identity, when nothing is
due.

### Reading a record

| Function                         | Returns                                                |
| -------------------------------- | ------------------------------------------------------ |
| `fundsLocation(state)`           | `'buyer' \| 'escrow' \| 'seller' \| 'split'`           |
| `isTerminal(state)`              | Whether the state is final                             |
| `canApply(state, eventType)`     | Whether the table has that edge                        |
| `availableEvents(state)`         | Every event type the state accepts                     |
| `availableActions(state, actor)` | The ones that role may send. Drives a UI's buttons     |
| `nextDeadline(record)`           | `{ at, event }` for the running deadline, or `null`    |
| `dueTimeout(record, now)`        | The timeout event to apply now, or `null`              |
| `transition(state, event)`       | The target state by the table alone, without guards    |
| `verifyRecord(record)`           | `{ valid: true }` or `{ valid: false, index, reason }` |

### `EscrowRecord`

```ts
interface EscrowRecord {
  id: string;
  state: EscrowState;
  quote: Quote;
  createdAt: string; // ISO-8601
  deadlineAt: string | null; // when the current state times out
  autoReleaseAt: string | null; // the same deadline, while the state is 'delivered'
  history: EscrowTransition[]; // { from, to, event, at, actor? }
}
```

A record is plain JSON. Store it as it is.

### `EscrowPolicy`

| Field                 | Default    | Deadline for                    |
| --------------------- | ---------- | ------------------------------- |
| `paymentWindowMs`     | 30 minutes | The buyer to pay                |
| `acceptanceWindowMs`  | 12 hours   | The seller to accept            |
| `deliveryWindowMs`    | 24 hours   | The seller to deliver           |
| `autoReleaseWindowMs` | 24 hours   | The buyer to confirm or dispute |
| `disputeWindowMs`     | 14 days    | The arbiter to rule             |

Pass any subset; the rest come from `DEFAULT_ESCROW_POLICY`. A window that is not a positive
whole number of milliseconds throws `RangeError`.

### Constants

`ESCROW_STATES`, `HAPPY_PATH`, `TIMEOUT_EVENTS`, `EVENT_ACTORS` and `DEFAULT_ESCROW_POLICY` are
exported, so a UI or a test can be driven by the same data as the engine.

## Settlement

### `settle(record, policy?)`

Returns a `Settlement` for a record in a final state and `null` for one that is still open.

### `settleSplit(quote, buyerShareBps, policy?)`

The underlying calculation: what each side receives when the buyer gets `buyerShareBps` of the
price back. `0` is a completion and `10_000` a full refund.

```ts
interface Settlement {
  currency: Currency;
  buyerRefundMinor: number;
  sellerPayoutMinor: number;
  platformRevenueMinor: number;
  processingFeeMinor: number; // kept by the payment rail
  platformCostMinor: number; // rail fees the platform returned out of its own pocket
}
```

`SettlementPolicy` has one field, `refundProcessingFee` (default `true`). See
[Settlement](/protocol/settlement).

## Errors

| Error                    | Thrown when                                        | Suggested HTTP status |
| ------------------------ | -------------------------------------------------- | --------------------- |
| `InvalidTransitionError` | The state, a deadline or a guard forbids the event | 409                   |
| `UnauthorizedActorError` | The actor's role may not send the event            | 403                   |
| `RangeError`             | An amount, rate, window or share is out of range   | 400                   |

`InvalidTransitionError` carries `state` and `eventType`; `UnauthorizedActorError` carries
`actor` and `eventType`.

## Stability

The package is at 0.2. Its event and state names are meant to be stable, because stored
records depend on them, but the API may still change before 1.0. Changes are listed in the
[changelog](/resources/changelog).
