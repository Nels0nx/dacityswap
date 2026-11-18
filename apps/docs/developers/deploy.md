# Deploying to a testnet

How to put `DacityEscrow` on a test network to try it end to end.

::: danger Test networks only
The contract is unaudited. Deploying it to a network where tokens have value puts that value at
risk. Nothing on this page is a path to production.
:::

## Prerequisites

- [Foundry](https://getfoundry.sh) (`forge`, `cast`)
- A funded test account, imported into Foundry's keystore:
  `cast wallet import deployer --interactive`
- The address of a test stablecoin on the network, or deploy the mock in
  `test/mocks/Tokens.sol`

## Build and test first

```sh
cd packages/contracts
pnpm run setup    # fetches forge-std at the pinned version
forge build --sizes
forge test
```

## Deploy

```sh
export TOKEN=0x…        # the test stablecoin
export ARBITER=0x…      # who rules on disputes
export TREASURY=0x…     # where fees go

forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --account deployer \
  --broadcast
```

Optional settings, with their defaults:

| Variable          | Default      | Meaning                                             |
| ----------------- | ------------ | --------------------------------------------------- |
| `BUYER_FEE_BPS`   | `250`        | Fee on top of the price, at most 1 000              |
| `SELLER_FEE_BPS`  | `500`        | Fee taken from the payout, at most 1 000            |
| `ACCEPT_WINDOW`   | `43200`      | Seconds for the seller to accept (12 hours)         |
| `DELIVERY_WINDOW` | `86400`      | Seconds to deliver after accepting (1 day)          |
| `RELEASE_WINDOW`  | `86400`      | Seconds for the buyer to confirm or dispute (1 day) |
| `DISPUTE_WINDOW`  | `1209600`    | Seconds for the arbiter to rule (14 days)           |
| `OWNER`           | the deployer | An address to offer ownership to                    |

The four windows are immutable. Choose them before you deploy.

## Try a trade

```sh
ESCROW=0x…                              # printed by the deploy script
ORDER=$(cast keccak "ord_1")
AMOUNT=100000000                        # 100 tokens at 6 decimals

# As the buyer
cast send $TOKEN "approve(address,uint256)" $ESCROW 102500000 --account buyer --rpc-url $RPC_URL
cast send $ESCROW "fund(bytes32,address,uint128)" $ORDER $SELLER $AMOUNT --account buyer --rpc-url $RPC_URL
ID=$(cast call $ESCROW "tradeId(address,bytes32)(bytes32)" $BUYER $ORDER --rpc-url $RPC_URL)

# As the seller
cast send $ESCROW "markDelivered(bytes32)" $ID --account seller --rpc-url $RPC_URL

# As the buyer
cast send $ESCROW "confirm(bytes32)" $ID --account buyer --rpc-url $RPC_URL
```

Read the trade at any point with
`cast call $ESCROW "trades(bytes32)(address,uint64,uint8,address,uint128,uint128,uint128)" $ID`.

## Before a production deployment

None of this is done yet. All of it is required.

- [ ] An independent audit, with the report published
- [ ] The owner is a multisig behind a timelock, and the arbiter is not a single key
- [ ] The deployed bytecode is verified on the block explorer and its address published here
- [ ] A bug bounty is open
- [ ] The legal basis for holding and settling crypto for users is in place
      ([Legal](/resources/legal))
