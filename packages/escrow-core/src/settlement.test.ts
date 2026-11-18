import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyEvent, createEscrow, type EscrowEvent, type EscrowRecord } from './escrow';
import { PAYMENT_METHODS, quote, type FeeSchedule } from './fees';
import { settle, settleSplit, type Settlement } from './settlement';

const t0 = new Date('2026-11-17T12:00:00.000Z');
const minutes = (n: number) => new Date(t0.getTime() + n * 60_000);

/** Small deterministic PRNG so the sweeps are reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function run(events: EscrowEvent[], method: 'card' | 'crypto' = 'card'): EscrowRecord {
  let escrow = createEscrow({
    id: 'esc_settle',
    quote: quote({ unitPriceMinor: 21_900, currency: 'EUR', method }),
    now: t0,
  });
  events.forEach((event, index) => {
    escrow = applyEvent(escrow, event, minutes(index + 1));
  });
  return escrow;
}

const PAID: EscrowEvent[] = [
  { type: 'PAYMENT_CAPTURED', paymentRef: 'pay_1' },
  { type: 'SELLER_ACCEPTED' },
  { type: 'SELLER_MARKED_DELIVERED' },
];
const DISPUTED: EscrowEvent[] = [...PAID, { type: 'DISPUTE_OPENED', by: 'buyer', reason: 'x' }];

const total = (s: Settlement) =>
  s.buyerRefundMinor + s.sellerPayoutMinor + s.platformRevenueMinor + s.processingFeeMinor;

describe('settle', () => {
  it('has no answer while the trade is open', () => {
    expect(settle(run(PAID))).toBeNull();
    expect(settle(run(DISPUTED))).toBeNull();
  });

  it('pays the seller and the platform when the trade completes', () => {
    const done = run([...PAID, { type: 'BUYER_CONFIRMED' }]);
    expect(settle(done)).toEqual({
      currency: 'EUR',
      buyerRefundMinor: 0,
      sellerPayoutMinor: 20_805, // 219.00 − 5 %
      platformRevenueMinor: 1_643, // 5.48 service fee + 10.95 commission
      processingFeeMinor: 681,
      platformCostMinor: 0,
    });
    expect(total(settle(done)!)).toBe(done.quote.totalMinor);
  });

  it('makes the buyer whole on a refund, at the platform’s cost', () => {
    const refunded = run([...DISPUTED, { type: 'DISPUTE_RESOLVED', outcome: 'refund' }]);
    expect(settle(refunded)).toEqual({
      currency: 'EUR',
      buyerRefundMinor: 23_129,
      sellerPayoutMinor: 0,
      platformRevenueMinor: 0,
      processingFeeMinor: 681,
      platformCostMinor: 681,
    });
  });

  it('can keep the rail’s fee out of a refund', () => {
    const refunded = run([...DISPUTED, { type: 'DISPUTE_RESOLVED', outcome: 'refund' }]);
    const settlement = settle(refunded, { refundProcessingFee: false })!;
    expect(settlement.buyerRefundMinor).toBe(23_129 - 681);
    expect(settlement.platformCostMinor).toBe(0);
    expect(total(settlement)).toBe(refunded.quote.totalMinor);
  });

  it('shares every amount at the ruling’s rate', () => {
    const split = run([
      ...DISPUTED,
      { type: 'DISPUTE_RESOLVED', outcome: 'split', buyerShareBps: 4_000 },
    ]);
    expect(settle(split)).toEqual({
      currency: 'EUR',
      buyerRefundMinor: 8_760 + 219 + 272, // 40 % of the price, the service fee and the rail fee
      sellerPayoutMinor: 21_900 - 8_760 - 657, // 60 % of the price, less commission on that part
      platformRevenueMinor: 329 + 657,
      processingFeeMinor: 681,
      platformCostMinor: 272,
    });
  });

  it('moves nothing for an order cancelled before payment', () => {
    const cancelled = run([{ type: 'CANCELLED', by: 'buyer' }]);
    expect(total(settle(cancelled)!)).toBe(0);
  });

  it('never creates or loses a cent, and never pays anyone a negative amount', () => {
    const random = mulberry32(20_261_117);
    for (let i = 0; i < 4_000; i++) {
      const schedule: FeeSchedule = {
        buyerServiceBps: Math.floor(random() * 1_001),
        sellerCommissionBps: Math.floor(random() * 2_001),
        processing: {
          card: { bps: Math.floor(random() * 501), fixedMinor: Math.floor(random() * 60) },
          crypto: { bps: Math.floor(random() * 201), fixedMinor: 0 },
        },
      };
      const priced = quote(
        {
          unitPriceMinor: 1 + Math.floor(random() ** 3 * 5_000_000),
          quantity: 1 + Math.floor(random() * 4),
          currency: 'EUR',
          method: PAYMENT_METHODS[Math.floor(random() * 2)]!,
        },
        schedule,
      );
      const share = Math.floor(random() * 10_001);
      for (const refundProcessingFee of [true, false]) {
        const settlement = settleSplit(priced, share, { refundProcessingFee });
        expect(total(settlement)).toBe(priced.totalMinor + settlement.platformCostMinor);
        for (const amount of Object.values(settlement)) {
          if (typeof amount === 'number') expect(amount).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

/**
 * Shared test vectors. The same file is read by the contract's tests, which is what makes
 * "the contract mirrors the engine" a tested statement and not a comment.
 * Regenerate with `UPDATE_VECTORS=1 pnpm --filter @dacityswap/escrow-core test`.
 */
describe('vectors/settlement.json', () => {
  const file = fileURLToPath(new URL('../vectors/settlement.json', import.meta.url));

  function generate() {
    const random = mulberry32(8_453);
    const amounts = [1, 2, 3, 7, 99, 100, 101, 199, 2_500, 21_900, 1_000_000, 999_999_999_999];
    const cases = [];
    for (let i = 0; i < 96; i++) {
      const amount =
        i < amounts.length ? amounts[i]! : 1 + Math.floor(random() ** 2 * 50_000_000_000);
      const buyerFeeBps = i % 7 === 0 ? 0 : Math.floor(random() * 1_001);
      const sellerFeeBps = i % 11 === 0 ? 0 : Math.floor(random() * 1_001);
      const buyerShareBps = [0, 10_000, 5_000, 1, 9_999][i % 9] ?? Math.floor(random() * 10_001);
      const priced = quote(
        { unitPriceMinor: amount, currency: 'USDC', method: 'crypto' },
        {
          buyerServiceBps: buyerFeeBps,
          sellerCommissionBps: sellerFeeBps,
          // On-chain there is no payment rail between the buyer and the escrow.
          processing: { card: { bps: 0, fixedMinor: 0 }, crypto: { bps: 0, fixedMinor: 0 } },
        },
      );
      const settlement = settleSplit(priced, buyerShareBps);
      cases.push({
        amount: String(amount),
        buyerFeeBps,
        sellerFeeBps,
        buyerFee: String(priced.buyerServiceFeeMinor),
        sellerFee: String(priced.sellerCommissionMinor),
        buyerShareBps,
        buyerRefund: String(settlement.buyerRefundMinor),
        sellerPayout: String(settlement.sellerPayoutMinor),
        treasury: String(settlement.platformRevenueMinor),
      });
    }
    return {
      description: 'Fee and settlement vectors shared by escrow-core and DacityEscrow.sol',
      cases,
    };
  }

  it('matches what the engine computes today', () => {
    const expected = generate();
    if (process.env.UPDATE_VECTORS) {
      writeFileSync(file, `${JSON.stringify(expected, null, 2)}\n`);
    }
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(expected);
  });
});
