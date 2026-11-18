# How escrow works

An escrow is a neutral place where money waits while two people who do not know each other
finish a trade. This page follows one order from payment to payout.

<StateDiagram />

## The healthy path

1. **The buyer pays.** The payment is captured and locked. The order is `funded`. The seller
   has not been paid anything.
2. **The seller accepts.** This is a commitment to deliver, and it starts the delivery clock.
   The order is `in_delivery`.
3. **The seller delivers** the item in the game and marks the order delivered. The order is
   `delivered` and the buyer's confirmation window opens.
4. **The buyer confirms.** The money is released: the seller is paid the price less commission.
   The order is `completed`.

If the buyer says nothing during the confirmation window, the money is released automatically
when it closes. A buyer who received the item cannot hold the seller's money by going quiet.

The same trade, message by message:

<SequenceDiagram name="trade" />

## When something goes wrong

| What happens                                   | What the escrow does                                        |
| ---------------------------------------------- | ----------------------------------------------------------- |
| The payment fails or is never made             | The order is cancelled. Nothing was charged                 |
| The buyer changes their mind before acceptance | The order is cancelled and the payment returned             |
| The seller never accepts                       | The payment is returned when the acceptance deadline passes |
| The seller accepts but never delivers          | The payment is returned when the delivery deadline passes   |
| The seller cannot deliver and says so          | The seller cancels and the payment is returned at once      |
| The buyer did not get what was sold            | The buyer opens a dispute. The money freezes for an arbiter |
| The arbiter never rules                        | The payment is returned when the ruling deadline passes     |

Every one of these ends with the money somewhere definite. There is no state in which it can
wait indefinitely. The exact windows are on the [Deadlines](/guide/deadlines) page.

## Where the money is

At any moment the engine can answer the question in one word:

| State                                            | The money is                   |
| ------------------------------------------------ | ------------------------------ |
| `awaiting_payment`, `cancelled`                  | with the buyer (never charged) |
| `funded`, `in_delivery`, `delivered`, `disputed` | in escrow                      |
| `completed`                                      | with the seller                |
| `refunded`                                       | back with the buyer            |
| `split`                                          | divided between the two        |

## Who can do what

The engine checks the role behind every action. A buyer cannot mark an order delivered, a
seller cannot confirm one, and only the arbiter can rule on a dispute.

| Role    | Can                                                                    |
| ------- | ---------------------------------------------------------------------- |
| Buyer   | Cancel before acceptance, confirm delivery, open a dispute             |
| Seller  | Accept, mark delivered, cancel and refund at any point, open a dispute |
| Arbiter | Rule on a disputed order: release, refund or split. Nothing else       |
| System  | Record the result of a payment and fire a deadline that has passed     |

Notice what is missing: there is no action that lets the platform take the money for itself,
and none that lets it move an order nobody has disputed.

## Try it

[Run an order yourself](/guide/try-it): the real engine, in your browser. Play both sides, let a
deadline pass and watch where the money ends up.
