'use client';

import { quote } from '@dacityswap/escrow-core';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/Icons';
import { CATEGORIES, GAMES } from '@/domain/catalog';
import type { CategoryId, GameId } from '@/domain/types';
import { formatEUR } from '@/lib/format';
import { useMarket } from '@/store/market-store';

const DELIVERY_OPTIONS = [5, 10, 15, 30, 60, 120] as const;
const MAX_PRICE_EUR = 5_000;

type Errors = Partial<Record<'title' | 'price' | 'stock', string>>;

/** Parses "12", "12.5" or "12,50" into cents. Returns null for anything else. */
function parsePrice(input: string): number | null {
  const normalised = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * 100);
}

export function SellView() {
  const publishListing = useMarket((state) => state.publishListing);
  const [game, setGame] = useState<GameId>('gtao');
  const [category, setCategory] = useState<CategoryId>('vehicles');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [delivery, setDelivery] = useState<number>(15);
  const [errors, setErrors] = useState<Errors>({});
  // An error disappears as soon as the user starts fixing that field.
  const clearError = (field: keyof Errors) =>
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

  const priceMinor = parsePrice(price);
  const preview =
    priceMinor !== null && priceMinor > 0 && priceMinor <= MAX_PRICE_EUR * 100
      ? quote({ unitPriceMinor: priceMinor, currency: 'EUR', method: 'card' })
      : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    const cleanTitle = title.trim();
    const stockCount = Number(stock);

    if (cleanTitle.length < 4) next.title = 'Give the listing a title of at least 4 characters.';
    if (priceMinor === null || priceMinor <= 0)
      next.price = 'Enter a price in euros, for example 12.50.';
    else if (priceMinor > MAX_PRICE_EUR * 100)
      next.price = `The maximum price is ${formatEUR(MAX_PRICE_EUR * 100)}.`;
    if (!Number.isInteger(stockCount) || stockCount < 1 || stockCount > 999) {
      next.stock = 'Stock must be a whole number from 1 to 999.';
    }

    setErrors(next);
    if (Object.keys(next).length > 0 || priceMinor === null) return;

    publishListing({
      game,
      category,
      title: cleanTitle,
      detail: detail.trim() || 'Delivered by the seller in-game',
      unitPriceMinor: priceMinor,
      deliveryMinutes: delivery,
      stock: stockCount,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs text-white/60">
            Game
            <select
              value={game}
              onChange={(event) => setGame(event.target.value as GameId)}
              className="field"
            >
              {GAMES.filter((item) => item.status === 'live').map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-white/60">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as CategoryId)}
              className="field"
            >
              {CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2 flex flex-col gap-1.5 text-xs text-white/60">
            Title
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                clearError('title');
              }}
              maxLength={60}
              placeholder="Hypercar · street spec"
              aria-invalid={errors.title !== undefined}
              aria-describedby={errors.title ? 'sell-title-error' : undefined}
              className="field"
            />
            {errors.title && (
              <span id="sell-title-error" role="alert" className="text-red-300">
                {errors.title}
              </span>
            )}
          </label>

          <label className="col-span-2 flex flex-col gap-1.5 text-xs text-white/60">
            <span>
              Details <span className="text-white/35">(optional)</span>
            </span>
            <input
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              maxLength={80}
              placeholder="How and where you deliver"
              className="field"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-white/60">
            Price (EUR)
            <input
              value={price}
              onChange={(event) => {
                setPrice(event.target.value);
                clearError('price');
              }}
              inputMode="decimal"
              placeholder="36.90"
              aria-invalid={errors.price !== undefined}
              aria-describedby={errors.price ? 'sell-price-error' : undefined}
              className="field font-mono"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-white/60">
            Stock
            <input
              value={stock}
              onChange={(event) => {
                setStock(event.target.value);
                clearError('stock');
              }}
              inputMode="numeric"
              aria-invalid={errors.stock !== undefined}
              aria-describedby={errors.stock ? 'sell-stock-error' : undefined}
              className="field font-mono"
            />
          </label>
          {(errors.price || errors.stock) && (
            <div className="col-span-2 -mt-1 flex flex-col gap-1 text-xs text-red-300">
              {errors.price && (
                <span id="sell-price-error" role="alert">
                  {errors.price}
                </span>
              )}
              {errors.stock && (
                <span id="sell-stock-error" role="alert">
                  {errors.stock}
                </span>
              )}
            </div>
          )}

          <label className="col-span-2 flex flex-col gap-1.5 text-xs text-white/60">
            Delivery time
            <select
              value={delivery}
              onChange={(event) => setDelivery(Number(event.target.value))}
              className="field"
            >
              {DELIVERY_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes < 60
                    ? `Within ${minutes} minutes`
                    : `Within ${minutes / 60} hour${minutes > 60 ? 's' : ''}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <dl className="mt-4 rounded-[4px] glass-inset p-3 text-xs">
          <div className="flex justify-between py-1">
            <dt className="text-white/55">Buyer pays by card</dt>
            <dd className="font-mono tabular-nums">
              {preview ? formatEUR(preview.totalMinor) : '—'}
            </dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-white/55">DacitySwap commission (5%)</dt>
            <dd className="font-mono tabular-nums">
              {preview ? `− ${formatEUR(preview.sellerCommissionMinor)}` : '—'}
            </dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-white/8 pt-2 text-sm font-medium">
            <dt>You receive per sale</dt>
            <dd className="font-mono tabular-nums">
              {preview ? formatEUR(preview.sellerPayoutMinor) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="shrink-0 border-t border-white/8 p-3">
        <Button type="submit" variant="primary" size="lg" className="w-full">
          <PlusIcon />
          Publish listing
        </Button>
        <p className="mt-2 text-center text-[11px] text-white/40">
          Payouts require identity verification. Demo listings stay in this browser.
        </p>
      </div>
    </form>
  );
}
