# @dacityswap/contracts

`DacityEscrow`: an on-chain escrow for trades settled in a stablecoin. It implements the same
state machine as [`@dacityswap/escrow-core`](../escrow-core) and is tested against the same
vectors.

> **Status: unaudited.** It has never been deployed to a production network. Do not use it with
> real funds until it has passed an independent audit.

## What the contract guarantees

1. A trade's price can only be paid to that trade's buyer or seller. The platform receives the
   fees fixed at funding, and nothing else.
2. Fees are fixed when a trade is funded and each is capped at 10 %.
3. The arbiter can only act on a trade one of its parties has disputed, and can only divide the
   money between those two.
4. Nothing can be held for ever: every waiting state has a deadline, after which the party kept
   waiting takes the money without anyone's permission.
5. The owner cannot stop a settlement or take escrowed funds.
6. A recipient who cannot be paid does not block the other side.

Each has tests named for it. The reasoning is in the
[documentation](https://docs.dacityswap.com/protocol/guarantees).

## Layout

```
src/DacityEscrow.sol              the contract
test/DacityEscrow.t.sol           unit, fuzz and vector tests
test/DacityEscrow.invariant.t.sol four invariants over random multi-trade sequences
test/mocks/Tokens.sol             a plain token, a blocklist token, a fee-on-transfer token, a USDT-style token
script/Deploy.s.sol               deployment, for test networks
abi/DacityEscrow.json             the ABI, checked in and verified by CI
```

## Develop

Requires [Foundry](https://getfoundry.sh).

```bash
pnpm --filter @dacityswap/contracts test       # 52 tests
pnpm --filter @dacityswap/contracts coverage   # 98 % lines, 100 % functions
pnpm --filter @dacityswap/contracts build      # with contract sizes
pnpm --filter @dacityswap/contracts format     # forge fmt
pnpm --filter @dacityswap/contracts abi        # refresh abi/DacityEscrow.json
```

The scripts fetch forge-std at a pinned version on first use. Without Foundry they print a note
and exit cleanly; `pnpm --filter @dacityswap/contracts compile` is a compile-only check that
needs nothing but Node.

Working with `forge` directly:

```bash
cd packages/contracts
pnpm run setup
forge test -vvv
```

## Deploy to a test network

See [Deploying to a testnet](https://docs.dacityswap.com/developers/deploy).

## Licence

Apache-2.0
