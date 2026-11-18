# Quickstart

Run the engine, price a trade and walk an order from payment to payout in a few minutes.

## Get the code

`@dacityswap/escrow-core` is not on npm yet. Until it is, use it from the repository.

```sh
git clone https://github.com/Nels0nx/dacityswap.git
cd dacityswap
pnpm install
pnpm test         # 49 engine tests; the contract's 52 run too if Foundry is installed
```

You need [Node.js 22+](https://nodejs.org) and [pnpm 10+](https://pnpm.io). The package has no
runtime dependencies and runs anywhere JavaScript does: a server, a worker, a browser.

Inside the monorepo, depend on it as a workspace package:

```json
{ "dependencies": { "@dacityswap/escrow-core": "workspace:*" } }
```

## Price a trade

```ts
import { quote, formatMoney } from '@dacityswap/escrow-core';

const priced = quote({ unitPriceMinor: 21_900, currency: 'EUR', method: 'card' });

formatMoney({ amountMinor: priced.totalMinor, currency: 'EUR' }); // "€231.29"
formatMoney({ amountMinor: priced.sellerPayoutMinor, currency: 'EUR' }); // "€208.05"
```

Amounts are always integers in minor units: `21_900` is €219.00.

## Walk an order through escrow

```ts
import { createEscrow, applyEventAs, settle, fundsLocation } from '@dacityswap/escrow-core';

let order = createEscrow({ id: 'esc_1', quote: priced, now: new Date() });
order.state; // 'awaiting_payment'

// The payment provider's webhook reports the capture.
order = applyEventAs(
  order,
  { type: 'PAYMENT_CAPTURED', paymentRef: 'pay_8f2c' },
  'system',
  new Date(),
);
fundsLocation(order.state); // 'escrow'

// The seller commits, delivers and marks it.
order = applyEventAs(order, { type: 'SELLER_ACCEPTED' }, 'seller', new Date());
order = applyEventAs(order, { type: 'SELLER_MARKED_DELIVERED' }, 'seller', new Date());
order.autoReleaseAt; // 24 hours from now

// The buyer confirms.
order = applyEventAs(order, { type: 'BUYER_CONFIRMED' }, 'buyer', new Date());
order.state; // 'completed'

settle(order);
// { buyerRefundMinor: 0, sellerPayoutMinor: 20805, platformRevenueMinor: 1643,
//   processingFeeMinor: 681, platformCostMinor: 0, currency: 'EUR' }
```

Every call returns a new record. Store it, and pass it back in for the next event.

## Handle a refusal

An event the state machine does not allow throws. Catch the two error types and turn them into
responses:

```ts
import { InvalidTransitionError, UnauthorizedActorError } from '@dacityswap/escrow-core';

try {
  order = applyEventAs(order, event, actor, new Date());
} catch (error) {
  if (error instanceof UnauthorizedActorError) return respond(403, error.message);
  if (error instanceof InvalidTransitionError) return respond(409, error.message);
  throw error;
}
```

## Run the deadlines

Call `tick` for every open order on a schedule. It applies the timeout that is due, if any, and
otherwise returns the same record:

```ts
import { tick } from '@dacityswap/escrow-core';

for (const order of await store.openOrders()) {
  const next = tick(order, new Date());
  if (next !== order) await store.save(next);
}
```

## Next

- The full API: [escrow-core reference](/developers/escrow-core)
- Connecting a payment provider: [Integrating payments](/developers/integration)
- Settling in a stablecoin: [The escrow contract](/developers/contract)
