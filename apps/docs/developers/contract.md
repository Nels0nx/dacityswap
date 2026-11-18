# The escrow contract

`DacityEscrow` holds a buyer's stablecoin payment until an off-chain delivery is confirmed. It
is one contract, under 500 lines with its comments, with no dependencies, no proxy and no
upgrade path.

<p class="status">Unaudited · never deployed to a production network</p>

::: danger Do not use it with real funds
The contract has a thorough test suite but has not been reviewed by an independent auditor. It
has no production deployment. Any address claiming to be the DacitySwap escrow today is not.
:::

## Lifecycle

<FlowDiagram name="contract" />

## A trade, step by step

```solidity
// 1. The buyer approves the escrow for the price plus the buyer fee, then funds.
(uint128 buyerFee,) = escrow.quote(amount);
usdc.approve(address(escrow), amount + buyerFee);
bytes32 id = escrow.fund(orderId, seller, amount);

// 2. The seller commits, delivers in the game and marks it.
escrow.accept(id);
escrow.markDelivered(id);

// 3. The buyer confirms. The seller is paid amount − sellerFee, the treasury both fees.
escrow.confirm(id);
```

If the buyer stays silent, the seller calls `claim(id)` once the release window has closed.

<SequenceDiagram name="onchain" />

## Design decisions

### The trade id belongs to the buyer

```solidity
id = keccak256(abi.encode(block.chainid, address(this), buyer, orderId));
```

The buyer chooses `orderId`, normally the hash of the order's id on the platform. Because the
trade id also contains the buyer's address, nobody else can create it first to block the order,
and the same id cannot be replayed on another chain or another deployment.

### Fees are snapshotted

The buyer fee and the seller fee are computed and stored when the trade is funded. A later
`setFees` applies to new trades only. Both rates are capped at 10 % by a constant.

### Deadlines are rights, not triggers

There is no keeper and no privileged caller. When a deadline passes, the party it protects can
act on its own: the buyer cancels, the seller claims, the buyer reclaims an unresolved dispute.
A third party cannot fire a deadline, so a seller who is a few minutes late can still deliver
to a buyer who is happy to wait.

### Payments that fail are deferred, not fatal

A stablecoin issuer can block an address. If a transfer to one recipient fails during a
settlement, the amount is credited to that recipient and the settlement continues. They
collect it later with `withdraw(to)`, to an address of their choice. Without this, one blocked
address could freeze the other party's money.

### The escrow holds exactly what it accounts for

`fund` checks the contract's balance before and after pulling the tokens and reverts if the
difference is not the full amount. A token that takes a fee on transfer is refused. The
contract tracks `totalEscrowed` and `totalOwed`, and `sweep` can only move what exceeds them.

### Pausing cannot trap money

`setFundingPaused` blocks `fund`. Every other function keeps working, so an open trade can
always be completed, refunded or disputed.

### No upgrades

The contract is not behind a proxy. Its rules cannot be changed after deployment. A new version
is a new address, and open trades finish under the rules they started with.

## Roles

| Role     | Can                                                                              | Cannot                                               |
| -------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Buyer    | `fund`, `confirm`, `cancel`, `openDispute`, `reclaimUnresolved`                  | Take the money back after delivery without a dispute |
| Seller   | `accept`, `markDelivered`, `claim`, `refund`, `openDispute`                      | Collect before the buyer's window has closed         |
| Arbiter  | `resolve` a disputed trade between its two parties                               | Touch an undisputed trade or pay a third party       |
| Owner    | Set fees for new trades, the arbiter, the treasury; pause funding; sweep surplus | Move, block or redirect any trade's funds            |
| Treasury | Receive fees                                                                     | Anything else                                        |

The treasury only receives fees. Using them to buy $DCSWAP is DacitySwap's
[fee policy](/guide/fees#where-the-fees-go), carried out outside this contract: nothing in the
contract buys a token or enforces the policy.

The owner should be a multisig behind a timelock. Ownership moves in two steps:
`transferOwnership` offers it and the new owner must call `acceptOwnership`.

## How it mirrors the engine

| Engine (`escrow-core`)             | Contract                                  |
| ---------------------------------- | ----------------------------------------- |
| `funded`                           | `Funded`                                  |
| `in_delivery`                      | `Accepted`                                |
| `delivered`                        | `Delivered`                               |
| `disputed`                         | `Disputed`                                |
| `completed` · `refunded` · `split` | `Completed` · `Refunded` · `Split`        |
| `quote()` service fee, commission  | `quote(amount)` → `buyerFee`, `sellerFee` |
| `settleSplit()`                    | `_settle()`                               |
| `bps()`                            | `_share()`                                |

The arithmetic is checked against the engine by
[shared test vectors](/developers/test-vectors).

## Testing

```sh
pnpm --filter @dacityswap/contracts test       # 52 tests
pnpm --filter @dacityswap/contracts coverage
```

| Kind      | What it covers                                                                   |
| --------- | -------------------------------------------------------------------------------- |
| Unit      | Every function, every revert, every role                                         |
| Fuzz      | Any amount, fee and split share pays out exactly what was held                   |
| Vectors   | 96 cases computed by the engine, reproduced by the contract                      |
| Invariant | Four properties checked after each of over 6,000 random calls across many trades |

Line coverage of the contract is 98 %, function coverage 100 %.

Next: the [function-by-function reference](/developers/contract-reference).
