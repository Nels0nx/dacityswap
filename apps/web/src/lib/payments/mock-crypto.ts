import {
  PaymentError,
  type CryptoAsset,
  type CryptoAssetId,
  type PaymentInstrument,
  type PaymentIntent,
  type PaymentProgress,
  type PaymentProvider,
  type PaymentReceipt,
} from './types';
import { randomHex, wait } from './util';

export const CRYPTO_ASSETS: readonly CryptoAsset[] = [
  {
    id: 'USDC',
    name: 'USD Coin',
    network: 'Base',
    eurPerUnit: 0.92,
    decimals: 2,
    confirmations: 3,
  },
  {
    id: 'ETH',
    name: 'Ether',
    network: 'Ethereum',
    eurPerUnit: 3_150,
    decimals: 5,
    confirmations: 3,
  },
  {
    id: 'BTC',
    name: 'Bitcoin',
    network: 'Bitcoin',
    eurPerUnit: 88_400,
    decimals: 6,
    confirmations: 2,
  },
  { id: 'SOL', name: 'Solana', network: 'Solana', eurPerUnit: 172, decimals: 4, confirmations: 3 },
];

export function cryptoAsset(id: CryptoAssetId): CryptoAsset {
  const asset = CRYPTO_ASSETS.find((candidate) => candidate.id === id);
  if (!asset) throw new PaymentError('unsupported', `Unsupported asset ${id}`);
  return asset;
}

/** Converts a euro amount in minor units to a display string in the asset. */
export function quoteInAsset(amountMinor: number, asset: CryptoAsset): string {
  return (amountMinor / 100 / asset.eurPerUnit).toFixed(asset.decimals);
}

/**
 * Simulated on-chain payment.
 *
 * In production the stablecoin path calls `DacityEscrow.fund()` from the buyer's
 * own wallet, so the platform never takes custody of the funds.
 */
export const mockCryptoProvider: PaymentProvider = {
  method: 'crypto',
  displayName: 'Crypto (simulated)',

  async createIntent({ orderId, quote }): Promise<PaymentIntent> {
    await wait(250);
    return {
      id: `dep_${randomHex(16)}`,
      orderId,
      method: 'crypto',
      amountMinor: quote.totalMinor,
      currency: quote.currency,
    };
  },

  async confirm(
    _intent: PaymentIntent,
    instrument: PaymentInstrument,
    onProgress?: (progress: PaymentProgress) => void,
  ): Promise<PaymentReceipt> {
    if (instrument.kind !== 'crypto') throw new PaymentError('unsupported', 'Expected an asset.');
    const asset = cryptoAsset(instrument.asset);

    onProgress?.({ label: 'Waiting for transaction', done: 0, total: asset.confirmations });
    await wait(900);
    for (let done = 1; done <= asset.confirmations; done++) {
      onProgress?.({
        label: `Confirming on ${asset.network}`,
        done,
        total: asset.confirmations,
      });
      await wait(650);
    }

    return {
      paymentRef: `0x${randomHex(64)}`,
      rail: asset.network === asset.name ? asset.id : `${asset.id} · ${asset.network}`,
      capturedAt: new Date().toISOString(),
    };
  },
};
