'use client';

import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { MarketOverlay } from '@/components/market/MarketOverlay';
import { Dock } from '@/components/market/Dock';
import { SideMenu } from '@/components/market/SideMenu';
import { SceneCanvas } from '@/components/scene/SceneCanvas';
import { MarketStoreProvider, useMarket, type MarketSeed } from '@/store/market-store';
import { useSceneStore } from '@/store/scene-store';
import { useEffect } from 'react';
import { CommandPalette } from './CommandPalette';
import { ConnectWalletModal } from './ConnectWalletModal';
import { ContactSellerModal } from './ContactSellerModal';
import { MissionBanner } from './MissionBanner';
import { Preloader } from './Preloader';
import { RadarHud } from './RadarHud';
import { StageDragArea } from './StageDragArea';
import { StageTitle } from './StageTitle';
import { Ticker } from './Ticker';
import { Toaster } from './Toaster';
import { TopBar } from './TopBar';
import { TrustModal } from './TrustModal';

/** Lets the WebGL scene rest while a sheet or dialog is in front of it. */
function SceneCoverSync() {
  const covered = useMarket(
    (state) => state.marketOpen || state.checkoutListingId !== null || state.modal === 'trust',
  );
  const setCovered = useSceneStore((state) => state.setCovered);
  useEffect(() => setCovered(covered), [covered, setCovered]);
  return null;
}

/**
 * The whole product lives in one viewport, built as a showroom:
 *
 *   nav
 *   title card  ·  stage (3D, drag to turn)  ·  menu
 *   dock: categories and products
 *   ticker
 *
 * Nothing scrolls except the menu, the dock's strip and the lists inside the market sheet.
 */
export function DacityApp({ seed }: { seed: MarketSeed }) {
  return (
    <MarketStoreProvider seed={seed}>
      <main className="fixed inset-0 h-dvh overflow-hidden bg-ink-950">
        <SceneCoverSync />
        <SceneCanvas />
        <StageDragArea />
        <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="pointer-events-none absolute inset-0 grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto_auto]">
          <TopBar />
          <div className="grid min-h-0 px-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:px-6">
            <div className="flex min-h-0 flex-col justify-between pb-3">
              <StageTitle />
              <RadarHud />
            </div>
            <SideMenu />
          </div>
          <Dock />
          <Ticker />
        </div>

        <MarketOverlay />
        <CheckoutModal />
        <ConnectWalletModal />
        <TrustModal />
        <ContactSellerModal />
        <CommandPalette />
        <Toaster />
        <MissionBanner />
        <Preloader />
      </main>
    </MarketStoreProvider>
  );
}
