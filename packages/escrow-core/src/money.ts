/**
 * Money primitives.
 *
 * Every amount in DacitySwap is an integer number of minor units (cents).
 * Floats never touch a balance: rounding happens in exactly one place (`bps`).
 */

export const CURRENCIES = ['EUR', 'USD', 'USDC'] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface Money {
  readonly amountMinor: number;
  readonly currency: Currency;
}

export function assertMinorUnits(value: number, label = 'amount'): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer of minor units, got ${value}`);
  }
}

export function money(amountMinor: number, currency: Currency): Money {
  assertMinorUnits(amountMinor);
  return { amountMinor, currency };
}

/**
 * Applies a basis-point rate (1 bps = 0.01 %) to an amount, rounding half up.
 * The single rounding rule of the platform.
 */
export function bps(amountMinor: number, basisPoints: number): number {
  assertMinorUnits(amountMinor);
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new RangeError(`basisPoints must be an integer in [0, 10000], got ${basisPoints}`);
  }
  return Math.round((amountMinor * basisPoints) / 10_000);
}

export function formatMoney(value: Money, locale = 'en-IE'): string {
  const major = value.amountMinor / 100;
  if (value.currency === 'USDC') {
    return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(major)} USDC`;
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency: value.currency }).format(
    major,
  );
}
