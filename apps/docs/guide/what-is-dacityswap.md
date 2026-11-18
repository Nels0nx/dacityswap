# What is DacitySwap?

DacitySwap is a marketplace for in-game items and currency, built around one idea: the buyer's
money is held in escrow until the seller has delivered, and the rules for releasing it are
public.

<p class="status">Pre-launch · company and legal set-up in progress</p>

## The problem

Trading game items for real money is a trade between strangers. One side has to go first. If
the buyer pays first, the seller can vanish. If the seller delivers first, the buyer can keep
the money. Most places that host these trades ask both sides to trust the platform instead, and
then give them no way to check what the platform does with the money.

## In one picture

<FlowDiagram name="money" />

## What DacitySwap does differently

- **The money waits in the middle.** A payment is locked when the order is placed. It is paid
  to the seller only after delivery, and returned to the buyer if delivery does not happen.
- **The rules are code, and the code is open.** The state machine that decides when money can
  move, the function that prices every fee and the contract that holds stablecoin payments are
  published under the Apache-2.0 licence. What you read is what runs.
- **Nobody can stall.** Each step has a deadline. A seller who never accepts, a buyer who never
  confirms and an arbiter who never rules all lose by default, so money is never stuck.
- **Every order can be replayed.** An order is a list of events with timestamps. Anyone holding
  it can check that its current state follows from its history.

## Where GTA VI fits

GTA VI launches on 19 November 2026 as a single-player game; its online economy, where players
could trade, has not been dated. DacitySwap is not tied to one game. Until an economy opens
where trading is lawful, we are finishing what takes longest: the company, the legal opinion,
the payment partner and the contract audit. [The full answer](/guide/gta-vi-and-launch).

## What exists today

| Part                          | Status                                                                   |
| ----------------------------- | ------------------------------------------------------------------------ |
| Escrow engine (`escrow-core`) | Complete and tested                                                      |
| Escrow contract               | Complete and tested, including invariants. Audited before it holds funds |
| Web app                       | Built: catalogue, checkout, orders, selling, disputes                    |
| Payments, accounts, payouts   | Connected at launch, with our licensed payment partner                   |
| The company and legal set-up  | In progress. Trading opens when it is complete                           |

The details are on the [status page](/security/audits) and the [roadmap](/resources/roadmap).

## Where to go next

- New to escrow? Read [How escrow works](/guide/how-escrow-works), then press the buttons in
  [run an order yourself](/guide/try-it).
- Want the numbers? See [Fees](/guide/fees).
- Reviewing the code? Start with the [state machine](/protocol/state-machine) and the
  [guarantees](/protocol/guarantees).
- Building on it? Go to the [quickstart](/developers/quickstart).

::: info Independent project
DacitySwap is not affiliated with, endorsed by or sponsored by any game publisher. Game titles
are used only to say what a listing relates to. See [Legal](/resources/legal).
:::
