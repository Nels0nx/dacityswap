'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { SearchIcon, WalletIcon } from '@/components/ui/Icons';
import { siteConfig } from '@/config/site';
import type { PanelTab } from '@/domain/types';
import { shortAddress } from '@/lib/format';
import { useMarket } from '@/store/market-store';
import { useSceneStore } from '@/store/scene-store';
import { Logo } from './Logo';

const NAV: ReadonlyArray<{ tab: PanelTab; label: string }> = [
  { tab: 'buy', label: 'Market' },
  { tab: 'swap', label: 'Swap' },
  { tab: 'sell', label: 'Sell' },
  { tab: 'orders', label: 'Orders' },
];

export function TopBar() {
  const revealed = useSceneStore((state) => state.phase !== 'loading');
  const select = useMarket((state) => state.select);
  const openMarket = useMarket((state) => state.openMarket);
  const openModal = useMarket((state) => state.openModal);
  const wallet = useMarket((state) => state.wallet);
  const disconnectWallet = useMarket((state) => state.disconnectWallet);
  const activeOrders = useMarket(
    (state) =>
      state.orders.filter((order) =>
        ['funded', 'in_delivery', 'delivered', 'disputed'].includes(order.escrow.state),
      ).length,
  );

  return (
    <motion.header
      className="pointer-events-auto relative z-20 flex h-16 items-center gap-2 px-3 lg:px-6"
      initial={{ opacity: 0, y: -16 }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
      transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href="/"
        aria-label="DacitySwap home"
        className="rounded-[3px] lg:pl-6"
        onClick={() => select(null)}
      >
        <Logo />
      </Link>

      {/* Centred on the page, not on the space left between logo and actions. */}
      <nav
        aria-label="Primary"
        className="hud-panel absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 p-1 md:flex"
      >
        {NAV.map((item) => (
          <button
            key={item.tab}
            type="button"
            onClick={() => openMarket(item.tab)}
            className="label flex h-8 items-center gap-1.5 rounded-[3px] px-4 text-white/70 transition hover:bg-white/[0.09] hover:text-white"
          >
            {item.label}
            {item.tab === 'orders' && activeOrders > 0 && (
              <span className="bg-accent text-ink-950 grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[10px] font-bold">
                {activeOrders}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => openModal('trust')}
          className="label flex h-8 items-center rounded-[3px] px-4 text-white/70 transition hover:bg-white/[0.09] hover:text-white"
        >
          Trust
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-2 lg:pr-6">
        {siteConfig.demoMode && (
          <span
            className="label hidden items-center gap-1.5 rounded-[3px] border border-white/12 px-2.5 py-1.5 text-[10px] text-white/60 sm:flex"
            title="Seeded data and simulated payments. Nothing leaves your browser."
          >
            <span className="bg-accent size-1.5 rounded-full" />
            Demo
          </span>
        )}

        <button
          type="button"
          onClick={() => openModal('palette')}
          className="hud-panel flex h-10 items-center gap-2 px-3.5 text-sm text-white/60 transition hover:text-white"
          aria-label="Search the market"
        >
          <SearchIcon />
          <kbd className="hidden font-mono text-[10px] text-white/45 sm:inline">⌘K</kbd>
        </button>

        {wallet ? (
          <Button
            onClick={disconnectWallet}
            title="Click to disconnect"
            className="font-mono text-xs"
          >
            <span className="bg-accent size-2 rounded-full" />
            {shortAddress(wallet.address)}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => openModal('wallet')}>
            <WalletIcon />
            <span className="hidden sm:inline">Connect wallet</span>
            <span className="sm:hidden">Connect</span>
          </Button>
        )}
      </div>
    </motion.header>
  );
}
