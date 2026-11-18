import type { PaymentMethod } from '@dacityswap/escrow-core';
import { mockCardProvider } from './mock-card';
import { mockCryptoProvider } from './mock-crypto';
import type { PaymentProvider } from './types';

/**
 * Composition root for payments. Swapping a simulator for a real adapter is a
 * one-line change here; nothing in the UI imports an adapter directly.
 */
const providers: Readonly<Record<PaymentMethod, PaymentProvider>> = {
  card: mockCardProvider,
  crypto: mockCryptoProvider,
};

export function paymentProvider(method: PaymentMethod): PaymentProvider {
  return providers[method];
}

export * from './types';
export { CRYPTO_ASSETS, cryptoAsset, quoteInAsset } from './mock-crypto';
export { TEST_CARDS } from './mock-card';
