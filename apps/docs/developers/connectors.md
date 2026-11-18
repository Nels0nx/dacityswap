# Connectors

DacitySwap is an escrow with things plugged into it: payment methods, a database, a chain and,
market by market, games. Each of them connects through an interface, so the escrow never
changes when a new one is added.

<FlowDiagram name="architecture" />

| Connector         | Interface           | Where                                                                                                                     | Status                                                     |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Card payments     | `PaymentProvider`   | [`lib/payments/types.ts`](https://github.com/Nels0nx/dacityswap/blob/main/apps/web/src/lib/payments/types.ts)             | Interface built; adapter connects with our payment partner |
| Crypto payments   | `PaymentProvider`   | same                                                                                                                      | Interface built; settles through the contract              |
| Stablecoin escrow | `DacityEscrow`      | [`DacityEscrow.sol`](https://github.com/Nels0nx/dacityswap/blob/main/packages/contracts/src/DacityEscrow.sol)             | Written and tested; audited before deployment              |
| Market data       | `MarketRepository`  | [`server/market-repository.ts`](https://github.com/Nels0nx/dacityswap/blob/main/apps/web/src/server/market-repository.ts) | Interface built; connects to the database                  |
| Games             | `DeliveryConnector` | Proposed below                                                                                                            | Designed; built per game as markets open                   |

## Payments

Checkout talks to one interface. A provider creates an intent for a quote and confirms it;
the escrow takes over from the captured payment.

```ts
interface PaymentProvider {
  readonly method: 'card' | 'crypto';
  createIntent(input: { orderId: string; quote: Quote }): Promise<PaymentIntent>;
  confirm(intent: PaymentIntent, instrument: PaymentInstrument): Promise<PaymentReceipt>;
}
```

The receipt becomes the engine's `PAYMENT_CAPTURED` event. Releases and refunds go back to the
provider with the amounts from `settle()`. The rules for doing that safely are on
[Integrating payments](/developers/integration).

## Market data

The app and the public API read the market through one interface, so the storage behind it can
change without touching a component.

```ts
interface MarketRepository {
  listListings(filter?: { game?: GameId; category?: CategoryId }): Promise<readonly Listing[]>;
  snapshot(): Promise<MarketSnapshot>;
}
```

## Stablecoins

The contract is a connector too: for an order paid in a stablecoin, its events are the
payment, the delivery and the settlement. Translating them into engine events keeps the
off-chain record and the chain in step. See [The escrow contract](/developers/contract).

## Games

A game connector answers one question the escrow cannot answer by itself: _did the item
arrive?_ Where a game exposes that, through an official API, a marketplace or a server the
operator runs, the connector turns it into evidence the escrow can act on.

<p class="status">Proposed interface · not in the code yet</p>

```ts
interface DeliveryConnector {
  /** The game this connector serves, e.g. a catalogue id. */
  readonly game: GameId;

  /** Checks that the seller can deliver what the listing promises, before it goes live. */
  verifyListing(listing: Listing, seller: AccountLink): Promise<'ok' | { refused: string }>;

  /**
   * Looks for the delivery of an order in the game. Returns proof when it has happened,
   * which the platform records as SELLER_MARKED_DELIVERED with that proof attached.
   */
  findDelivery(order: Order): Promise<{ proofRef: string; at: Date } | null>;
}
```

What a connector changes, and what it does not:

| With a game connector                                   | Without one                                      |
| ------------------------------------------------------- | ------------------------------------------------ |
| Delivery is detected and recorded with proof            | The seller marks delivery and attaches proof     |
| Disputes about whether an item arrived mostly disappear | The buyer confirms, or objects within the window |
| The same deadlines, roles and settlement apply          | The same deadlines, roles and settlement apply   |

A connector can only add evidence. It cannot move money: that stays with the state machine,
the deadlines and, for disputes, the arbiter.

### Which games, and when

A game market opens where trading it is lawful: a publisher that allows it, an official API or
marketplace, or terms that permit it. The order is set by our legal work, not by the code. When
a game opens a lawful way in, its connector is the first thing the team builds.

## Writing a connector

1. Implement the interface in its own module. Nothing outside it should know the provider or
   the game.
2. Register it in the composition root: one line, in the file that maps methods or games to
   adapters.
3. Translate everything into engine events. A connector never sets an order's state directly.
4. Make every outward call idempotent, keyed by the escrow id and the index of the history
   entry.
5. Test it against the engine: the order must pass `verifyRecord()` after every event your
   connector caused.
