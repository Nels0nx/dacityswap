'use client';

import {
  DEFAULT_FEE_SCHEDULE,
  quote as priceQuote,
  type PaymentMethod,
  type Quote,
} from '@dacityswap/escrow-core';
import { useMemo, useState, type FormEvent } from 'react';
import { EscrowTimeline } from '@/components/market/EscrowTimeline';
import { Button } from '@/components/ui/Button';
import {
  AlertIcon,
  CardIcon,
  ChainIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  LockIcon,
  StarIcon,
  VerifiedIcon,
} from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { Thumb } from '@/components/ui/Thumb';
import { gameName } from '@/domain/catalog';
import type { Listing } from '@/domain/types';
import { cn } from '@/lib/cn';
import { formatDelivery, formatEUR, shortAddress } from '@/lib/format';
import {
  CRYPTO_ASSETS,
  PaymentError,
  TEST_CARDS,
  cryptoAsset,
  paymentProvider,
  quoteInAsset,
  type CryptoAssetId,
  type PaymentInstrument,
  type PaymentProgress,
} from '@/lib/payments';
import { wait } from '@/lib/payments/util';
import { useMarket } from '@/store/market-store';
import { useSceneStore } from '@/store/scene-store';
import { demoAddress, demoQrMatrix } from './pseudo';

const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

function FeeBreakdown({ quote }: { quote: Quote }) {
  const rail = DEFAULT_FEE_SCHEDULE.processing[quote.method];
  const processingLabel =
    rail.fixedMinor > 0 ? `${pct(rail.bps)} + ${formatEUR(rail.fixedMinor)}` : pct(rail.bps);

  return (
    <dl className="text-sm">
      <div className="flex justify-between py-1.5">
        <dt className="text-white/60">Item price</dt>
        <dd className="font-mono tabular-nums">{formatEUR(quote.subtotalMinor)}</dd>
      </div>
      <div className="flex justify-between py-1.5">
        <dt className="text-white/60">Service fee ({pct(DEFAULT_FEE_SCHEDULE.buyerServiceBps)})</dt>
        <dd className="font-mono tabular-nums">{formatEUR(quote.buyerServiceFeeMinor)}</dd>
      </div>
      <div className="flex justify-between py-1.5">
        <dt className="text-white/60">
          {quote.method === 'card' ? 'Card' : 'Network'} processing ({processingLabel})
        </dt>
        <dd className="font-mono tabular-nums">{formatEUR(quote.processingFeeMinor)}</dd>
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-3">
        <dt className="font-medium">Total</dt>
        <dd className="font-mono text-xl font-medium tabular-nums">
          {formatEUR(quote.totalMinor)}
        </dd>
      </div>
    </dl>
  );
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})(?=.)/g, '$1 ');
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

interface CardFields {
  number: string;
  expiry: string;
  cvc: string;
  holder: string;
}

function CardPane({ card, onChange }: { card: CardFields; onChange: (card: CardFields) => void }) {
  const fill = (number: string) =>
    onChange({ number, expiry: '12 / 30', cvc: '123', holder: 'Demo Buyer' });

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2 rounded-[4px] border border-teal-300/20 bg-teal-300/[0.07] p-3 text-xs leading-relaxed text-teal-100/85">
        <AlertIcon width={14} height={14} className="mt-px shrink-0" />
        <span>
          Demo checkout. Do not enter a real card.{' '}
          <button
            type="button"
            onClick={() => fill(TEST_CARDS.success)}
            className="font-semibold underline underline-offset-2"
          >
            Fill a test card
          </button>{' '}
          or{' '}
          <button
            type="button"
            onClick={() => fill(TEST_CARDS.declined)}
            className="font-semibold underline underline-offset-2"
          >
            one that gets declined
          </button>
          .
        </span>
      </p>

      <label className="flex flex-col gap-1.5 text-xs text-white/60">
        Card number
        <input
          data-autofocus
          value={card.number}
          onChange={(event) => onChange({ ...card, number: formatCardNumber(event.target.value) })}
          inputMode="numeric"
          autoComplete="off"
          placeholder="4242 4242 4242 4242"
          className="field font-mono"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs text-white/60">
          Expiry
          <input
            value={card.expiry}
            onChange={(event) => onChange({ ...card, expiry: formatExpiry(event.target.value) })}
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM / YY"
            className="field font-mono"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-white/60">
          Security code
          <input
            value={card.cvc}
            onChange={(event) =>
              onChange({ ...card, cvc: event.target.value.replace(/\D/g, '').slice(0, 4) })
            }
            inputMode="numeric"
            autoComplete="off"
            placeholder="CVC"
            className="field font-mono"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-xs text-white/60">
        Name on card
        <input
          value={card.holder}
          onChange={(event) => onChange({ ...card, holder: event.target.value })}
          autoComplete="off"
          placeholder="Full name"
          className="field"
        />
      </label>
    </div>
  );
}

