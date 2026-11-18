import {
  PaymentError,
  type PaymentInstrument,
  type PaymentIntent,
  type PaymentProgress,
  type PaymentProvider,
  type PaymentReceipt,
} from './types';
import { cardBrand, luhnValid, randomHex, wait } from './util';

/** Test numbers, mirroring the convention card processors use in sandbox mode. */
export const TEST_CARDS = {
  success: '4242 4242 4242 4242',
  declined: '4000 0000 0000 0002',
} as const;

/**
 * Simulated card processor.
 *
 * In production the card form is replaced by the PSP's hosted fields, so card
 * numbers never reach DacitySwap servers (PCI DSS SAQ A).
 */
export const mockCardProvider: PaymentProvider = {
  method: 'card',
  displayName: 'Card (simulated)',

  async createIntent({ orderId, quote }): Promise<PaymentIntent> {
    await wait(250);
    return {
      id: `pi_${randomHex(16)}`,
      orderId,
      method: 'card',
      amountMinor: quote.totalMinor,
      currency: quote.currency,
    };
  },

  async confirm(
    _intent: PaymentIntent,
    instrument: PaymentInstrument,
    onProgress?: (progress: PaymentProgress) => void,
  ): Promise<PaymentReceipt> {
    if (instrument.kind !== 'card') throw new PaymentError('unsupported', 'Expected a card.');

    const digits = instrument.number.replace(/\D/g, '');
    if (!luhnValid(digits)) throw new PaymentError('invalid_details', 'Card number is not valid.');
    if (!/^(0[1-9]|1[0-2])\s?\/\s?\d{2}$/.test(instrument.expiry.trim())) {
      throw new PaymentError('invalid_details', 'Expiry must be MM / YY.');
    }
    if (!/^\d{3,4}$/.test(instrument.cvc)) {
      throw new PaymentError('invalid_details', 'Security code must be 3 or 4 digits.');
    }

    onProgress?.({ label: 'Authorising with issuer', done: 0, total: 2 });
    await wait(900);
    if (digits.endsWith('0002')) {
      throw new PaymentError('card_declined', 'The issuer declined this card. Try another one.');
    }
    onProgress?.({ label: 'Capturing payment', done: 1, total: 2 });
    await wait(700);
    onProgress?.({ label: 'Payment captured', done: 2, total: 2 });

    return {
      paymentRef: `ch_${randomHex(20)}`,
      rail: `${cardBrand(digits)} ···· ${digits.slice(-4)}`,
      capturedAt: new Date().toISOString(),
    };
  },
};
