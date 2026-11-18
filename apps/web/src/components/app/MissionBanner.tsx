'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMarket } from '@/store/market-store';

/**
 * The payoff: a full-width band across the screen when a trade completes or is refunded.
 * It is announced to assistive technology through the toast that fires with it.
 */
export function MissionBanner() {
  const banner = useMarket((state) => state.banner);

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          key={banner.id}
          className="pointer-events-none fixed inset-x-0 top-[34%] z-[58] overflow-hidden"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative bg-gradient-to-r from-black/0 via-black/85 to-black/0 py-6 text-center"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hairline-accent absolute inset-x-0 top-0" />
            <div className="hairline-accent absolute inset-x-0 bottom-0" />
            <motion.p
              className="font-hud text-gradient text-[clamp(2.8rem,8.5vw,7.5rem)] leading-[0.9]"
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              {banner.title}
            </motion.p>
            <motion.div
              className="label mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] text-white/75"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              {banner.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
