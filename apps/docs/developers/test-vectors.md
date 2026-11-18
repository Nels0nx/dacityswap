# Shared test vectors

The contract is described as a mirror of the engine. A description can drift. So the claim is
tested: both implementations must reproduce the same file of numbers.

## The file

[`packages/escrow-core/vectors/settlement.json`](https://github.com/Nels0nx/dacityswap/blob/main/packages/escrow-core/vectors/settlement.json)
holds 96 cases. Each is a price, two fee rates and a share for the buyer, with the results the
engine computes. One of them:

```json
{
  "amount": "100",
  "buyerFeeBps": 210,
  "sellerFeeBps": 678,
  "buyerFee": "2",
  "sellerFee": "7",
  "buyerShareBps": 5237,
  "buyerRefund": "53",
  "sellerPayout": "45",
  "treasury": "4"
}
```

The cases cover the awkward amounts on purpose: 1, 2 and 3 units, where half-up rounding
decides everything; zero fees; shares of 0, 1, 5 000, 9 999 and 10 000 basis points; and
amounts up to a trillion units.

## How it is enforced

<FlowDiagram name="vectors" />

- The engine's test regenerates the cases and fails if the file differs. The file cannot go
  stale.
- The contract's test funds a trade for each case, disputes it, resolves it with the case's
  share and compares every balance with the file.

If either side changes its arithmetic, one of the two tests fails.

## Run them

```sh
pnpm --filter @dacityswap/escrow-core test
pnpm --filter @dacityswap/contracts test
```

To change the fee or settlement maths on purpose, regenerate the file and commit it with the
change, so the difference is visible in review:

```sh
UPDATE_VECTORS=1 pnpm --filter @dacityswap/escrow-core test
```

## Using the vectors yourself

If you implement the escrow in another language, or audit this one, the file is the quickest
check there is. The inputs map directly:

| Vector field                              | Engine                                          | Contract                        |
| ----------------------------------------- | ----------------------------------------------- | ------------------------------- |
| `amount`                                  | `subtotalMinor`                                 | `amount`                        |
| `buyerFeeBps`, `sellerFeeBps`             | `buyerServiceBps`, `sellerCommissionBps`        | `buyerFeeBps`, `sellerFeeBps`   |
| `buyerFee`, `sellerFee`                   | `buyerServiceFeeMinor`, `sellerCommissionMinor` | `quote(amount)`                 |
| `buyerRefund`, `sellerPayout`, `treasury` | `settleSplit(quote, share)`                     | Balance changes after `resolve` |

The vectors assume no processing fee, because on-chain there is none.
