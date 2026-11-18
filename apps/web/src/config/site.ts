export const siteConfig = {
  name: 'DacitySwap',
  title: 'DacitySwap — the escrow-first market for open-world economies',
  description:
    'Buy and sell in-game cash, vehicles and services with every trade locked in escrow until delivery is confirmed. Pay by card or crypto.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  repoUrl: 'https://github.com/Nels0nx/dacityswap',
  /**
   * GTA VI's announced console release date. Drives the countdown.
   * The game launches as single-player; no online mode or date has been announced,
   * so the countdown is to the game's launch, not to a market opening.
   * Keep in sync with the publisher's official announcements.
   */
  gta6LaunchAt: '2026-11-19T00:00:00Z',
  /**
   * Demo mode: seeded data, simulated payments, simulated counterparties.
   * Nothing leaves the browser.
   */
  demoMode: true,
  legalNotice:
    'DacitySwap is an independent marketplace. It is not affiliated with, endorsed by or sponsored by Rockstar Games or Take-Two Interactive. All trademarks belong to their respective owners.',
} as const;
