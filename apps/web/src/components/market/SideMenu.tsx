'use client';

import { quote } from '@dacityswap/escrow-core';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ClockIcon, LockIcon, StarIcon, VerifiedIcon } from '@/components/ui/Icons';
import { IndexChart } from '@/components/market/IndexChart';
import { siteConfig } from '@/config/site';
import { CATEGORIES, STAT_LABELS, categoryLabel } from '@/domain/catalog';
import type { Listing } from '@/domain/types';
import { formatDelivery, formatEUR, formatEURCompact, formatInt } from '@/lib/format';
import { useKeydown } from '@/lib/hooks';
import { preloadModel } from '@/lib/preload';
import { useMarket } from '@/store/market-store';
import { useSceneStore } from '@/store/scene-store';

const pad = (value: number) => String(value).padStart(2, '0');

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[6.25rem_1fr] items-center gap-3">
      <dt className="label text-[9.5px] text-white/55">{label}</dt>
      <dd
        className="stat-bar"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
        aria-label={label}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <i key={index} data-on={index < value} />
        ))}
      </dd>
    </div>
  );
}

function Details({ listing }: { listing: Listing }) {
  const openCheckout = useMarket((state) => state.openCheckout);
  const openContact = useMarket((state) => state.openContact);
  const price = quote({ unitPriceMinor: listing.unitPriceMinor, currency: 'EUR', method: 'card' });
  const labels = STAT_LABELS[listing.category];
  const soldOut = listing.stock === 0;

  return (
    <div className="flex flex-col gap-4 border-t border-white/[0.08] p-3.5">
      <p className="text-[12.5px] leading-relaxed text-white/60">{listing.detail}.</p>

      <dl className="flex flex-col gap-2">
        {labels.map((label, index) => (
          <StatBar key={label} label={label} value={listing.stats[index] ?? 0} />
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
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
        <span
          className="flex items-center gap-1"
          aria-label={`Rated ${listing.seller.rating.toFixed(1)} out of 5`}
        >
          <span className="flex" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <StarIcon
                key={index}
                width={10}
                height={10}
                className={
                  index < Math.round(listing.seller.rating) ? 'text-white' : 'text-white/20'
                }
              />
            ))}
          </span>
          {listing.seller.rating.toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <ClockIcon width={11} height={11} />
          {formatDelivery(listing.deliveryMinutes)}
        </span>
        <span className="ml-auto font-mono tabular-nums">{listing.stock} left</span>
      </div>

      <div className="flex items-baseline justify-between border-t border-white/[0.08] pt-3">
        <span className="label text-[10px] text-white/55">Total with fees</span>
        <span className="font-mono text-2xl font-medium tracking-tight tabular-nums">
          {formatEUR(price.totalMinor)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Button
          variant="primary"
          size="lg"
          disabled={soldOut}
          onClick={() => openCheckout(listing.id)}
          className="w-full justify-between"
        >
          <span className="font-hud text-lg">{soldOut ? 'Sold out' : 'Buy now'}</span>
          {!soldOut && (
            <kbd className="rounded-[3px] bg-black/12 px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
          )}
        </Button>
        <Button onClick={() => openContact(listing.id)} className="w-full">
          Contact seller
        </Button>
      </div>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
        <LockIcon width={11} height={11} className="text-accent mt-0.5 shrink-0" />
        Held in escrow until you confirm delivery.
      </p>
    </div>
  );
}

function Pulse() {
  const stats = useMarket((state) => state.stats);
  const indexSeries = useMarket((state) => state.indexSeries);

  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.08] p-3.5">
      <IndexChart series={indexSeries} bare />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {[
          ['24h volume', formatEURCompact(stats.volume24hMinor)],
          ['In escrow', formatInt(stats.openEscrows)],
          ['Median delivery', `${stats.medianDeliveryMinutes} min`],
          ['Dispute rate', `${stats.disputeRatePct}%`],
        ].map(([label, value]) => (
          <div key={label}>
            <dd className="font-mono text-base tabular-nums">{value}</dd>
            <dt className="text-white/45">{label}</dt>
          </div>
        ))}
      </dl>
      {siteConfig.demoMode && <p className="label text-[9px] text-white/35">Sample figures</p>}
    </div>
  );
}

/**
 * The showroom menu: one category at a time, one row selected, its details underneath.
 * Arrow keys browse it and Enter buys, as in a console game's shop.
 */
export function SideMenu() {
  const revealed = useSceneStore((state) => state.phase !== 'loading');
  const listings = useMarket((state) => state.listings);
  const menuCategory = useMarket((state) => state.menuCategory);
  const selectedListingId = useMarket((state) => state.selectedListingId);
  const select = useMarket((state) => state.select);
  const step = useMarket((state) => state.step);
  const browse = useMarket((state) => state.browse);
  const openCheckout = useMarket((state) => state.openCheckout);
  const blocked = useMarket(
    (state) => state.marketOpen || state.modal !== null || state.checkoutListingId !== null,
  );
  const list = useRef<HTMLDivElement>(null);

  const menu = useMemo(
    () => listings.filter((item) => item.category === menuCategory),
    [listings, menuCategory],
  );
  const selected = menu.find((item) => item.id === selectedListingId) ?? null;
  const index = selected ? menu.indexOf(selected) : -1;

  // Keep the selected row in view when the keyboard moves it.
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedListingId]);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (blocked || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        step(event.key === 'ArrowDown' ? 1 : -1);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const order = CATEGORIES.map((category) => category.id);
        const next = order.indexOf(menuCategory) + (event.key === 'ArrowRight' ? 1 : -1);
        browse(order[(next + order.length) % order.length]!);
      } else if (
        event.key === 'Enter' &&
        selected &&
        selected.stock > 0 &&
        !target?.closest('button, a')
      ) {
        event.preventDefault();
        openCheckout(selected.id);
      }
    },
    [blocked, step, browse, menuCategory, selected, openCheckout],
  );
  useKeydown(onKeydown);

  return (
    <motion.aside
      aria-label="Showroom menu"
      className="pointer-events-auto hidden min-h-0 flex-col justify-center py-2 lg:flex"
      initial={{ opacity: 0, x: 28 }}
      animate={revealed ? { opacity: 1, x: 0 } : { opacity: 0, x: 28 }}
      transition={{ duration: 1.1, delay: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="hud-panel flex min-h-0 flex-col overflow-hidden">
        <header className="hud-header flex h-11 shrink-0 items-center justify-between px-3.5">
          <h2 className="font-hud text-[1.45rem] leading-none">{categoryLabel(menuCategory)}</h2>
          <span className="font-mono text-[11px] font-semibold tabular-nums">
            {index >= 0 ? pad(index + 1) : '––'} / {pad(menu.length)}
          </span>
        </header>

        <div
          ref={list}
          role="listbox"
          aria-label={`${categoryLabel(menuCategory)} for sale`}
          className="scroll-thin min-h-[4.75rem] shrink overflow-y-auto"
        >
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === selectedListingId}
              onPointerEnter={() => preloadModel(item.model)}
              onClick={() => select(item.id)}
              className="hud-row"
            >
              <span className="truncate">{item.title}</span>
              <span className="shrink-0 font-mono text-[12.5px] tabular-nums">
                {item.stock === 0 ? 'SOLD' : formatEUR(item.unitPriceMinor)}
              </span>
            </button>
          ))}
        </div>

        <div className="shrink-0">{selected ? <Details listing={selected} /> : <Pulse />}</div>
      </div>
    </motion.aside>
  );
}
