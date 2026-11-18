'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { SearchIcon, StarIcon, VerifiedIcon } from '@/components/ui/Icons';
import { Thumb } from '@/components/ui/Thumb';
import { CATEGORIES, GAMES, gameName } from '@/domain/catalog';
import type { Listing, SortKey } from '@/domain/types';
import { formatDelivery, formatEUR } from '@/lib/format';
import { preloadModel } from '@/lib/preload';
import { useMarket } from '@/store/market-store';
import { WaitlistCard } from './WaitlistCard';

const SORTS: ReadonlyArray<{ id: SortKey; label: string }> = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'fastest', label: 'Fastest delivery' },
  { id: 'rating', label: 'Top rated' },
];

/** Verified, well-rated, fast sellers first. Fresh listings from this browser stay on top. */
const score = (item: Listing) =>
  (item.mine ? 1_000 : 0) +
  (item.seller.verified ? 20 : 0) +
  item.seller.rating * 10 +
  Math.log10(item.seller.trades + 1) * 6 -
  item.deliveryMinutes / 12;

const COMPARATORS: Record<SortKey, (a: Listing, b: Listing) => number> = {
  recommended: (a, b) => score(b) - score(a),
  price_asc: (a, b) => a.unitPriceMinor - b.unitPriceMinor,
  price_desc: (a, b) => b.unitPriceMinor - a.unitPriceMinor,
  fastest: (a, b) => a.deliveryMinutes - b.deliveryMinutes,
  rating: (a, b) => b.seller.rating - a.seller.rating || b.seller.trades - a.seller.trades,
};

function ProductCard({ listing }: { listing: Listing }) {
  const select = useMarket((state) => state.select);
  const openCheckout = useMarket((state) => state.openCheckout);
  const soldOut = listing.stock === 0;

  return (
    <li className="card flex flex-col rounded-[4px] p-2">
      <button
        type="button"
        onPointerEnter={() => preloadModel(listing.model)}
        onClick={() => select(listing.id)}
        className="group block rounded-[4px] text-left"
        aria-label={`View ${listing.title} in 3D`}
      >
        <Thumb
          model={listing.model}
          className="aspect-[4/3] w-full transition group-hover:brightness-125"
        />
      </button>
      <div className="flex flex-1 flex-col px-1.5 pt-3 pb-1">
        <p className="label text-[9px] text-white/45">{gameName(listing.game)}</p>
        <h3 className="mt-1 truncate text-sm font-medium">
          {listing.title}
          {listing.mine && (
            <span className="ml-2 rounded bg-white/12 px-1 py-px font-mono text-[9px] tracking-wider uppercase">
              Yours
            </span>
          )}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/50">
          <span className="truncate">@{listing.seller.handle}</span>
          {listing.seller.verified && (
            <VerifiedIcon
              width={12}
              height={12}
              className="text-accent shrink-0"
              aria-label="Verified seller"
            />
          )}
          <StarIcon width={10} height={10} className="shrink-0 text-white/60" />
          {listing.seller.rating.toFixed(1)}
          <span className="text-white/30">·</span>
          <span className="shrink-0">{formatDelivery(listing.deliveryMinutes)}</span>
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-mono text-base font-medium tabular-nums">
            {formatEUR(listing.unitPriceMinor)}
          </span>
          <Button
            variant="primary"
            size="sm"
            disabled={soldOut}
            onClick={() => openCheckout(listing.id)}
          >
            {soldOut ? 'Sold out' : 'Buy'}
          </Button>
        </div>
      </div>
    </li>
  );
}

export function BuyView() {
  const listings = useMarket((state) => state.listings);
  const game = useMarket((state) => state.game);
  const category = useMarket((state) => state.category);
  const sort = useMarket((state) => state.sort);
  const query = useMarket((state) => state.query);
  const setGame = useMarket((state) => state.setGame);
  const setCategory = useMarket((state) => state.setCategory);
  const setSort = useMarket((state) => state.setSort);
  const setQuery = useMarket((state) => state.setQuery);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return listings
      .filter(
        (item) =>
          (game === 'all' || item.game === game) &&
          (category === 'all' || item.category === category) &&
          (term === '' ||
            `${item.title} ${item.detail} ${item.seller.handle}`.toLowerCase().includes(term)),
      )
      .sort(COMPARATORS[sort]);
  }, [listings, game, category, sort, query]);

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
    setGame('all');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-white/[0.08]">
        <div className="scroll-none flex gap-6 overflow-x-auto" role="group" aria-label="Game">
          <button
            type="button"
            className="tab label"
            aria-pressed={game === 'all'}
            onClick={() => setGame('all')}
          >
            All games
          </button>
          {GAMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tab label flex items-center gap-2"
              aria-pressed={game === item.id}
              onClick={() => setGame(item.id)}
            >
              {item.name}
              {item.status === 'waitlist' && (
                <span className="bg-accent text-ink-950 rounded-full px-1.5 py-px font-mono text-[9px] font-bold tracking-wide">
                  SOON
                </span>
              )}
            </button>
          ))}
        </div>

        {game !== 'gta6' && (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 pb-2">
            <label className="relative w-full max-w-64">
              <span className="sr-only">Filter listings</span>
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/40"
                width={14}
                height={14}
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter listings"
                className="field h-9 rounded-full py-0 pl-8.5 text-[13px]"
              />
            </label>
            <label>
              <span className="sr-only">Sort by</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="field h-9 w-44 rounded-full py-0 text-[13px]"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {game === 'gta6' ? (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <WaitlistCard />
        </div>
      ) : (
        <>
          <div
            className="scroll-none flex shrink-0 gap-2 overflow-x-auto py-4"
            role="group"
            aria-label="Category"
          >
            {[{ id: 'all' as const, label: 'All' }, ...CATEGORIES].map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
                className="label rounded-full border border-white/10 px-3.5 py-2 text-white/60 transition hover:border-white/25 hover:text-white aria-pressed:border-white/40 aria-pressed:bg-white/[0.08] aria-pressed:text-white"
              >
                {item.label}
              </button>
            ))}
            <span className="label ml-auto self-center text-white/40">
              <span className="font-mono text-white/70">{visible.length}</span> listings · escrow on
              every purchase
            </span>
          </div>

          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-4">
            {visible.length === 0 ? (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <p className="text-sm font-medium">No listings match these filters</p>
                  <p className="mt-1 text-xs text-white/50">
                    Try another category or clear the search.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 text-xs font-medium text-teal-200 underline underline-offset-4 hover:text-teal-100"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {visible.map((listing) => (
                  <ProductCard key={listing.id} listing={listing} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
