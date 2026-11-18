# Buying

What happens to your money from the moment you pay, and what you can do at each step.

<p class="status">How trading works at launch</p>

## Before you pay

The checkout shows one total and how it is made up: the price, a service fee and the payment
processing fee. That breakdown is computed by the [open fee engine](/guide/fees), not typed
into a page, so it cannot differ from what you are charged.

You have 30 minutes to complete the payment. After that the order lapses and nothing is taken.

## After you pay

Your money is in escrow. The seller has not received it.

| The order says    | What it means for you                                                          |
| ----------------- | ------------------------------------------------------------------------------ |
| Funds in escrow   | Waiting for the seller to accept. You can still cancel and get everything back |
| Seller delivering | The seller has committed. If they miss the delivery deadline, you are refunded |
| Delivered         | The seller says it is done. You have 24 hours to confirm or to dispute         |
| Complete          | You confirmed, or the 24 hours passed. The seller has been paid                |

## Confirming

Check in the game that you received what you bought, then confirm. Confirming releases the
money at once, and it cannot be undone.

If you do nothing for 24 hours after the order is marked delivered, the money is released
automatically. Silence counts as confirmation, so check promptly.

## If you did not get it

Open a dispute before the 24 hours run out. This freezes the money immediately: the seller
cannot be paid and you cannot be refunded until an arbiter has looked at the evidence.

The arbiter can release the money to the seller, refund you in full, or divide it. If no ruling
is made within 14 days, you are refunded in full by default. More on the
[Disputes](/guide/disputes) page.

## What a refund returns

A full refund returns everything you paid: the price, the service fee and the processing fee.
See [Settlement](/protocol/settlement) for the exact arithmetic.

## Paying with a stablecoin

When you pay on-chain, your tokens go into the [escrow contract](/developers/contract), not to
DacitySwap and not to the seller. The contract's rules are the same as above, and they are
enforced by the chain: no one, the contract's owner included, can redirect your payment.
