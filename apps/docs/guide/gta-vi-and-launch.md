# GTA VI and when trading starts

The question we hear most, answered properly.

<p class="status">Pre-launch · company and legal set-up in progress</p>

::: tip The short answer
GTA VI launches on 19 November 2026 as a single-player game. Trading between players happens
in an online economy, and GTA VI's online mode has not been dated. DacitySwap is not tied to
one game: it is the escrow that sits between buyer and seller, and it is built. We use the
time before that economy exists for what takes longest in a payments business: the company,
a legal opinion, a licensed payment partner and an audit of the contract. When an economy
opens where trading is lawful, connecting it is one adapter, not a new product.
:::

## Three things that are easy to mix up

| What                        | What it is                                                | When                                      |
| --------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| **GTA VI**                  | The game. Single-player at launch                         | 19 November 2026, PS5 and Xbox            |
| **GTA VI's online economy** | Where players hold, earn and could trade items and cash   | Not announced or dated by Rockstar        |
| **DacitySwap**              | The escrow and marketplace in between: works for any game | Code built; launch after the legal set-up |

A single-player game has no market between players: there is nobody to sell to inside it. So
"GTA VI is out" and "you can trade GTA VI items" are two different events, and only the first
one has a date.

## What happens, in order

<FlowDiagram name="launch" />

## What we do until then

Payments businesses are slow to start for good reasons. Everything on this list has to be in
place before the first euro moves, whichever game comes first.

| Work                      | Why it comes first                                                         | Status      |
| ------------------------- | -------------------------------------------------------------------------- | ----------- |
| The company               | Contracts, a bank and a payment partner need a legal entity                | In progress |
| Legal opinion             | Decides which markets can open, and how                                    | In progress |
| Licensed payment partner  | Holding a buyer's card money for a seller is regulated; a partner holds it | In progress |
| Contract audit            | No contract holds money before an independent review                       | Next        |
| Accounts and registration | Sellers are verified; buyers and sellers have profiles and history         | Next        |
| Public testnet            | Anyone can run a full trade on a test network before launch                | Next        |

## What "ready" means

When we say the rails are built, this is what exists today, in the open:

- **The escrow engine.** Every state an order can be in, every deadline, every fee and every
  settlement, with 49 tests. [Reference](/developers/escrow-core)
- **The escrow contract.** Holds stablecoin trades, with 52 tests and four invariants.
  [Contract](/developers/contract)
- **The marketplace app.** Showroom, checkout, orders, selling, disputes.
- **These docs**, including a [live order](/guide/try-it) you can run yourself.

Connecting a game is writing a [delivery connector](/developers/connectors): it reports that an
item arrived. The rules for holding, releasing and refunding money do not change.

## Why we do not promise a date for GTA VI

Because two things are outside our control:

1. **When the economy exists.** Rockstar has not announced or dated GTA VI's online mode.
2. **Whether trading it is allowed.** Today the publisher's terms for GTA Online forbid selling
   in-game items and currency for real money, and in 2025 Take-Two sued a marketplace that
   ignored them. A market opens on DacitySwap where trading is lawful: by the publisher's
   permission, an official marketplace or API, or terms that allow it.

What we can promise is that the day an economy opens on those terms, we are not starting from
zero.

## Questions people ask next

### Isn't it too early to build this?

The opposite. Licensing, a payment partner and an audit take months, and they are the same
whichever game opens first. Starting them after an economy exists would mean missing it.

### What if GTA VI never allows trading?

Then GTA VI is not a DacitySwap market. The escrow works the same for any game whose economy
allows trading, and every one of them is a connector. GTA is the clearest signal of demand,
not the only market.

### Is DacitySwap connected to Rockstar or Take-Two?

No. DacitySwap is independent and not affiliated with, endorsed by or sponsored by any game
publisher.

### How do I hear when trading opens?

Follow the [roadmap](/resources/roadmap) and the [changelog](/resources/changelog). Launch
announcements will be posted there first.
