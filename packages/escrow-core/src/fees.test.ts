import { describe, expect, it } from 'vitest';
import { DEFAULT_FEE_SCHEDULE, PAYMENT_METHODS, quote, type FeeSchedule } from './fees';
import { bps } from './money';

/** Small deterministic PRNG so the invariant sweep is reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('bps', () => {
  it('rounds half up to the nearest minor unit', () => {
    expect(bps(10_000, 250)).toBe(250);
    expect(bps(1, 5_000)).toBe(1); // 0.5 → 1
    expect(bps(1, 4_999)).toBe(0);
    expect(bps(0, 250)).toBe(0);
  });

  it('rejects floats, negatives and out-of-range rates', () => {
    expect(() => bps(10.5, 100)).toThrow(RangeError);
    expect(() => bps(-1, 100)).toThrow(RangeError);
    expect(() => bps(100, 10_001)).toThrow(RangeError);
    expect(() => bps(100, 1.5)).toThrow(RangeError);
  });
});

describe('quote', () => {
  it('prices a €100.00 card purchase', () => {
    const q = quote({ unitPriceMinor: 10_000, currency: 'EUR', method: 'card' });
    expect(q).toMatchObject({
      subtotalMinor: 10_000,
      buyerServiceFeeMinor: 250, // 2.5 %
      processingFeeMinor: 327, // 2.9 % of 102.50 = 2.97 → 297, + 0.30
      totalMinor: 10_577,
      sellerCommissionMinor: 500, // 5 %
      sellerPayoutMinor: 9_500,
      platformRevenueMinor: 750,
    });
  });

  it('prices the same purchase cheaper over crypto rails', () => {
    const card = quote({ unitPriceMinor: 10_000, currency: 'EUR', method: 'card' });
    const crypto = quote({ unitPriceMinor: 10_000, currency: 'EUR', method: 'crypto' });
    expect(crypto.processingFeeMinor).toBe(103); // 1 % of 102.50, rounded half up
    expect(crypto.totalMinor).toBeLessThan(card.totalMinor);
    expect(crypto.sellerPayoutMinor).toBe(card.sellerPayoutMinor);
  });

  it('multiplies by quantity before applying fees', () => {
    const q = quote({ unitPriceMinor: 333, quantity: 3, currency: 'EUR', method: 'crypto' });
    expect(q.subtotalMinor).toBe(999);
    expect(q.quantity).toBe(3);
  });

  it('honours a custom schedule', () => {
    const free: FeeSchedule = {
      buyerServiceBps: 0,
      sellerCommissionBps: 0,
      processing: { card: { bps: 0, fixedMinor: 0 }, crypto: { bps: 0, fixedMinor: 0 } },
    };
    const q = quote({ unitPriceMinor: 4_200, currency: 'USD', method: 'card' }, free);
    expect(q.totalMinor).toBe(4_200);
    expect(q.sellerPayoutMinor).toBe(4_200);
    expect(q.platformRevenueMinor).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => quote({ unitPriceMinor: 9.99, currency: 'EUR', method: 'card' })).toThrow(
      RangeError,
    );
    expect(() =>
      quote({ unitPriceMinor: 100, quantity: 0, currency: 'EUR', method: 'card' }),
    ).toThrow(RangeError);
  });

  it('conserves money for every price, quantity and method', () => {
    const random = mulberry32(20261117);
    for (let i = 0; i < 5_000; i++) {
      const unitPriceMinor = Math.floor(random() * 5_000_00);
      const quantity = 1 + Math.floor(random() * 20);
      const method = PAYMENT_METHODS[Math.floor(random() * PAYMENT_METHODS.length)]!;
      const q = quote({ unitPriceMinor, quantity, currency: 'EUR', method });

      // Every cent the buyer pays is accounted for exactly once.
      expect(q.totalMinor).toBe(
        q.sellerPayoutMinor + q.platformRevenueMinor + q.processingFeeMinor,
      );
      expect(q.sellerPayoutMinor).toBeGreaterThanOrEqual(0);
      expect(q.sellerPayoutMinor).toBeLessThanOrEqual(q.subtotalMinor);
      expect(Number.isSafeInteger(q.totalMinor)).toBe(true);
    }
  });

  it('ships a frozen default schedule', () => {
    expect(Object.isFrozen(DEFAULT_FEE_SCHEDULE)).toBe(true);
    expect(Object.isFrozen(DEFAULT_FEE_SCHEDULE.processing.card)).toBe(true);
  });
});
