# FAQ

## About DacitySwap

### What is DacitySwap for?

Trading in-game items and game currency for real money and crypto, safely. The buyer pays, the
payment waits in escrow, the seller delivers in the game, and only then is the seller paid. If
the delivery does not happen, the buyer gets the money back.

### Is it real?

Yes. DacitySwap is real, working code. The escrow engine, the fee and settlement maths and the
on-chain contract are written, tested and open source: 49 tests for the engine, 52 for the
contract, and one file of numbers that both must reproduce. Clone the repository and run all
of it today.

### When can I make my first trade?

When the company and the legal set-up are complete, which is what we are working on now: the
company itself, a licensed partner for card payments and a legal opinion on the operating
model. The code that runs a trade does not wait on any of it. Follow the
[roadmap](/resources/roadmap) and the [status page](/security/audits).

### What can I run today?

- The engine: price a trade, walk an order through escrow, settle it, verify its history.
- The contract: every path, on a local chain or a test network.
- [Run an order yourself](/guide/try-it) and the [fee calculator](/guide/fees) on this site,
  which call the same engine.
- The web app, with the whole buying and selling flow: listing, checkout, escrow, delivery,
  release and disputes.

Start with the [quickstart](/developers/quickstart).

### Why open source the escrow?

Because you are asked to send money to someone you have no reason to trust yet. Publishing the
code that decides what happens to that money lets you check the claim instead of believing it.

## Games and connectors

### GTA VI is out. Can I trade GTA VI items now?

Not yet, and not because of us. GTA VI launches on 19 November 2026 as a single-player game,
and trading between players happens in an online economy that Rockstar has not dated. When
that economy exists and its terms allow trading, it is a connector away. The full answer is on
[GTA VI and launch timing](/guide/gta-vi-and-launch).

### What does DacitySwap do until then?

The slow part: the company, a legal opinion, a licensed payment partner, an audit of the
contract, accounts and a public testnet. All of it is needed whichever game opens first, and
none of it can be rushed once an economy exists.

### Which games will DacitySwap support?

The escrow does not depend on any one game. A trade is an order, a payment and a delivery, and
the engine handles those the same way whatever is being sold: items, vehicles, game currency.

Each game market opens where trading it is lawful: a publisher that allows it, an official
marketplace or API, or terms that permit it. Our legal work decides the order.

### What is a connector?

The piece that links DacitySwap to something outside it: a game, a payment method, a chain.
Each of them sits behind an interface, so adding one is writing an adapter. Nothing in the
escrow changes.

| Connects to       | Interface                   | Status                                             |
| ----------------- | --------------------------- | -------------------------------------------------- |
| Card payments     | `PaymentProvider`           | Interface built; connects with our payment partner |
| Crypto payments   | `PaymentProvider`           | Interface built; settles through the contract      |
| Stablecoins       | The `DacityEscrow` contract | Written and tested; audited before deployment      |
| The market's data | `MarketRepository`          | Interface built; connects to the database          |
| A game            | A delivery connector        | Designed; built per game as markets open           |

More on the [connectors page](/developers/connectors).

### How fast can a new game be connected?

As fast as its connector can be written and reviewed, because the hard part is done: the rules
for holding, releasing and refunding money are finished and do not change from game to game.
When a game opens a lawful way in, its connector is the first thing the team builds.

Where a game does not expose delivery data, delivery is confirmed the way the escrow already
handles it: the seller marks it, the buyer confirms it, and a deadline and an arbiter cover the
cases where they disagree.

### Is DacitySwap affiliated with a game publisher?

No. It is an independent company, not affiliated with, endorsed by or sponsored by any game
publisher. Game titles are used only to describe what a listing relates to.

## Money

### Where is my money while I wait?

In escrow: held by our licensed payment partner for card orders, or by the
[escrow contract](/developers/contract) for stablecoin orders. It is not with the seller, and
for stablecoin orders it is not with DacitySwap either.

### What does it cost?

The buyer pays a 2.5 % service fee plus the payment processing fee. The seller pays a 5 %
commission. Try your own numbers in the [fee calculator](/guide/fees).

### What does DacitySwap do with the fees?

It does not keep them as company revenue. Once the marketplace is live, the service fee and the
commission are used to buy $DCSWAP on the open market. That is a company policy, not something
the contract enforces: the contract only pays the fees to its treasury address. See
[Where the fees go](/guide/fees#where-the-fees-go). Not financial advice.

### If I am refunded, do I get the fees back?

Yes. A full refund returns the price, the service fee and the processing fee.

### Can DacitySwap change the fee on an order I already placed?

No. An order carries the quote it was created with. On-chain, the fee is stored in the trade
when it is funded and later changes do not touch it.

### Can DacitySwap take the money in the escrow contract?

No. The contract has no function that pays a trade's price to anyone but its buyer or seller.
The owner's `sweep` function can move only tokens that are not held for a trade or owed to
anyone, and a test checks it.

## Trades

### What if the seller never delivers?

You are refunded. If the seller does not accept within 12 hours, or accepts and does not
deliver within 24, the payment comes back to you.

### What if the buyer never confirms?

The seller is paid. The money is released automatically 24 hours after the order is marked
delivered, unless the buyer opens a dispute in that time.

### What if we disagree?

Either side opens a dispute. The money freezes and an arbiter decides: release, refund or a
split. If there is no ruling in 14 days, the buyer is refunded.

### Can I cancel?

A buyer can cancel freely until the seller accepts. A seller can cancel, and refund the buyer,
at any point before the trade completes.

### Why can I not open a dispute before the seller accepts?

There is nothing to dispute yet. Until the seller accepts, the buyer can cancel and take the
money back without asking anyone.

### How do you know an item was delivered?

The seller marks it and the buyer confirms it, with a window to object and an arbiter for
disagreements. Sellers should keep proof of delivery. For games whose connector can read the
delivery, that step is automatic.

## Technical

### Can I use the escrow engine in my own project?

Yes. It is Apache-2.0 licensed. The name "DacitySwap" and the logo are not part of that
licence, so please do not present your project as DacitySwap.

### Is `@dacityswap/escrow-core` on npm?

Not yet. Use it from the repository for now. See the [quickstart](/developers/quickstart).

### Which chain will the contract run on?

That is decided with the audit. The order is a public testnet deployment, then an independent
audit, then production. Until we publish an address on the [status page](/security/audits),
any address claiming to be the DacitySwap escrow is not ours.

### Why is the contract not upgradeable?

Because an upgradeable escrow asks you to trust whoever holds the upgrade key not to change the
rules under your trade. A fixed contract can be read once and relied on.

### Does a deadline fire by itself?

Off-chain, yes: a scheduler applies it. On-chain, nothing runs by itself, so the party a
deadline protects makes the call: `cancel`, `claim` or `reclaimUnresolved`.

### I found a problem in the code or the docs. What do I do?

For anything that could put money at risk, [report it privately](/security/disclosure). For
anything else, open an issue or a pull request.
