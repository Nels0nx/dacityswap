# Contributing to DacitySwap

Thanks for taking the time. This repository is the part of DacitySwap that decides when money
moves: the escrow engine and the escrow contract. Changes to it are held to a strict standard.

## Getting set up

```bash
pnpm install
pnpm test         # the engine's tests, and the contract's if Foundry is installed
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

| Path                   | What it is                      | Bar for changes                            |
| ---------------------- | ------------------------------- | ------------------------------------------ |
| `packages/escrow-core` | State machine, fees, settlement | Tests required. No new dependencies        |
| `packages/contracts`   | `DacityEscrow.sol`              | Tests required. Guarantees must still hold |

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
  from any game or publisher.
- **No claims the code cannot back.** The project is pre-launch and the contract is unaudited.
  Documentation and comments must not suggest otherwise.
- **Example numbers are marked.** Any figure that is not computed by the code says so.

## Reporting bugs

Open an issue with the steps to reproduce, what you expected and what happened. For anything
that could put funds or user data at risk, follow [SECURITY.md](SECURITY.md) instead.

## Conduct

This project follows its [Code of Conduct](CODE_OF_CONDUCT.md).