function CryptoPane({
  listingId,
  totalMinor,
  asset,
  onAssetChange,
}: {
  listingId: string;
  totalMinor: number;
  asset: CryptoAssetId;
  onAssetChange: (asset: CryptoAssetId) => void;
}) {
  const wallet = useMarket((state) => state.wallet);
  const pushToast = useMarket((state) => state.pushToast);
  const selected = cryptoAsset(asset);
  const address = useMemo(
    () =>
      selected.id === 'BTC'
        ? demoAddress(listingId + asset, 'bc1q', 38)
        : selected.id === 'SOL'
          ? demoAddress(listingId + asset, 'Da', 42)
          : demoAddress(listingId + asset, '0x', 40),
    [listingId, asset, selected.id],
  );
  const matrix = useMemo(() => demoQrMatrix(address), [address]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      pushToast({ tone: 'info', title: 'Demo address copied', body: 'Do not send funds to it.' });
    } catch {
      pushToast({
        tone: 'danger',
        title: 'Could not copy',
        body: 'Select the address and copy it manually.',
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Asset">
        {CRYPTO_ASSETS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={asset === option.id}
            onClick={() => onAssetChange(option.id)}
            className={cn(
              'rounded-[4px] border px-2 py-2 text-center transition',
              asset === option.id
                ? 'border-white/30 bg-white/12'
                : 'border-white/8 bg-white/[0.03] hover:border-white/20',
            )}
          >
            <span className="block text-sm font-semibold">{option.id}</span>
            <span className="block text-[10px] text-white/45">{option.network}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3 rounded-[4px] glass-inset p-3">
        <div className="relative shrink-0 rounded-[4px] bg-white p-2">
          <svg
            viewBox={`0 0 ${matrix.length} ${matrix.length}`}
            className="size-[104px]"
            shapeRendering="crispEdges"
            role="img"
            aria-label="Demo QR code, not scannable"
          >
            {matrix.map((row, y) =>
              row.map((on, x) =>
                on ? (
                  <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0c0718" />
                ) : null,
              ),
            )}
          </svg>
          <span className="absolute inset-x-0 bottom-0.5 text-center font-mono text-[7px] tracking-[0.2em] text-black/50 uppercase">
            Demo
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div>
            <p className="text-[11px] text-white/50">Send exactly</p>
            <p className="font-mono text-lg leading-tight font-medium tabular-nums">
              {quoteInAsset(totalMinor, selected)}{' '}
              <span className="text-sm text-white/60">{selected.id}</span>
            </p>
            <p className="text-[11px] text-white/45">on {selected.network} · sample rate</p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-2 rounded-[3px] bg-white/6 px-2 py-1.5 text-left transition hover:bg-white/12"
            aria-label="Copy demo deposit address"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/75">
              {address}
            </span>
            <CopyIcon width={13} height={13} className="shrink-0 text-white/50" />
          </button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-white/50">
        {wallet
          ? `Paying from ${shortAddress(wallet.address)} (${wallet.label}, simulated).`
          : 'In production you pay straight from your wallet into the escrow contract.'}{' '}
        This address is fake. Nothing is sent.
      </p>
    </div>
  );
}

function Processing({ progress }: { progress: PaymentProgress | null }) {
  const ratio = progress ? progress.done / Math.max(1, progress.total) : 0;
  return (
    <div
      className="grid flex-1 place-items-center p-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-xs">
        <span className="mx-auto block size-10 animate-spin rounded-full border-2 border-white/15 border-t-teal-300" />
        <p className="mt-5 text-sm font-medium">{progress?.label ?? 'Preparing payment'}</p>
        {progress && progress.total > 1 && (
          <p className="mt-1 font-mono text-xs text-white/50 tabular-nums">
            {progress.done} / {progress.total}
          </p>
        )}
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="bg-accent-fill h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.max(8, ratio * 100)}%` }}
          />
        </div>
        <p className="mt-4 text-xs text-white/45">Keep this window open.</p>
      </div>
    </div>
  );
}

function Done({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  // Read the order live so the timeline moves as the seller responds.
  const order = useMarket((state) => state.orders.find((candidate) => candidate.id === orderId));
  const openMarket = useMarket((state) => state.openMarket);
  if (!order) return null;

  return (
    <div className="flex flex-1 flex-col items-center p-6 text-center sm:p-8">
      <span className="bg-accent-fill text-ink-950 grid size-14 place-items-center rounded-full shadow-[0_0_50px_-8px_rgb(79_242_207/0.7)]">
        <LockIcon width={24} height={24} strokeWidth={2} />
      </span>
      <h3 className="mt-5 text-xl font-semibold tracking-tight">
        {formatEUR(order.escrow.quote.totalMinor)} locked in escrow
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-white/60">
        @{order.sellerHandle} has been notified. They are only paid after you confirm delivery.
      </p>
      <p className="mt-3 rounded-md bg-white/6 px-2 py-1 font-mono text-[11px] text-white/60">
        {order.id}
      </p>

      <div className="mt-6 w-full max-w-md rounded-[4px] glass-inset p-4">
        <EscrowTimeline escrow={order.escrow} />
      </div>

      <div className="mt-6 flex w-full max-w-md gap-2">
        <Button className="flex-1" onClick={onClose}>
          Keep browsing
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          data-autofocus
          onClick={() => {
            onClose();
            openMarket('orders');
          }}
        >
          Track order
        </Button>
      </div>
    </div>
  );
}

function CheckoutBody({
  listing,
  onBusyChange,
  onClose,
}: {
  listing: Listing;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}) {
  const placeOrder = useMarket((state) => state.placeOrder);
  const firePulse = useSceneStore((state) => state.firePulse);
  const prefs = useMarket((state) => state.checkoutPrefs);
  const [method, setMethod] = useState<PaymentMethod>(prefs?.method ?? 'card');
  const [asset, setAsset] = useState<CryptoAssetId>(prefs?.asset ?? 'USDC');
  const [card, setCard] = useState<CardFields>({ number: '', expiry: '', cvc: '', holder: '' });
  const [status, setStatus] = useState<'form' | 'processing' | 'done'>('form');
  const [progress, setProgress] = useState<PaymentProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const quote = useMemo(
    () =>
      priceQuote({ unitPriceMinor: listing.unitPriceMinor, currency: listing.currency, method }),
    [listing.unitPriceMinor, listing.currency, method],
  );

  const pay = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setProgress(null);
    setStatus('processing');
    onBusyChange(true);

    const instrument: PaymentInstrument =
      method === 'card' ? { kind: 'card', ...card } : { kind: 'crypto', asset };

    try {
      const provider = paymentProvider(method);
      const intent = await provider.createIntent({ orderId: listing.id, quote });
      const receipt = await provider.confirm(intent, instrument, setProgress);
      setProgress({ label: 'Locking funds in escrow', done: 1, total: 1 });
      await wait(700);

      const order = placeOrder({ listing, quote, receipt });
      setOrderId(order.id);
      setStatus('done');
      firePulse();
    } catch (cause) {
      setStatus('form');
      setError(
        cause instanceof PaymentError
          ? cause.message
          : 'Something went wrong on our side. You have not been charged.',
      );
    } finally {
      onBusyChange(false);
    }
  };

  if (status === 'processing') return <Processing progress={progress} />;
  if (status === 'done' && orderId) return <Done orderId={orderId} onClose={onClose} />;

  return (
    <form
      onSubmit={pay}
      noValidate
      className="scroll-thin grid min-h-0 grid-cols-[minmax(0,1fr)] overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
    >
      <section
        className="min-w-0 border-b border-white/8 p-5 md:border-r md:border-b-0"
        aria-label="Order summary"
      >
        <div className="flex items-center gap-3">
          <Thumb model={listing.model} className="h-14 w-[4.5rem]" />
          <div className="min-w-0">
            <p className="truncate font-medium">{listing.title}</p>
            <p className="truncate text-xs text-white/50">
              {gameName(listing.game)} · {listing.detail}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[4px] bg-white/[0.04] px-3 py-2.5 text-xs text-white/65">
          <span className="flex items-center gap-1 text-white/90">
            @{listing.seller.handle}
            {listing.seller.verified && (
              <VerifiedIcon
                width={13}
                height={13}
                className="text-accent"
                aria-label="Verified seller"
              />
            )}
          </span>
          <span className="flex items-center gap-1">
            <StarIcon width={11} height={11} className="text-teal-300" />
            {listing.seller.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon width={11} height={11} />
            {formatDelivery(listing.deliveryMinutes)}
          </span>
        </div>

        <div className="mt-5">
          <FeeBreakdown quote={quote} />
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-white/55">
          <LockIcon width={13} height={13} className="mt-0.5 shrink-0 text-teal-200" />
          Your payment is held in escrow. The seller receives {formatEUR(
            quote.sellerPayoutMinor,
          )}{' '}
          only after you confirm delivery.
        </p>
      </section>

      <section className="flex min-w-0 flex-col p-5" aria-label="Payment">
        <div
          className="grid grid-cols-2 gap-1.5 rounded-[4px] bg-white/[0.04] p-1"
          role="radiogroup"
          aria-label="Payment method"
        >
          {(
            [
              ['card', 'Card', CardIcon],
              ['crypto', 'Crypto', ChainIcon],
            ] as const
          ).map(([id, label, MethodIcon]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={method === id}
              onClick={() => {
                setMethod(id);
                setError(null);
              }}
              className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-[4px] text-sm font-medium transition',
                method === id ? 'bg-white/14 text-white' : 'text-white/55 hover:text-white',
              )}
            >
              <MethodIcon />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex-1">
          {method === 'card' ? (
            <CardPane card={card} onChange={setCard} />
          ) : (
            <CryptoPane
              listingId={listing.id}
              totalMinor={quote.totalMinor}
              asset={asset}
              onAssetChange={setAsset}
            />
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-[4px] border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-200"
          >
            <AlertIcon width={14} height={14} className="mt-px shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" className="mt-4 w-full">
          {method === 'card' ? (
            <>
              <LockIcon />
              Pay {formatEUR(quote.totalMinor)}
            </>
          ) : (
            <>
              <CheckIcon />
              Simulate {asset} payment
            </>
          )}
        </Button>
      </section>
    </form>
  );
}

export function CheckoutModal() {
  const listing = useMarket((state) =>
    state.checkoutDraft?.id === state.checkoutListingId
      ? state.checkoutDraft
      : (state.listings.find((item) => item.id === state.checkoutListingId) ?? null),
  );
  const closeCheckout = useMarket((state) => state.closeCheckout);
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={listing !== null}
      // A payment in flight cannot be abandoned half-way.
      onClose={busy ? () => {} : closeCheckout}
      title="Secure checkout"
      className="sm:max-w-3xl"
    >
      {listing && (
        <CheckoutBody
          key={listing.id}
          listing={listing}
          onBusyChange={setBusy}
          onClose={closeCheckout}
        />
      )}
    </Modal>
  );
}
