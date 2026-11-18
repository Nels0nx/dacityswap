'use client';

import { quote } from '@dacityswap/escrow-core';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { LockIcon, StarIcon, VerifiedIcon } from '@/components/ui/Icons';
import { Thumb } from '@/components/ui/Thumb';
import { siteConfig } from '@/config/site';
import { GAMES, gameName } from '@/domain/catalog';
import type { GameId } from '@/domain/types';
import { cn } from '@/lib/cn';
import { formatEUR } from '@/lib/format';
import { CRYPTO_ASSETS, cryptoAsset, quoteInAsset, type CryptoAssetId } from '@/lib/payments';
import { useMarket } from '@/store/market-store';

type PayWith = 'EUR' | CryptoAssetId;

const MIN_MILLIONS = 1;
const MAX_MILLIONS = 500;
const PRESETS = [5, 20, 50, 100] as const;

/** "12", "12.5" or "12,5" → 12.5. Anything else → null. */
function parseAmount(input: string): number | null {
  const normalised = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  return Number(normalised);
}

/**
 * Swap: money in, in-game cash out, at the index price.
 *
 * It is the fast path through the market. The buyer names an amount; the order is routed to
 * the most trusted cash seller and goes through the same escrow checkout as any listing.
 */
export function SwapView() {
  const listings = useMarket((state) => state.listings);
  const indexSeries = useMarket((state) => state.indexSeries);
  const openSwapCheckout = useMarket((state) => state.openSwapCheckout);
  const [amount, setAmount] = useState('20');
  const [game, setGame] = useState<GameId>('gtao');
  const [payWith, setPayWith] = useState<PayWith>('EUR');

  // Price of one million, in cents: the latest point of the cash index.
  const rateMinor = indexSeries[indexSeries.length - 1]?.priceMinor ?? 0;

  // Route to the cash seller buyers trust most.
  const seller = useMemo(() => {
    const sellers = listings.filter((item) => item.category === 'cash').map((item) => item.seller);
    return [...sellers].sort((a, b) => b.rating - a.rating || b.trades - a.trades)[0] ?? null;
  }, [listings]);

  const millions = parseAmount(amount);
  const error =
    millions === null
      ? 'Enter an amount in millions, for example 20.'
      : millions < MIN_MILLIONS
        ? `The minimum is ${MIN_MILLIONS}M.`
        : millions > MAX_MILLIONS
          ? `The maximum is ${MAX_MILLIONS}M per swap.`
          : null;

  const method = payWith === 'EUR' ? 'card' : 'crypto';
  const price =
    error === null && millions !== null
      ? quote({ unitPriceMinor: Math.round(millions * rateMinor), currency: 'EUR', method })
      : null;
  const asset = payWith === 'EUR' ? null : cryptoAsset(payWith);

  const review = () => {
    if (!price || millions === null || !seller) return;
    openSwapCheckout(
      {
        game,
        category: 'cash',
        model: 'cash-stack',
        stats: [5, 5, 5, 5],
        title: `${millions}M in-game cash`,
        detail: `Swap at ${formatEUR(rateMinor)} per million`,
        unitPriceMinor: price.subtotalMinor,
        currency: 'EUR',
        seller,
        deliveryMinutes: 10,
        stock: 1,
      },
      { method, asset: payWith === 'EUR' ? 'USDC' : payWith },
    );
  };

  return (
    <div className="scroll-thin mx-auto grid min-h-0 w-full max-w-4xl flex-1 content-start gap-4 overflow-y-auto pb-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="hud-panel overflow-hidden" aria-labelledby="swap-title">
        <header className="hud-header flex h-11 items-center justify-between px-3.5">
          <h2 id="swap-title" className="font-hud text-[1.3rem] leading-none">
            Swap
          </h2>
          <span className="font-mono text-[11px] font-semibold tabular-nums">
            1M = {formatEUR(rateMinor)}
          </span>
        </header>

        <div className="flex flex-col gap-3 p-4">
          <div className="glass-inset rounded-[4px] p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="swap-amount" className="label text-[10px] text-white/55">
                You receive
              </label>
              <div className="flex gap-1" role="group" aria-label="Game">
                {GAMES.filter((item) => item.status === 'live').map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={game === item.id}
                    onClick={() => setGame(item.id)}
                    className="label rounded-[3px] px-2 py-1 text-[9.5px] text-white/55 transition hover:text-white aria-pressed:bg-white aria-pressed:text-black"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-end gap-3">
              <Thumb model="cash-stack" className="h-14 w-[4.5rem]" />
              <input
                id="swap-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                aria-invalid={error !== null}
                aria-describedby={error ? 'swap-error' : undefined}
                className="w-full min-w-0 bg-transparent font-mono text-5xl font-medium tracking-tight tabular-nums outline-none"
              />
              <span className="font-hud shrink-0 pb-1 text-2xl whitespace-nowrap text-white/60">
                M cash
              </span>
            </div>
            <div className="mt-3 flex gap-1.5" role="group" aria-label="Quick amounts">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="rounded-[3px] bg-white/[0.07] px-2.5 py-1 font-mono text-xs text-white/75 transition hover:bg-white/[0.14] hover:text-white"
                >
                  {preset}M
                </button>
              ))}
            </div>
            {error && (
              <p id="swap-error" role="alert" className="mt-2 text-xs text-red-300">
                {error}
              </p>
            )}
          </div>

          <div className="glass-inset rounded-[4px] p-4">
            <p className="label text-[10px] text-white/55">You pay</p>
            <p className="mt-2 font-mono text-4xl font-medium tracking-tight tabular-nums">
              {price
                ? asset
                  ? quoteInAsset(price.totalMinor, asset)
                  : formatEUR(price.totalMinor)
                : '—'}
              {asset && price && <span className="ml-2 text-xl text-white/60">{asset.id}</span>}
            </p>
            {asset && price && (
              <p className="mt-1 text-xs text-white/45">
                {formatEUR(price.totalMinor)} at a sample rate, on {asset.network}
              </p>
            )}
            <div className="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Pay with">
              {(['EUR', ...CRYPTO_ASSETS.map((item) => item.id)] as PayWith[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={payWith === option}
                  onClick={() => setPayWith(option)}
                  className={cn(
                    'rounded-[3px] py-2 text-center text-sm font-semibold transition',
                    payWith === option
                      ? 'bg-white text-black'
                      : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white',
                  )}
                >
                  {option === 'EUR' ? 'Card' : option}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={!price || !seller}
            onClick={review}
            className="w-full"
          >
            <span className="font-hud text-lg">Review swap</span>
          </Button>
          {siteConfig.demoMode && (
            <p className="text-center text-[11px] text-white/40">
              Demo: the rate is a sample index and no payment is taken.
            </p>
          )}
        </div>
      </section>

      <aside className="hud-panel h-fit overflow-hidden" aria-label="Route and fees">
        <header className="flex h-11 items-center border-b border-white/[0.08] px-3.5">
          <h2 className="label text-white/85">Route</h2>
        </header>
        <div className="flex flex-col gap-4 p-3.5 text-[13px]">
          {seller && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-white/55">Filled by</span>
              <span className="flex items-center gap-1">
                @{seller.handle}
                {seller.verified && (
                  <VerifiedIcon
                    width={13}
                    height={13}
                    className="text-accent"
                    aria-label="Verified seller"
                  />
                )}
              </span>
              <span className="flex items-center gap-1 text-white/60">
                <StarIcon width={10} height={10} />
                {seller.rating.toFixed(1)}
              </span>
            </p>
          )}
          <dl className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <dt className="text-white/55">Delivered to</dt>
              <dd>{gameName(game)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/55">Cash at index</dt>
              <dd className="font-mono tabular-nums">
                {price ? formatEUR(price.subtotalMinor) : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/55">Service fee</dt>
              <dd className="font-mono tabular-nums">
                {price ? formatEUR(price.buyerServiceFeeMinor) : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/55">
                {method === 'card' ? 'Card processing' : 'Network processing'}
              </dt>
              <dd className="font-mono tabular-nums">
                {price ? formatEUR(price.processingFeeMinor) : '—'}
              </dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between border-t border-white/[0.08] pt-2.5">
              <dt className="label text-[10px] text-white/55">Total</dt>
              <dd className="font-mono text-xl tabular-nums">
                {price ? formatEUR(price.totalMinor) : '—'}
              </dd>
            </div>
          </dl>
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
            <LockIcon width={11} height={11} className="text-accent mt-0.5 shrink-0" />
            Your payment sits in escrow. The seller is paid only after you confirm the cash arrived.
          </p>
        </div>
      </aside>
    </div>
  );
}
