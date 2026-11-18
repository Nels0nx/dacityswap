/**
 * Payment port.
 *
 * Checkout talks to this interface only. Adapters decide how money actually
 * moves: the demo ships two simulators, production plugs in a card PSP and the
 * on-chain escrow contract behind the same two methods.
 */
import type { Currency, PaymentMethod, Quote } from '@dacityswap/escrow-core';

export type CryptoAssetId = 'USDC' | 'ETH' | 'BTC' | 'SOL';

export interface CryptoAsset {
  readonly id: CryptoAssetId;
  readonly name: string;
  readonly network: string;
  /** Static demo rate. Production reads a signed price feed. */
  readonly eurPerUnit: number;
  readonly decimals: number;
  readonly confirmations: number;
}

export type PaymentInstrument =
  | {
      readonly kind: 'card';
      readonly number: string;
      readonly expiry: string;
      readonly cvc: string;
      readonly holder: string;
    }
  | { readonly kind: 'crypto'; readonly asset: CryptoAssetId };

export interface PaymentIntent {
  readonly id: string;
  readonly orderId: string;
  readonly method: PaymentMethod;
  readonly amountMinor: number;
  readonly currency: Currency;
}

export interface PaymentReceipt {
  /** Provider reference: a charge id or a transaction hash. */
  readonly paymentRef: string;
  /** Human-readable rail, e.g. "Visa ···· 4242" or "USDC · Base". */
  readonly rail: string;
  readonly capturedAt: string;
}

export interface PaymentProgress {
  readonly label: string;
  readonly done: number;
  readonly total: number;
}

export type PaymentErrorCode = 'card_declined' | 'invalid_details' | 'unsupported';

export class PaymentError extends Error {
  constructor(
    readonly code: PaymentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  readonly displayName: string;
  createIntent(input: { orderId: string; quote: Quote }): Promise<PaymentIntent>;
  /** Resolves once funds are captured and can be locked in escrow. */
  confirm(
    intent: PaymentIntent,
    instrument: PaymentInstrument,
    onProgress?: (progress: PaymentProgress) => void,
  ): Promise<PaymentReceipt>;
}
