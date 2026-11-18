# Integrating payments

The engine does not move money. It decides when money may move. Something else has to capture
a payment, hold it and pay it out: a card processor for card payments, the
[escrow contract](/developers/contract) for stablecoins. This page is about wiring the two
together.

<p class="status">Interfaces built · payment adapters connect at launch</p>

## The shape

<FlowDiagram name="integration" />

Your server owns the records and calls the engine. The payment rail owns the money. The rule
that keeps them honest is simple: **the rail only ever does what the engine's latest record
says.**

## The payment port

The web app talks to payments through one interface, in
[`lib/payments/types.ts`](https://github.com/Nels0nx/dacityswap/blob/main/apps/web/src/lib/payments/types.ts):

```ts
interface PaymentProvider {
  readonly method: 'card' | 'crypto';
  readonly displayName: string;
  createIntent(input: { orderId: string; quote: Quote }): Promise<PaymentIntent>;
  /** Resolves once funds are captured and can be locked in escrow. */
  confirm(
    intent: PaymentIntent,
    instrument: PaymentInstrument,
    onProgress?: (progress: PaymentProgress) => void,
  ): Promise<PaymentReceipt>;
}
```

Today the web app registers two development adapters behind it. A production adapter replaces
one of them in a single file, [`lib/payments/index.ts`](https://github.com/Nels0nx/dacityswap/blob/main/apps/web/src/lib/payments/index.ts),
and nothing in the interface changes.

## Mapping events to the rail

| Engine event                           | Card processor                             | Contract                                  |
| -------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| `PAYMENT_CAPTURED`                     | The capture webhook arrived                | `TradeFunded` log                         |
| `SELLER_ACCEPTED`                      | —                                          | `accept`                                  |
| `SELLER_MARKED_DELIVERED`              | —                                          | `markDelivered`                           |
| `BUYER_CONFIRMED` · `AUTO_RELEASED`    | Transfer `sellerPayoutMinor` to the seller | `confirm` · `claim`                       |
| `CANCELLED` · `*_EXPIRED` → `refunded` | Refund `buyerRefundMinor` to the buyer     | `cancel` · `refund` · `reclaimUnresolved` |
| `DISPUTE_OPENED`                       | Put the payout on hold                     | `openDispute`                             |
| `DISPUTE_RESOLVED`                     | Pay each side what `settle()` says         | `resolve(id, buyerShareBps)`              |

For card payments, take the amounts from `settle(record)`. Never recompute them next to the
payment call: the point of the engine is that there is one place where they are decided.

## Three rules for a correct integration

### 1. Persist, then pay

Apply the event, store the new record, and only then instruct the rail. If the process dies in
between, a reconciliation job can see a record that is final with no matching payout and finish
the job. The other order leaves money moved with nothing to explain it.

<SequenceDiagram name="persist" />

### 2. Make every rail call idempotent

Use the escrow id and the index of the history entry as the idempotency key. A retry after a
timeout then cannot pay twice.

```ts
const key = `${record.id}:${record.history.length}`;
```

### 3. Take the actor from the session, never from the request

`applyEventAs` trusts the `actor` you give it. Derive it on the server from who is logged in
and their relationship to the order. A request body that says `"actor": "arbiter"` is not
evidence of anything.

## Card payments need a licensed partner

Holding a buyer's card payment before paying a seller is a regulated activity. In practice it
is done through a payment provider's marketplace product, which holds the funds and pays out
on the platform's instruction. DacitySwap does not hold card funds itself, and neither should
an integration built on this engine without the right authorisation. See
[Legal](/resources/legal).

## On-chain: reading the contract

A stablecoin order needs no webhook. Subscribe to the contract's events and translate each
into the engine's event for the same order, so the off-chain record and the chain agree:

```ts
escrow.on('TradeFunded', (id, buyer, seller, orderId, amount) => {
  save(applyEvent(load(orderId), { type: 'PAYMENT_CAPTURED', paymentRef: id }, new Date()));
});
```

The chain is the source of truth for the money. The record is the source of truth for
everything around it: the listing, the proof of delivery, the conversation.
