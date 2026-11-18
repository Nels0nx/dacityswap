---
layout: page
sidebar: false
aside: false
title: DacitySwap Docs
titleTemplate: false
description: How DacitySwap holds, releases and refunds money. The escrow engine, the fee maths and the on-chain contract, open source and documented line by line.
---

<HomePage>
<template #engine>

```ts
import { quote, createEscrow, applyEventAs, settle } from '@dacityswap/escrow-core';

// Integer cents, one rounding rule.
const priced = quote({ unitPriceMinor: 21_900, currency: 'EUR', method: 'card' });
priced.totalMinor; //        23129 → €231.29 charged
priced.sellerPayoutMinor; // 20805 → €208.05 paid out

// An order is a record. Events move it. Anything not allowed throws.
let order = createEscrow({ id: 'esc_1', quote: priced, now });
order = applyEventAs(order, { type: 'PAYMENT_CAPTURED', paymentRef }, 'system', now);
order = applyEventAs(order, { type: 'SELLER_ACCEPTED' }, 'seller', now);
order = applyEventAs(order, { type: 'SELLER_MARKED_DELIVERED' }, 'seller', now);

applyEventAs(order, { type: 'BUYER_CONFIRMED' }, 'seller', now);
// UnauthorizedActorError: A seller cannot send BUYER_CONFIRMED

order = applyEventAs(order, { type: 'BUYER_CONFIRMED' }, 'buyer', now);
settle(order); // where every cent went
```

</template>
<template #contract>

```solidity
// Buyer: lock the price and the buyer fee.
bytes32 id = escrow.fund(orderId, seller, amount);

// Seller: commit, deliver in the game, mark it.
escrow.accept(id);
escrow.markDelivered(id);

// Buyer: release the money to the seller.
escrow.confirm(id);

// When someone does not do their part, the other side
// needs no one's permission:
escrow.cancel(id); //            buyer: seller never delivered
escrow.claim(id); //             seller: buyer never confirmed
escrow.openDispute(id); //       either: they disagree
escrow.reclaimUnresolved(id); // buyer: arbiter never ruled
```

</template>
</HomePage>
