# Contract reference

Every external function, event and error of `DacityEscrow`. The ABI is in
[`packages/contracts/abi/DacityEscrow.json`](https://github.com/Nels0nx/dacityswap/blob/main/packages/contracts/abi/DacityEscrow.json).

<p class="status">Unaudited · not deployed</p>

## Constructor

```solidity
constructor(
    IERC20 token_,
    address arbiter_,
    address treasury_,
    uint16 buyerFeeBps_,
    uint16 sellerFeeBps_,
    uint64[4] memory windows_   // accept, delivery, release, dispute — in seconds
)
```

Reverts with `ZeroAddress` if the token has no code or the arbiter or treasury is zero, with
`FeeTooHigh` above 1 000 bps, and with `InvalidWindow` for a window of zero or more than 90
days. The deployer becomes the owner.

## Trade lifecycle

| Function                             | Caller          | Allowed when                                                         | Effect                                            |
| ------------------------------------ | --------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| `fund(orderId, seller, amount) → id` | Buyer           | Funding is not paused; the id is unused                              | Pulls `amount + buyerFee`. Trade is `Funded`      |
| `accept(id)`                         | Seller          | `Funded`                                                             | Trade is `Accepted`. Starts the delivery window   |
| `markDelivered(id)`                  | Seller          | `Funded` or `Accepted`                                               | Trade is `Delivered`. Starts the release window   |
| `confirm(id)`                        | Buyer           | `Funded`, `Accepted` or `Delivered`                                  | Pays the seller and the treasury. `Completed`     |
| `claim(id)`                          | Seller          | `Delivered`, release window closed                                   | Same as `confirm`                                 |
| `cancel(id)`                         | Buyer           | `Funded`; or `Accepted` after the delivery window                    | Refunds the buyer in full. `Refunded`             |
| `refund(id)`                         | Seller          | `Funded`, `Accepted` or `Delivered`                                  | Refunds the buyer in full. `Refunded`             |
| `openDispute(id)`                    | Buyer or seller | `Accepted` or `Delivered`. The buyer, only inside the release window | Trade is `Disputed`. Starts the dispute window    |
| `resolve(id, buyerShareBps)`         | Arbiter         | `Disputed`                                                           | `0` completes, `10000` refunds, otherwise `Split` |
| `reclaimUnresolved(id)`              | Buyer           | `Disputed`, dispute window closed                                    | Refunds the buyer in full. `Refunded`             |
| `withdraw(to)`                       | Anyone owed     | `owed[msg.sender] > 0`                                               | Sends the caller's deferred payments to `to`      |

## Views

| Function / getter                                                       | Returns                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `tradeId(buyer, orderId)`                                               | The id `fund` would assign                                      |
| `quote(amount)`                                                         | `(buyerFee, sellerFee)` at the current rates                    |
| `trades(id)`                                                            | `(buyer, deadline, state, seller, amount, buyerFee, sellerFee)` |
| `owed(account)`                                                         | Deferred payments waiting for that account                      |
| `totalEscrowed()`                                                       | Tokens held for open trades                                     |
| `totalOwed()`                                                           | Tokens held as deferred payments                                |
| `token()`                                                               | The settlement token                                            |
| `acceptWindow()` `deliveryWindow()` `releaseWindow()` `disputeWindow()` | The four windows, in seconds                                    |
| `buyerFeeBps()` `sellerFeeBps()`                                        | Rates for trades funded from now on                             |
| `arbiter()` `treasury()` `owner()` `pendingOwner()`                     | The current roles                                               |
| `fundingPaused()`                                                       | Whether `fund` is blocked                                       |
| `MAX_FEE_BPS()` `MAX_WINDOW()`                                          | `1000` and `90 days`                                            |

## Administration

All `onlyOwner`.

| Function                             | Effect                                                             |
| ------------------------------------ | ------------------------------------------------------------------ |
| `setFees(buyerFeeBps, sellerFeeBps)` | Rates for future trades. Each at most 1 000 bps                    |
| `setArbiter(address)`                | Replaces the arbiter, including for open disputes                  |
| `setTreasury(address)`               | Where fees are sent from now on                                    |
| `setFundingPaused(bool)`             | Blocks or unblocks `fund`. Nothing else                            |
| `sweep(token, to)`                   | Recovers stray tokens. For the settlement token, only the surplus  |
| `transferOwnership(newOwner)`        | Offers ownership. Completed by `acceptOwnership()` from `newOwner` |

## States

```solidity
enum State { None, Funded, Accepted, Delivered, Disputed, Completed, Refunded, Split }
```

## Events

| Event                                                                            | Emitted when                       |
| -------------------------------------------------------------------------------- | ---------------------------------- |
| `TradeFunded(id, buyer, seller, orderId, amount, buyerFee, sellerFee, acceptBy)` | A trade is funded                  |
| `TradeAccepted(id, deliverBy)`                                                   | The seller accepts                 |
| `TradeDelivered(id, releasableAt)`                                               | The seller marks delivery          |
| `TradeDisputed(id, by, rulingDue)`                                               | A dispute opens                    |
| `TradeCompleted(id, sellerAmount, fee)`                                          | The seller is paid in full         |
| `TradeRefunded(id, buyerAmount)`                                                 | The buyer is refunded in full      |
| `TradeSplit(id, buyerShareBps, buyerAmount, sellerAmount, fee)`                  | An arbiter splits the trade        |
| `PaymentDeferred(account, amount)`                                               | A transfer failed and was credited |
| `Withdrawn(account, to, amount)`                                                 | A deferred payment is collected    |
| `FeesUpdated` · `ArbiterUpdated` · `TreasuryUpdated` · `FundingPaused` · `Swept` | An admin setting changes           |
| `OwnershipTransferStarted` · `OwnershipTransferred`                              | Ownership is offered or accepted   |

`id`, `buyer` and `seller` are indexed, so an order's whole history can be read from logs.

## Errors

| Error                                                 | Meaning                                                  |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `Unauthorized()`                                      | The caller does not hold the role this function needs    |
| `InvalidState(State current)`                         | The trade is not in a state that allows this             |
| `DeadlineNotReached(uint64)`                          | The window is still open. The argument is when it closes |
| `WindowClosed(uint64)`                                | The buyer tried to dispute after the release window      |
| `TradeExists()`                                       | This buyer already used this `orderId`                   |
| `SelfTrade()`                                         | Buyer and seller are the same address                    |
| `ZeroAddress()` · `ZeroAmount()`                      | A required address or amount is missing                  |
| `FeeTooHigh()` · `InvalidWindow()` · `InvalidShare()` | A parameter is out of range                              |
| `FundingIsPaused()`                                   | New trades are paused                                    |
| `UnsupportedToken()`                                  | The token did not deliver the full amount                |
| `TransferFailed()`                                    | A token transfer that must succeed did not               |
| `NothingToWithdraw()`                                 | The caller is owed nothing                               |
| `Reentrancy()`                                        | A guarded function was re-entered                        |

## Token requirements

- A plain ERC-20 with a fixed balance: no fee on transfer, no rebasing.
- A `transfer` that returns nothing (as USDT's does) is accepted.
- Amounts are `uint128`, far beyond any stablecoin's supply.

## Gas

Measured by `forge test --gas-report` with the optimiser at 10 000 runs, against a mock token
and addresses that have never held it. A real stablecoin's own transfer cost will differ.

| Call                       | Gas                                    |
| -------------------------- | -------------------------------------- |
| `fund`                     | ~184 000                               |
| `accept` · `markDelivered` | ~31 000 each                           |
| `openDispute`              | ~30 000                                |
| `confirm` · `claim`        | ~95 000 to 125 000                     |
| `cancel` · `refund`        | ~54 000                                |
| `resolve`                  | ~44 000 to 154 000 (a three-way split) |
| Deployment                 | ~2 770 000                             |
