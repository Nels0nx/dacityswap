<script setup lang="ts">
import { useSidebar } from 'vitepress/theme';

/** One footer for every page: the whole site map, and the two sentences that must not be missed. */
const { hasSidebar } = useSidebar();
const REPO = 'https://github.com/Nels0nx/dacityswap';

const columns = [
  {
    title: 'Guide',
    links: [
      ['GTA VI and launch timing', '/guide/gta-vi-and-launch'],
      ['How escrow works', '/guide/how-escrow-works'],
      ['Run an order yourself', '/guide/try-it'],
      ['Buying', '/guide/buying'],
      ['Selling', '/guide/selling'],
      ['Fees', '/guide/fees'],
      ['Deadlines', '/guide/deadlines'],
      ['Disputes', '/guide/disputes'],
    ],
  },
  {
    title: 'Protocol',
    links: [
      ['State machine', '/protocol/state-machine'],
      ['Settlement', '/protocol/settlement'],
      ['Audit trail', '/protocol/audit-trail'],
      ['Guarantees', '/protocol/guarantees'],
    ],
  },
  {
    title: 'Developers',
    links: [
      ['Quickstart', '/developers/quickstart'],
      ['escrow-core reference', '/developers/escrow-core'],
      ['The escrow contract', '/developers/contract'],
      ['Contract reference', '/developers/contract-reference'],
      ['Connectors', '/developers/connectors'],
      ['Integrating payments', '/developers/integration'],
      ['Shared test vectors', '/developers/test-vectors'],
    ],
  },
  {
    title: 'Project',
    links: [
      ['Security model', '/security/model'],
      ['Audits and status', '/security/audits'],
      ['Report a vulnerability', '/security/disclosure'],
      ['Roadmap', '/resources/roadmap'],
      ['Changelog', '/resources/changelog'],
      ['Legal', '/resources/legal'],
      ['GitHub', REPO],
    ],
  },
] as const;
</script>

<template>
  <footer class="site-footer" :class="{ 'with-sidebar': hasSidebar }">
    <div class="inner">
      <div class="brand">
        <a href="/" class="mark">
          <img src="/logo.svg" alt="" width="28" height="28" />
          <span>DacitySwap</span>
        </a>
        <p>Escrow you can read before you trust it.</p>
        <p class="status"><i aria-hidden="true" /> Pre-launch · legal set-up in progress</p>
      </div>

      <nav v-for="column in columns" :key="column.title" :aria-label="column.title">
        <h2>{{ column.title }}</h2>
        <ul>
          <li v-for="[text, href] in column.links" :key="href">
            <a
              :href="href"
              :target="href.startsWith('http') ? '_blank' : undefined"
              :rel="href.startsWith('http') ? 'noreferrer' : undefined"
              >{{ text }}</a
            >
          </li>
        </ul>
      </nav>
    </div>

    <div class="legal">
      <span>© 2026 DacitySwap. Code released under the Apache-2.0 licence.</span>
      <span>An independent project, not affiliated with any game publisher.</span>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  font-size: 0.86rem;
}

@media (min-width: 960px) {
  .site-footer.with-sidebar {
    padding-left: var(--vp-sidebar-width);
  }
}

.inner {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(4, minmax(0, 1fr));
  gap: 2.5rem;
  padding: 3.5rem var(--ds-gutter) 2.5rem;
}

.mark {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-stretch: 68%;
  font-style: italic;
  font-weight: 800;
  font-size: 1.4rem;
  text-transform: uppercase;
  color: var(--vp-c-text-1);
}

.brand p {
  margin: 0.8rem 0 0;
  max-width: 22rem;
  color: var(--vp-c-text-2);
}

.brand .status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.brand .status i {
  width: 7px;
  height: 7px;
  background: #ffb347;
}

h2 {
  margin: 0 0 0.9rem;
  font-stretch: 116%;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

ul {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

nav a {
  color: var(--vp-c-text-2);
  transition: color 0.15s;
}

nav a:hover {
  color: var(--vp-c-brand-1);
}

.legal {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 2rem;
  padding: 1.1rem var(--ds-gutter);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.76rem;
  color: var(--vp-c-text-3);
}

@media (max-width: 1100px) {
  .inner {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .brand {
    grid-column: 1 / -1;
  }
}
</style>
