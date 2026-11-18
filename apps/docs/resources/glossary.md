# Glossary

**$DCSWAP**
The DacitySwap token. Once the marketplace is live, its fees are used to buy $DCSWAP on the open
market, as a company policy. See [Where the fees go](/guide/fees#where-the-fees-go). Not
financial advice.

**Arbiter**
The party that rules on a disputed trade. It can release the money to the seller, refund the
buyer or split it, and can do nothing else.

**Audit trail**
The append-only list of events in an order's `history`. See
[Audit trail](/protocol/audit-trail).

**Auto-release**
Paying the seller when the buyer's confirmation window closes without a confirmation or a
dispute.

**Basis point (bps)**
One hundredth of a percent. 250 bps is 2.5 %.

**Commission**
The fee deducted from the seller's payout: 5 % by default.

**Confirmation window**
The time the buyer has to confirm or dispute after delivery is marked: 24 hours by default. On
the contract it is called the release window.

**Deadline**
The moment the current state times out. Every state that holds money has one.

**Deferred payment**
On-chain, a payment that could not be delivered and was credited to the recipient for a later
`withdraw`.

**Dispute**
A request by the buyer or the seller for the arbiter to decide the trade. It freezes the
money.

**Escrow**
Holding a payment with a neutral party until a condition is met.

**Event**
Something that happened to an order, such as `SELLER_ACCEPTED`. Applying an event is the only
way an order changes state.

**Guard**
A rule checked in addition to the transition table: a deadline, or who is cancelling.

**Invariant**
A property that must hold after every possible sequence of actions, for example "the contract
holds exactly what it owes".

**Minor unit**
The smallest unit of a currency: a cent. All amounts are whole numbers of minor units.

**Order id / trade id**
The order id is assigned by the platform. The trade id is what the contract derives from the
chain, its own address, the buyer and the order id.

**Processing fee**
The payment rail's own fee. It is passed through: DacitySwap does not receive it.

**Quote**
The priced breakdown of a trade: subtotal, fees, total and payout.

**Rail**
The system that actually moves the money: a card network or a blockchain.

**Record**
An order's escrow data: its state, quote, deadline and history. A plain JSON object.

**Service fee**
The fee the buyer pays on top of the price: 2.5 % by default.

**Settlement**
The final division of a trade's money between buyer, seller, platform and rail.

**Split**
An arbiter's ruling that divides the price between buyer and seller, and the final state it
leads to.

**State machine**
The set of states an order can be in and the events that move it between them. See
[State machine](/protocol/state-machine).

**Treasury**
The address that receives the contract's fees. The contract only pays fees to it; using them to
buy $DCSWAP is company policy, outside the contract.
