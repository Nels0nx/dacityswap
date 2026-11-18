'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { ArrowRightIcon, ClockIcon, LockIcon, StarIcon, VerifiedIcon } from '@/components/ui/Icons';
import { categoryLabel, gameName } from '@/domain/catalog';
import { formatDelivery, formatEUR } from '@/lib/format';
import { useMarket } from '@/store/market-store';
import { useSceneStore } from '@/store/scene-store';

const EASE = [0.16, 1, 0.3, 1] as const;

/** "Hypercar · Stage 3" becomes a headline and a second, smaller line. */
function splitTitle(title: string): [string, string | null] {
  const [first, ...rest] = title.split(' · ');
  return [first ?? title, rest.length > 0 ? rest.join(' · ') : null];
}

/** The name of whatever is on stage, set over the sky like a title card. */
export function StageTitle() {
  const revealed = useSceneStore((state) => state.phase !== 'loading');
  const loading = useSceneStore((state) => state.stageLoading);
  const listing = useMarket(
    (state) => state.listings.find((item) => item.id === state.selectedListingId) ?? null,
  );
  const browse = useMarket((state) => state.browse);
  const menuCategory = useMarket((state) => state.menuCategory);
  const openModal = useMarket((state) => state.openModal);
  const openCheckout = useMarket((state) => state.openCheckout);
  const openContact = useMarket((state) => state.openContact);

  const [headline, second] = listing ? splitTitle(listing.title) : ['Trade the', 'City.'];

  return (
    <motion.section
      className="flex min-h-0 flex-col pt-2 lg:pt-6 lg:pl-6"
      aria-labelledby="hero-title"
      initial={{ opacity: 0, y: -18 }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: -18 }}
      transition={{ duration: 1.2, delay: 0.8, ease: EASE }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={listing?.id ?? 'brand'}
          className="max-w-[40rem]"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <p className="label flex items-center gap-2 text-white/65">
            <span className="bg-accent size-1.5 rounded-full shadow-[0_0_10px_var(--color-accent)]" />
            {listing
              ? `${categoryLabel(listing.category)} · ${gameName(listing.game)}`
              : 'Escrow-first marketplace'}
            {loading && (
              <span className="flex items-center gap-1.5 text-white/45" role="status">
                <span className="size-3 animate-spin rounded-full border border-white/25 border-t-white" />
                Loading model
              </span>
            )}
          </p>

          <h1
            id="hero-title"
            className="font-hud mt-2 text-[clamp(2.4rem,min(6vw,12.5dvh),6.25rem)] leading-[0.86]"
          >
            <span className="block">{headline}</span>
            {second && (
              <span className="text-gradient mt-1 block text-[0.56em] leading-none">{second}</span>
            )}
          </h1>

          {listing ? (
            <>
              <p className="mt-4 font-mono text-3xl font-medium tracking-tight tabular-nums lg:text-4xl">
                {formatEUR(listing.unitPriceMinor)}
              </p>
              {/* On small screens the side menu is hidden, so its facts and actions live here. */}
              <p className="mt-2 flex items-center gap-3 text-xs text-white/65 lg:hidden">
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
                  <StarIcon width={10} height={10} />
                  {listing.seller.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon width={11} height={11} />
                  {formatDelivery(listing.deliveryMinutes)}
                </span>
              </p>
              <div className="pointer-events-auto mt-4 flex items-center gap-2 lg:hidden">
                <Button
                  variant="primary"
                  disabled={listing.stock === 0}
                  onClick={() => openCheckout(listing.id)}
                >
                  {listing.stock === 0 ? 'Sold out' : 'Buy now'}
                  <ArrowRightIcon />
                </Button>
                <Button onClick={() => openContact(listing.id)}>Contact seller</Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 hidden max-w-[26rem] text-[15px] leading-relaxed text-white/70 sm:block">
                Buy and sell in-game cash, vehicles and gear. Your money stays locked in escrow
                until delivery is confirmed.
              </p>
              <div className="pointer-events-auto mt-5 flex items-center gap-2">
                <Button variant="primary" size="lg" onClick={() => browse(menuCategory)}>
                  Enter the showroom
                  <ArrowRightIcon />
                </Button>
                {/* Hidden on phones by a wrapper: the button's own display class would win otherwise. */}
                <span className="hidden sm:block">
                  <Button size="lg" onClick={() => openModal('trust')}>
                    <LockIcon />
                    How escrow works
                  </Button>
                </span>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
