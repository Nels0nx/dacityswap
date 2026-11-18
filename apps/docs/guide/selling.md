# Selling

What you commit to when you accept an order, when you are paid, and what it costs.

<p class="status">How trading works at launch</p>

## What you are paid

Your payout is the listing price less a 5 % commission. The buyer pays the service fee and the
payment processing fee on top of your price, so neither comes out of your payout.

| Listing price | Commission (5 %) | You receive |
| ------------- | ---------------- | ----------- |
| €10.00        | €0.50            | €9.50       |
| €82.00        | €4.10            | €77.90      |
| €219.00       | €10.95           | €208.05     |

The sell form shows this number before you publish, computed by the same
[fee engine](/guide/fees) that will pay you.

## The steps

1. **A buyer pays.** The money is locked in escrow and you are notified. You have 12 hours to
   accept. If you do not, the buyer is refunded and the order closes.
2. **You accept.** You now have 24 hours to deliver. Accept only what you can deliver in time.
3. **You deliver** in the game and mark the order delivered. Add proof where you can: a
   screenshot or a short clip is what an arbiter will ask for if the buyer disputes.
4. **The buyer confirms**, or 24 hours pass. Either way the money is released to you.

## If you cannot deliver

Cancel the order. The buyer is refunded in full straight away. You can do this at any point
before the trade completes, even after marking it delivered by mistake.

Cancelling is always better than missing the deadline: the outcome for the buyer is the same,
and it is faster.

## If the buyer disputes

The money freezes and an arbiter reviews the order. You will be asked for proof of delivery.
The arbiter can release the money to you, refund the buyer or divide it. On the part you keep,
commission is charged as usual; on the part returned to the buyer, it is waived.

You can open a dispute yourself, for example when a buyer will not come online to receive a
delivery you have accepted.

## Being paid on-chain

For stablecoin orders the [escrow contract](/developers/contract) pays your wallet directly
when the buyer confirms. If the buyer stays silent, you collect the payment yourself with
`claim` once the confirmation window has closed. No one has to approve it.
