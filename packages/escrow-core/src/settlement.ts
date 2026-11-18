/**
 * Settlement: who ends up with what when a trade is over.
 *
 * `quote` says what the buyer is charged. `settle` says where every one of those cents went
 * once the escrow reached a final state. The two always agree: nothing is created or lost.
 */
import type { EscrowRecord } from './escrow';
import type { Quote } from './fees';
import { bps, type Currency } from './money';

export interface SettlementPolicy {
  /**
   * Whether a refund also returns the payment rail's fee to the buyer.
   *
   * `true` (the default) makes the buyer whole and leaves the platform to carry the rail's
   * fee. `false` returns everything except that fee.
   */
  readonly refundProcessingFee: boolean;
}

export const DEFAULT_SETTLEMENT_POLICY: SettlementPolicy = Object.freeze({
  refundProcessingFee: true,
});

export interface Settlement {
  readonly currency: Currency;
  /** Returned to the buyer. */
  readonly buyerRefundMinor: number;
  /** Paid to the seller. */
  readonly sellerPayoutMinor: number;
  /** Kept by the platform: its service fee and commission on the part that was sold. */
  readonly platformRevenueMinor: number;
  /** Kept by the payment rail. */
  readonly processingFeeMinor: number;
  /** Rail fees the platform paid back to the buyer out of its own pocket. */
  readonly platformCostMinor: number;
}

/** What each side receives when the price is shared: the buyer gets `buyerShareBps` of it back. */
export function settleSplit(
  quote: Quote,
  buyerShareBps: number,
  policy: SettlementPolicy = DEFAULT_SETTLEMENT_POLICY,
): Settlement {
  if (!Number.isInteger(buyerShareBps) || buyerShareBps < 0 || buyerShareBps > 10_000) {
    throw new RangeError(`buyerShareBps must be an integer in [0, 10000], got ${buyerShareBps}`);
  }

  // Each amount is shared at the same rate, with the platform's one rounding rule. The seller
  // and the platform take what is left, so the parts always add up to the whole.
  const priceBack = bps(quote.subtotalMinor, buyerShareBps);
  const serviceFeeBack = bps(quote.buyerServiceFeeMinor, buyerShareBps);
  const commissionWaived = bps(quote.sellerCommissionMinor, buyerShareBps);
  const railFeeBack = policy.refundProcessingFee ? bps(quote.processingFeeMinor, buyerShareBps) : 0;

  const commission = quote.sellerCommissionMinor - commissionWaived;
  return {
    currency: quote.currency,
    buyerRefundMinor: priceBack + serviceFeeBack + railFeeBack,
    sellerPayoutMinor: quote.subtotalMinor - priceBack - commission,
    platformRevenueMinor: quote.buyerServiceFeeMinor - serviceFeeBack + commission,
    processingFeeMinor: quote.processingFeeMinor,
    platformCostMinor: railFeeBack,
  };
}

/**
 * Where the money went, for an escrow in a final state. Returns null while the trade is still
 * open, because until then the answer is simply "in escrow".
 *
 * For every settlement:
 *   buyerRefund + sellerPayout + platformRevenue + processingFee = quote.total + platformCost
 */
export function settle(
  record: Pick<EscrowRecord, 'state' | 'quote' | 'history'>,
  policy: SettlementPolicy = DEFAULT_SETTLEMENT_POLICY,
): Settlement | null {
  const { quote } = record;
  switch (record.state) {
    case 'completed':
      return settleSplit(quote, 0, policy);
    case 'refunded':
      return settleSplit(quote, 10_000, policy);
    case 'split': {
      const ruling = [...record.history]
        .reverse()
        .find((step) => step.event.type === 'DISPUTE_RESOLVED')?.event;
      if (ruling?.type !== 'DISPUTE_RESOLVED' || ruling.outcome !== 'split') {
        throw new Error('A split escrow must carry the ruling that split it');
      }
      return settleSplit(quote, ruling.buyerShareBps, policy);
    }
    case 'cancelled':
      // Cancelled before any payment was captured: nothing moved.
      return {
        currency: quote.currency,
        buyerRefundMinor: 0,
        sellerPayoutMinor: 0,
        platformRevenueMinor: 0,
        processingFeeMinor: 0,
        platformCostMinor: 0,
      };
    default:
      return null;
  }
}
