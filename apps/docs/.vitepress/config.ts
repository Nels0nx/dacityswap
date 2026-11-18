import { defineConfig } from 'vitepress';

const REPO = 'https://github.com/Nels0nx/dacityswap';
const SITE = 'https://docs.dacityswap.com';
const DESCRIPTION =
  'How DacitySwap holds, releases and refunds money: the escrow state machine, the fee engine and the on-chain contract, all open source.';

export default defineConfig({
  lang: 'en',
  title: 'DacitySwap Docs',
  titleTemplate: ':title · DacitySwap Docs',
  description: DESCRIPTION,
  cleanUrls: true,
  lastUpdated: false,
  appearance: 'dark',
  sitemap: { hostname: SITE },

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }],
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/icon.png' }],
    ['meta', { name: 'theme-color', content: '#050608' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'DacitySwap Docs' }],
    ['meta', { property: 'og:title', content: 'DacitySwap Docs' }],
    ['meta', { property: 'og:description', content: DESCRIPTION }],
    ['meta', { property: 'og:image', content: `${SITE}/og.jpg` }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],

  themeConfig: {
    logo: { src: '/logo.svg', alt: '' },
    siteTitle: 'DacitySwap',

    nav: [
      { text: 'Guide', link: '/guide/what-is-dacityswap', activeMatch: '^/guide/' },
      { text: 'Protocol', link: '/protocol/state-machine', activeMatch: '^/protocol/' },
      { text: 'Developers', link: '/developers/quickstart', activeMatch: '^/developers/' },
      { text: 'Security', link: '/security/model', activeMatch: '^/security/' },
      {
        text: 'v0.2',
        items: [
          { text: 'Changelog', link: '/resources/changelog' },
          { text: 'Roadmap', link: '/resources/roadmap' },
          { text: 'Contributing', link: `${REPO}/blob/main/CONTRIBUTING.md` },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'What is DacitySwap?', link: '/guide/what-is-dacityswap' },
          { text: 'GTA VI and launch timing', link: '/guide/gta-vi-and-launch' },
          { text: 'How escrow works', link: '/guide/how-escrow-works' },
          { text: 'Run an order yourself', link: '/guide/try-it' },
          { text: 'Buying', link: '/guide/buying' },
          { text: 'Selling', link: '/guide/selling' },
          { text: 'Fees', link: '/guide/fees' },
          { text: 'Deadlines', link: '/guide/deadlines' },
          { text: 'Disputes', link: '/guide/disputes' },
        ],
      },
      {
        text: 'Protocol',
        items: [
          { text: 'State machine', link: '/protocol/state-machine' },
          { text: 'Settlement', link: '/protocol/settlement' },
          { text: 'Audit trail', link: '/protocol/audit-trail' },
          { text: 'Guarantees', link: '/protocol/guarantees' },
        ],
      },
      {
        text: 'Developers',
        items: [
          { text: 'Quickstart', link: '/developers/quickstart' },
          { text: 'escrow-core reference', link: '/developers/escrow-core' },
          { text: 'The escrow contract', link: '/developers/contract' },
          { text: 'Contract reference', link: '/developers/contract-reference' },
          { text: 'Connectors', link: '/developers/connectors' },
          { text: 'Integrating payments', link: '/developers/integration' },
          { text: 'Shared test vectors', link: '/developers/test-vectors' },
          { text: 'Deploying to a testnet', link: '/developers/deploy' },
        ],
      },
      {
        text: 'Security',
        items: [
          { text: 'Security model', link: '/security/model' },
          { text: 'Audits and status', link: '/security/audits' },
          { text: 'Reporting a vulnerability', link: '/security/disclosure' },
        ],
      },
      {
        text: 'Resources',
        items: [
          { text: 'FAQ', link: '/resources/faq' },
          { text: 'Glossary', link: '/resources/glossary' },
          { text: 'Roadmap', link: '/resources/roadmap' },
          { text: 'Changelog', link: '/resources/changelog' },
          { text: 'Legal', link: '/resources/legal' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: REPO }],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
    editLink: {
      pattern: `${REPO}/edit/main/apps/docs/:path`,
      text: 'Suggest a change to this page',
    },
  },

  vite: {
    // The docs run the real engine, straight from the workspace source.
    ssr: { noExternal: ['@dacityswap/escrow-core'] },
  },
});
