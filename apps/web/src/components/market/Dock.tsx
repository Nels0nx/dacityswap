'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { useMemo } from 'react';
import { ArrowRightIcon } from '@/components/ui/Icons';
import { CATEGORIES } from '@/domain/catalog';
import { thumbnailOf } from '@/domain/models';
import { formatEUR } from '@/lib/format';
import { preloadModel } from '@/lib/preload';
import { useMarket } from '@/store/market-store';
import { useSceneStore } from '@/store/scene-store';

/** The bar along the bottom: slanted category tabs, then a strip of the products in that category. */
export function Dock() {
  const revealed = useSceneStore((state) => state.phase !== 'loading');
  const listings = useMarket((state) => state.listings);
  const menuCategory = useMarket((state) => state.menuCategory);
  const selectedListingId = useMarket((state) => state.selectedListingId);
  const select = useMarket((state) => state.select);
  const browse = useMarket((state) => state.browse);
  const openMarket = useMarket((state) => state.openMarket);

  const strip = useMemo(
    () => listings.filter((item) => item.category === menuCategory),
    [listings, menuCategory],
  );

  return (
    <motion.section
      aria-label="Categories and products"
      className="pointer-events-auto relative z-10 px-3 pb-3 lg:px-6"
      initial={{ opacity: 0, y: 30 }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 1.1, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="hud-panel flex flex-col gap-2 p-2 lg:flex-row lg:items-center lg:gap-3">
        <div
          role="tablist"
          aria-label="Category"
          className="scroll-none flex shrink-0 overflow-x-auto px-1.5"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={menuCategory === category.id}
              onClick={() => browse(category.id)}
              className="hud-tab font-hud text-[1.05rem]"
            >
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        <span className="hidden h-9 w-px shrink-0 bg-white/10 lg:block" aria-hidden="true" />

        <ul className="scroll-none flex min-w-0 flex-1 gap-1.5 overflow-x-auto [mask-image:linear-gradient(90deg,#000_90%,transparent)]">
          {strip.map((listing, index) => (
            <li key={listing.id}>
              <button
                type="button"
                aria-selected={selectedListingId === listing.id}
                aria-label={`${listing.title}, ${formatEUR(listing.unitPriceMinor)}`}
                title={listing.title}
                onPointerEnter={() => preloadModel(listing.model)}
                onFocus={() => preloadModel(listing.model)}
                onClick={() => select(listing.id)}
                className="hud-slot"
                role="option"
              >
                <Image
                  src={thumbnailOf(listing.model)}
                  alt=""
                  fill
                  sizes="160px"
                  unoptimized
                  className="object-contain p-1"
                />
                <span className="absolute top-1 left-1.5 font-mono text-[9px] text-white/45">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => openMarket('buy')}
          className="label flex h-9 shrink-0 items-center justify-center gap-2 rounded-[3px] px-3 text-white/65 transition hover:bg-white/[0.08] hover:text-white"
        >
          Full market
          <span className="font-mono text-white/40">{listings.length}</span>
          <ArrowRightIcon width={12} height={12} />
        </button>
      </div>
    </motion.section>
  );
}
