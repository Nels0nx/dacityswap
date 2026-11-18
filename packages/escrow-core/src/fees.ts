/**
 * Fee engine.
 *
 * This file is the public, auditable definition of what DacitySwap charges.
 * The same function produces the quote shown in the UI, the amount captured by
 * the payment provider and the payout owed to the seller.
 */
import { assertMinorUnits, bps, type Currency } from './money';

export const PAYMENT_METHODS = ['card', 'crypto'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface ProcessingFee {
  /** Variable part, in basis points of (subtotal + service fee). */
  readonly bps: number;
  /** Fixed part, in minor units. */
  readonly fixedMinor: number;
}

export interface FeeSchedule {
  /** Charged to the buyer on top of the listing price. */
  readonly buyerServiceBps: number;
  /** Deducted from the seller's payout. */
  readonly sellerCommissionBps: number;
  /** Pass-through cost of the payment rail. Not platform revenue. */
  readonly processing: Readonly<Record<PaymentMethod, ProcessingFee>>;
}

export const DEFAULT_FEE_SCHEDULE: FeeSchedule = Object.freeze({
  buyerServiceBps: 250,
  sellerCommissionBps: 500,
  processing: Object.freeze({
    card: Object.freeze({ bps: 290, fixedMinor: 30 }),
    crypto: Object.freeze({ bps: 100, fixedMinor: 0 }),
  }),
});

export interface QuoteInput {
  readonly unitPriceMinor: number;
  readonly quantity?: number;
  readonly currency: Currency;
  readonly method: PaymentMethod;
}

export interface Quote {
  readonly currency: Currency;
  readonly method: PaymentMethod;
  readonly quantity: number;
  /** unit price × quantity */
  readonly subtotalMinor: number;
  readonly buyerServiceFeeMinor: number;
  readonly processingFeeMinor: number;
  /** What the buyer is charged: subtotal + service fee + processing fee. */
  readonly totalMinor: number;
  readonly sellerCommissionMinor: number;
  /** What the seller receives when escrow releases: subtotal − commission. */
  readonly sellerPayoutMinor: number;
  /** Service fee + commission. Processing fees are pass-through. */
  readonly platformRevenueMinor: number;
}

export function quote(input: QuoteInput, schedule: FeeSchedule = DEFAULT_FEE_SCHEDULE): Quote {
  const quantity = input.quantity ?? 1;
  assertMinorUnits(input.unitPriceMinor, 'unitPriceMinor');
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError(`quantity must be a positive integer, got ${quantity}`);
  }

  const subtotalMinor = input.unitPriceMinor * quantity;
  assertMinorUnits(subtotalMinor, 'subtotal');

  const buyerServiceFeeMinor = bps(subtotalMinor, schedule.buyerServiceBps);
  const rail = schedule.processing[input.method];
  const processingFeeMinor = bps(subtotalMinor + buyerServiceFeeMinor, rail.bps) + rail.fixedMinor;
  const sellerCommissionMinor = bps(subtotalMinor, schedule.sellerCommissionBps);

  return {
    currency: input.currency,
    method: input.method,
    quantity,
    subtotalMinor,
    buyerServiceFeeMinor,
    processingFeeMinor,
    totalMinor: subtotalMinor + buyerServiceFeeMinor + processingFeeMinor,
    sellerCommissionMinor,
    sellerPayoutMinor: subtotalMinor - sellerCommissionMinor,
    platformRevenueMinor: buyerServiceFeeMinor + sellerCommissionMinor,
  };
}
