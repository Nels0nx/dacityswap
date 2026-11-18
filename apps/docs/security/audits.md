# Audits and status

The honest state of every part, kept up to date. If a page elsewhere on this site sounds more
finished than this one, this one is right.

_Last reviewed: 18 November 2026._

## Summary

| Part                               | Built     | Tested                          | Audited | Live                     |
| ---------------------------------- | --------- | ------------------------------- | ------- | ------------------------ |
| Escrow engine (`escrow-core` 0.2)  | Yes       | 49 unit and property tests      | No      | No                       |
| Escrow contract (`DacityEscrow`)   | Yes       | 52 tests incl. 4 invariants     | **No**  | **No**                   |
| Web app                            | Yes       | Lint, types, manual walkthrough | No      | At launch                |
| Card payments                      | Interface | —                               | —       | With our payment partner |
| Accounts, identity checks, payouts | Next      | —                               | —       | At launch                |
| Dispute tooling                    | Next      | —                               | —       | At launch                |

**Trading opens at launch.** The code that runs a trade is finished. Before the first trade,
three things have to be in place: the company, a licensed payment partner and a legal opinion
on the operating model. That work is in progress.

## The contract

- **Audit:** none. No independent party has reviewed it.
- **Deployments:** none on any production network. There is no official address.
- **Testing:** unit tests for every function and revert, a fuzz test for conservation of funds,
  96 vectors shared with the engine and four invariants checked over random multi-trade
  sequences. Line coverage 98 %, function coverage 100 %.
- **Static analysis:** not yet run in CI.

Tests show that the code does what its authors intended. They do not show that the intention is
free of mistakes. That is what an audit is for.

## The engine

`escrow-core` is 700 lines of dependency-free TypeScript. It is not yet published to npm, and
its API may change before 1.0.

## Before real funds

In order:

1. A legal opinion on the operating model. This comes first because it can change the design.
2. An independent audit of the contract, with the report published here.
3. Static analysis and the invariant suite running on every change.
4. A testnet deployment that anyone can try.
5. A bug bounty.
6. A production deployment owned by a multisig behind a timelock, verified on the block
   explorer, with the address published on this page.

## How to check a claim yourself

```sh
git clone https://github.com/Nels0nx/dacityswap.git && cd dacityswap
pnpm install
pnpm test                                        # engine, and the contract if Foundry is installed
pnpm --filter @dacityswap/contracts coverage     # needs Foundry
```

Every number on this page comes from those commands.
