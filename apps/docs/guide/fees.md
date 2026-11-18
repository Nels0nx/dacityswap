# Fees

Every fee DacitySwap charges is computed by one public function, `quote()`. The checkout, the
amount captured and the seller's payout all come from the same call, so the three can never
disagree.

<ClientOnly>
  <FeeCalculator />
</ClientOnly>

## The schedule

| Fee               | Rate               | Paid by | Goes to                              |
| ----------------- | ------------------ | ------- | ------------------------------------ |
| Service fee       | 2.5 % of the price | Buyer   | [Buying $DCSWAP](#where-the-fees-go) |
| Seller commission | 5 % of the price   | Seller  | [Buying $DCSWAP](#where-the-fees-go) |
| Card processing   | 2.9 % + €0.30      | Buyer   | The card network                     |
| Crypto processing | 1 %                | Buyer   | The payment rail                     |

The processing fee is charged on the price plus the service fee. It is a pass-through cost:
DacitySwap does not receive it.

## Where the fees go

DacitySwap does not keep its marketplace fees as company revenue. Once the marketplace is live,
the service fee and the seller commission are used to buy $DCSWAP on the open market.

This is a company policy, not a rule in the code. The engine computes the fees and the
[escrow contract](/developers/contract) pays them to its treasury address; neither of them buys
anything, and nothing on-chain enforces the policy. Processing fees are not part of it: they
belong to the card network or the payment rail.

<!-- TODO (founder + lawyer, before this page is public): on which venue the buys are made, how
often, and how anyone can check them. See docs/COMPLIANCE.md, section 1.8. -->

::: warning Not financial advice
The policy says what the fees are spent on. It says nothing about the price of $DCSWAP, and
nothing on this site is an offer of $DCSWAP or a recommendation to buy it.
:::

## Where the schedule lives

These are the defaults in
[`fees.ts`](https://github.com/Nels0nx/dacityswap/blob/main/packages/escrow-core/src/fees.ts).
The schedule that applies at launch will be published in the same file before it takes effect.

## Worked examples

All by card, quantity 1.

| Price   | Service fee | Processing | Buyer pays | Commission | Seller receives |
| ------- | ----------- | ---------- | ---------- | ---------- | --------------- |
| €1.00   | €0.03       | €0.33      | €1.36      | €0.05      | €0.95           |
| €10.00  | €0.25       | €0.60      | €10.85     | €0.50      | €9.50           |
| €82.00  | €2.05       | €2.74      | €86.79     | €4.10      | €77.90          |
| €219.00 | €5.48       | €6.81      | €231.29    | €10.95     | €208.05         |

The same €219.00 item paid in crypto costs the buyer €226.72: the processing fee is €2.24
instead of €6.81. The seller receives the same €208.05 either way.

## How the numbers are computed

```ts
import { quote } from '@dacityswap/escrow-core';

quote({ unitPriceMinor: 21_900, currency: 'EUR', method: 'card' });
// {
//   subtotalMinor:          21_900,   price × quantity
//   buyerServiceFeeMinor:      548,   2.5 % of 21 900 = 547.5, rounded half up
//   processingFeeMinor:        681,   2.9 % of (21 900 + 548) = 650.99 → 651, plus 30
//   totalMinor:             23_129,   what the buyer is charged
//   sellerCommissionMinor:   1_095,   5 % of 21 900
//   sellerPayoutMinor:      20_805,   21 900 − 1 095
//   platformRevenueMinor:    1_643,   548 + 1 095
// }
```

Three rules make this exact:

1. **Amounts are integers.** Every amount is a whole number of minor units (cents). A
   floating-point number never touches a balance.
2. **Rates are basis points.** One basis point is 0.01 %, so 2.5 % is `250`.
3. **There is one rounding rule.** A fraction of a cent is rounded half up, in a single
   function, `bps()`. The contract uses the same rule and is
   [tested against the same vectors](/developers/test-vectors).

## What happens to fees when a trade does not complete

| The trade ends in | Service fee                          | Commission                        | Processing fee          |
| ----------------- | ------------------------------------ | --------------------------------- | ----------------------- |
| Completed         | Kept                                 | Charged                           | Kept by the rail        |
| Refunded          | Returned to the buyer                | Not charged                       | Returned to the buyer   |
| Split             | Shared at the same rate as the price | Charged only on the seller's part | Shared at the same rate |

<SettlementBars />

A refund makes the buyer whole. The card network does not give its fee back, so DacitySwap
covers it. The arithmetic for each case is on the [Settlement](/protocol/settlement) page.

## Fees on-chain

The [escrow contract](/developers/contract) charges the service fee and the commission and has
no processing fee: the buyer pays the network's gas directly. Both fees are fixed at the moment
a trade is funded, and each is capped at 10 % in the contract itself. No change to the rates
can touch an order that is already open.
