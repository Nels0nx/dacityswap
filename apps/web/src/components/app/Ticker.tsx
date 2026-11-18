'use client';

import { motion } from 'motion/react';
import { siteConfig } from '@/config/site';
import { formatEUR } from '@/lib/format';
import { useMarket } from '@/store/market-store';
import { useSceneStore } from '@/store/scene-store';

export function Ticker() {
  const revealed = useSceneStore((state) => state.phase !== 'loading');
  const ticker = useMarket((state) => state.ticker);
  // Two copies side by side make the loop seamless.
  const loop = [...ticker, ...ticker];

  return (
    <motion.footer
      className="pointer-events-auto relative z-10 hidden h-9 items-center bg-gradient-to-b from-white/[0.07] to-ink-950/70 shadow-[inset_0_1px_0_rgb(255_255_255/0.14)] backdrop-blur-2xl backdrop-saturate-200 lg:flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: revealed ? 1 : 0 }}
      transition={{ duration: 1, delay: 1.6 }}
    >
      <div className="flex h-full shrink-0 items-center gap-2 border-r border-white/8 px-4 font-mono text-[10px] tracking-[0.16em] text-white/55 uppercase">
        <span className="bg-accent size-1.5 rounded-full" />
        {siteConfig.demoMode ? 'Sample trades' : 'Live trades'}
      </div>

      <div
        className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]"
        aria-hidden="true"
      >
        <ul className="animate-marquee flex w-max items-center hover:[animation-play-state:paused]">
          {loop.map((trade, index) => (
            <li
              key={`${trade.id}-${index}`}
              className="flex items-center gap-2 px-5 text-xs whitespace-nowrap"
            >
              <span className="text-white/45">@{trade.handle}</span>
              <span className="text-white/85">{trade.title}</span>
              <span className="font-mono text-white tabular-nums">
                {formatEUR(trade.priceMinor)}
              </span>
              <span className="rounded border border-white/10 px-1.5 py-px font-mono text-[10px] text-white/50">
                {trade.rail}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="label hidden shrink-0 items-center gap-3 border-l border-white/8 px-4 text-[9.5px] text-white/50 xl:flex">
        <span className="flex items-center gap-1.5">
          <kbd className="keycap">↑</kbd>
          <kbd className="keycap">↓</kbd> Browse
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="keycap">←</kbd>
          <kbd className="keycap">→</kbd> Category
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="keycap">↵</kbd> Buy
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="keycap">Drag</kbd> Turn
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="keycap">Scroll</kbd> Zoom
        </span>
      </p>
    </motion.footer>
  );
}
