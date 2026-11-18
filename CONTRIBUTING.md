# Contributing to DacitySwap

Thanks for taking the time. This repository contains code that decides when money moves, so
changes to that code are held to a stricter standard than the rest.

## Getting set up

```bash
pnpm install
pnpm dev          # the demo app      → http://localhost:3000
pnpm docs:dev     # the documentation → http://localhost:3001
```

You need Node.js 22+ and pnpm 10+. To run the contract's tests you also need
[Foundry](https://getfoundry.sh); without it they are skipped with a note.

Before you open a pull request, run what CI runs:

```bash
pnpm format:check
pnpm check        # lint, typecheck and test every package
pnpm build
```

## Where things live

| Path                   | What it is                      | Bar for changes                               |
| ---------------------- | ------------------------------- | --------------------------------------------- |
| `packages/escrow-core` | State machine, fees, settlement | Tests required. No new dependencies           |
| `packages/contracts`   | `DacityEscrow.sol`              | Tests required. Guarantees must still hold    |
| `apps/web`             | The demo app                    | Lint and types pass; demo data stays labelled |
| `apps/docs`            | docs.dacityswap.com             | Says only what the code does                  |

## Changing the escrow engine or the contract

- **A test that fails without your change.** A new transition, guard or fee rule needs one.
- **Keep the two in step.** If you change fee or settlement arithmetic, change it in both
  `escrow-core` and the contract, regenerate the shared vectors and commit them:

  ```bash
  UPDATE_VECTORS=1 pnpm --filter @dacityswap/escrow-core test
  pnpm --filter @dacityswap/contracts test
  ```

- **Keep the guarantees.** The list at the top of `DacityEscrow.sol` and on the
  [guarantees page](https://docs.dacityswap.com/protocol/guarantees) is a promise. A change
  that weakens one needs a very good reason and its own discussion first.
- **Update the docs in the same pull request.** A difference between the documentation and the
  code is treated as a bug.
- **Money is an integer.** Amounts are minor units. Never use floating-point arithmetic on a
  balance; use the helpers in `packages/escrow-core/src/money.ts`.
- **`escrow-core` stays dependency-free**, so that it stays easy to audit.

After changing the contract, also run:

```bash
pnpm --filter @dacityswap/contracts format     # forge fmt
pnpm --filter @dacityswap/contracts abi        # refresh abi/DacityEscrow.json
pnpm --filter @dacityswap/contracts coverage
```

## What makes a pull request easy to merge

- **One change per pull request.** A bug fix and a refactor are two pull requests.
- **Describe the why.** Say what problem you hit, not only what you changed.
- **Small.** A reviewer should be able to hold the whole change in their head.

## Rules specific to this project

- **No third-party game assets.** Do not add logos, artwork, screenshots, fonts, audio or models
  from any game or publisher. Everything visual must be original or licensed for this use, and
  every third-party asset must be listed in `CREDITS.md`.
- **No claims the code cannot back.** The project is pre-launch and the contract is unaudited.
  Documentation and interface text must not suggest otherwise.
- **Demo data stays labelled.** Anything fabricated must be visibly marked as sample data.

## Reporting bugs

Open an issue with the steps to reproduce, what you expected and what happened. For anything
that could put funds or user data at risk, follow [SECURITY.md](SECURITY.md) instead.

## Conduct

This project follows its [Code of Conduct](CODE_OF_CONDUCT.md).
