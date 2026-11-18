'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useCallback } from 'react';
import { CloseIcon } from '@/components/ui/Icons';
import type { PanelTab } from '@/domain/types';
import { useKeydown } from '@/lib/hooks';
import { useMarket } from '@/store/market-store';
import { BuyView } from './BuyView';
import { OrdersView } from './OrdersView';
import { SellView } from './SellView';
import { SwapView } from './SwapView';

const TABS: ReadonlyArray<{ id: PanelTab; label: string }> = [
  { id: 'buy', label: 'Market' },
  { id: 'swap', label: 'Swap' },
  { id: 'sell', label: 'Sell' },
  { id: 'orders', label: 'Orders' },
];

/** The full market: a sheet over the scene with every listing, the sell form and your orders. */
export function MarketOverlay() {
  const open = useMarket((state) => state.marketOpen);
  const tab = useMarket((state) => state.tab);
  const setTab = useMarket((state) => state.setTab);
  const closeMarket = useMarket((state) => state.closeMarket);
  const modalOpen = useMarket((state) => state.modal !== null || state.checkoutListingId !== null);
  const orderCount = useMarket((state) => state.orders.length);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      // A dialog on top handles its own Escape.
      if (open && !modalOpen && event.key === 'Escape') closeMarket();
    },
    [open, modalOpen, closeMarket],
  );
  useKeydown(onKeydown);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Market"
          className="pointer-events-auto fixed inset-0 z-40 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-2xl backdrop-saturate-150"
            aria-hidden="true"
          />

          <motion.div
            className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pt-5 pb-2 lg:px-12"
            initial={{ y: 24 }}
            animate={{ y: 0 }}
            exit={{ y: 12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex shrink-0 items-center justify-between pb-6">
              <div role="tablist" aria-label="Market sections" className="flex gap-8">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    aria-selected={tab === item.id}
                    aria-controls="market-tabpanel"
                    onClick={() => setTab(item.id)}
                    className="tab font-hud text-xl font-semibold tracking-tight uppercase sm:text-2xl"
                  >
                    {item.label}
                    {item.id === 'orders' && orderCount > 0 && (
                      <sup className="ml-1.5 font-mono text-[10px] font-normal text-white/45">
                        {orderCount}
                      </sup>
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={closeMarket}
                className="label flex items-center gap-2 rounded-full border border-white/12 py-2 pr-3 pl-4 text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Close
                <CloseIcon width={14} height={14} />
              </button>
            </header>

            <div
              id="market-tabpanel"
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              className="flex min-h-0 flex-1 flex-col"
            >
              {tab === 'buy' && <BuyView />}
              {tab === 'swap' && <SwapView />}
              {tab === 'sell' && (
                <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 content-start gap-4 pb-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <section
                    className="hud-panel flex min-h-0 flex-col overflow-hidden"
                    aria-labelledby="sell-title"
                  >
                    <header className="hud-header flex h-11 shrink-0 items-center px-3.5">
                      <h2 id="sell-title" className="font-hud text-[1.3rem] leading-none">
                        New listing
                      </h2>
                    </header>
                    <SellView />
                  </section>
                  <aside className="hud-panel h-fit overflow-hidden" aria-label="How selling works">
                    <header className="flex h-11 items-center border-b border-white/[0.08] px-3.5">
                      <h2 className="label text-white/85">How selling works</h2>
                    </header>
                    <ol className="flex flex-col gap-3 p-3.5 text-[13px] text-white/70">
                      {[
                        ['List it', 'Set a price. Buyers see it at once, with a 3D preview.'],
                        [
                          'Deliver',
                          'When someone pays, the money is locked. Hand the item over in-game and mark it delivered.',
                        ],
                        [
                          'Get paid',
                          'Funds release when the buyer confirms, or after 24 hours. You keep 95%.',
                        ],
                      ].map(([title, body], index) => (
                        <li key={title} className="flex gap-3">
                          <span className="font-hud text-accent text-lg leading-none">
                            0{index + 1}
                          </span>
                          <span>
                            <span className="block font-medium text-white">{title}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-white/55">
                              {body}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </aside>
                </div>
              )}
              {tab === 'orders' && <OrdersView />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
