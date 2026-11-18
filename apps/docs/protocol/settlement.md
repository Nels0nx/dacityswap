# Settlement

`quote()` says what the buyer is charged. `settle()` says where every one of those cents went
once the trade is over. This page is the arithmetic between the two.

## The conservation rule

For every finished trade:

```
buyerRefund + sellerPayout + platformRevenue + processingFee  =  quote.total + platformCost
```

Nothing is created and nothing is lost. `platformCost` is money DacitySwap adds from its own
pocket, and it is non-zero only when a refund returns a processing fee the payment rail kept.
A randomised test checks this equation, and that no amount is ever negative, over thousands of
schedules, prices and shares.

## One formula for every outcome

Completion, refund and split are the same calculation with a different share for the buyer:
`0`, `10 000` or something in between, in basis points.

```ts
const priceBack = bps(quote.subtotalMinor, share);
const serviceFeeBack = bps(quote.buyerServiceFeeMinor, share);
const commissionWaived = bps(quote.sellerCommissionMinor, share);
const railFeeBack = bps(quote.processingFeeMinor, share);

const commission = quote.sellerCommissionMinor - commissionWaived;

buyerRefund = priceBack + serviceFeeBack + railFeeBack;
sellerPayout = quote.subtotalMinor - priceBack - commission;
platformRevenue = quote.buyerServiceFeeMinor - serviceFeeBack + commission;
processingFee = quote.processingFeeMinor;
platformCost = railFeeBack;
```

The buyer's parts are rounded. The seller and the platform take what is left. That is why the
parts always add up: there is only ever one rounded term on each line.

## The three outcomes for a €219.00 order paid by card

<SettlementBars />

The buyer was charged €231.29: €219.00 price, €5.48 service fee, €6.81 processing.

| Ends in                | Buyer   | Seller  | DacitySwap | Card network | DacitySwap covers |
| ---------------------- | ------- | ------- | ---------- | ------------ | ----------------- |
| `completed`            | €0.00   | €208.05 | €16.43     | €6.81        | €0.00             |
| `refunded`             | €231.29 | €0.00   | €0.00      | €6.81        | €6.81             |
| `split`, 40 % to buyer | €92.51  | €124.83 | €9.86      | €6.81        | €2.72             |

Read across any row: the first four columns add up to €231.29 plus the last one.

## Refunds and the processing fee

A card network keeps its fee when a payment is refunded. Someone has to carry it. The engine
makes that an explicit policy and not a hidden default:

```ts
settle(order, { refundProcessingFee: true }); // default: the buyer is made whole
settle(order, { refundProcessingFee: false }); // the buyer gets everything except the rail fee
```

With the default, the buyer of the order above is refunded €231.29 and DacitySwap absorbs the
€6.81. With the alternative, the buyer is refunded €224.48 and the platform's cost is zero.

## A cancelled order

An order cancelled before payment was captured settles to zeros. Nothing was charged, so there
is nothing to return.

## An open order

`settle()` returns `null` for an order that is not final. Until then the only true answer to
"where is the money?" is "in escrow".

## On-chain

The contract runs the same formula in `_settle`, with no processing fee: `amount` is the
price, `buyerFee` the service fee and `sellerFee` the commission. Its rounding function is the
same half-up rule:

```solidity
function _share(uint256 value, uint256 rateBps) private pure returns (uint256) {
    return (value * rateBps + BPS / 2) / BPS;
}
```

Both implementations are checked against [one file of vectors](/developers/test-vectors), so
"the contract mirrors the engine" is a tested statement.
