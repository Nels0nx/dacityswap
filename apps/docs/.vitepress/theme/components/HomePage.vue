<script setup lang="ts">
import FeeCalculator from './FeeCalculator.vue';

/**
 * The front door of the documentation. It has one job: tell a reader what this is, prove that
 * it is running code, and send them to the right page for who they are.
 */
const REPO = 'https://github.com/Nels0nx/dacityswap';

const stats = [
  ['49', 'engine tests'],
  ['52', 'contract tests'],
  ['4', 'invariants'],
  ['96', 'shared vectors'],
  ['0', 'runtime dependencies'],
] as const;

const routes = [
  {
    index: '01',
    title: 'I am trading',
    who: 'Buyers and sellers',
    links: [
      ['How escrow works', 'One order, from payment to payout', '/guide/how-escrow-works'],
      ['Buying', 'Where your money is at every step', '/guide/buying'],
      ['Selling', 'What you commit to and when you are paid', '/guide/selling'],
      ['Fees', 'Every fee, with a live calculator', '/guide/fees'],
      ['Deadlines', 'What happens when someone goes quiet', '/guide/deadlines'],
      ['Disputes', 'How a disagreement is settled', '/guide/disputes'],
    ],
  },
  {
    index: '02',
    title: 'I am building',
    who: 'Developers',
    links: [
      ['Quickstart', 'Price a trade and run an order in minutes', '/developers/quickstart'],
      ['escrow-core reference', 'Every function, type and error', '/developers/escrow-core'],
      ['The escrow contract', 'Design decisions and lifecycle', '/developers/contract'],
      ['Contract reference', 'Functions, events, errors, gas', '/developers/contract-reference'],
      ['Connectors', 'Payments, data, chain and games, plugged in', '/developers/connectors'],
      ['Deploying to a testnet', 'Try the contract end to end', '/developers/deploy'],
    ],
  },
  {
    index: '03',
    title: 'I am auditing',
    who: 'Security and protocol',
    links: [
      ['State machine', 'Every state, event and guard', '/protocol/state-machine'],
      ['Settlement', 'The arithmetic, to the cent', '/protocol/settlement'],
      ['Guarantees', 'Each claim and the test behind it', '/protocol/guarantees'],
      ['Security model', 'What you must trust, and what you need not', '/security/model'],
      [
        'Shared test vectors',
        'How the two implementations are kept equal',
        '/developers/test-vectors',
      ],
      ['Audits and status', 'The honest state of every part', '/security/audits'],
    ],
  },
] as const;

const steps = [
  {
    state: 'funded',
    title: 'The buyer pays',
    body: 'The money is locked. The seller has received nothing.',
    window: '12 h',
    miss: 'Not accepted in time → the buyer is refunded',
  },
  {
    state: 'in_delivery',
    title: 'The seller accepts',
    body: 'A commitment to deliver. The delivery clock starts.',
    window: '24 h',
    miss: 'Not delivered in time → the buyer is refunded',
  },
  {
    state: 'delivered',
    title: 'The seller delivers',
    body: 'In the game, then marks the order delivered.',
    window: '24 h',
    miss: 'No answer from the buyer → the seller is paid',
  },
  {
    state: 'completed',
    title: 'The buyer confirms',
    body: 'The seller is paid the price, less commission.',
    window: '',
    miss: 'They disagree → a dispute, ruled on within 14 days',
  },
] as const;

const guarantees = [
  [
    'An order moves only along declared transitions',
    'Anything else throws. There is no silent no-op and no back door.',
  ],
  [
    'Money is released only after delivery',
    'By a confirmation, a closed confirmation window or an arbiter. Never before.',
  ],
  [
    'Nothing can be held for ever',
    'Every state that holds money has a deadline and a default outcome.',
  ],
  [
    'On-chain, the price goes to the buyer or the seller',
    'The contract has no function that pays a trade’s price to anyone else.',
  ],
  [
    'The owner cannot stop a settlement',
    'Pausing blocks new trades only. Sweeping can take only what nobody is owed.',
  ],
  [
    'The contract computes what the engine computes',
    'Both are tested against the same 96 vectors, so they cannot drift apart.',
  ],
] as const;

const next = [
  [
    'Game connectors',
    'Payments, data and delivery already sit behind interfaces, so connecting a game is an adapter, not a rewrite. When a game opens a lawful way in, its connector is the first thing we build.',
  ],
  [
    'Testnet and audit',
    'A public test deployment anyone can try, then an independent audit with the report published here.',
  ],
  [
    'Accounts and payments',
    'Registration, seller verification and card payments through a licensed provider.',
  ],
] as const;
</script>

<template>
  <div class="home">
    <!-- ───────────────────────────────── Hero ───────────────────────────────── -->
    <section class="hero">
      <div class="hero__art" aria-hidden="true">
        <img src="/hero-vault.webp" alt="" width="2000" height="1000" fetchpriority="high" />
        <span class="hero__caption">Fig. 01 · A payment, sealed until delivery</span>
      </div>

      <div class="hero__copy">
        <p class="kicker"><i aria-hidden="true" /> DacitySwap documentation · v0.2</p>
        <h1>Escrow you can <em>read</em> before you trust it.</h1>
        <p class="lead">
          DacitySwap holds a buyer’s money until the seller has delivered. The code that decides
          when it moves is open source, tested and documented here, line by line.
        </p>
        <div class="actions">
          <a class="btn btn--primary" href="/guide/how-escrow-works">How escrow works</a>
          <a class="btn" href="/guide/try-it">Run an order yourself</a>
          <a class="btn btn--ghost" :href="REPO" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </div>
    </section>

    <!-- ───────────────────────────────── Proof ──────────────────────────────── -->
    <section class="stats" aria-label="The code in numbers">
      <div class="wrap stats__grid">
        <p class="stats__lead">Running code,<br />not a white paper.</p>
        <dl v-for="[value, label] in stats" :key="label">
          <dt>{{ label }}</dt>
          <dd>{{ value }}</dd>
        </dl>
      </div>
    </section>

    <!-- ──────────────────────────────── Routes ──────────────────────────────── -->
    <section class="band">
      <div class="wrap">
        <header class="band__head">
          <p class="label">Start here</p>
          <h2>Three ways in</h2>
        </header>

        <div class="routes">
          <article v-for="route in routes" :key="route.index" class="route">
            <header>
              <span class="route__index">{{ route.index }}</span>
              <div>
                <h3>{{ route.title }}</h3>
                <p>{{ route.who }}</p>
              </div>
            </header>
            <ul>
              <li v-for="[title, hint, href] in route.links" :key="href">
                <a :href="href">
                  <span>
                    <b>{{ title }}</b>
                    <small>{{ hint }}</small>
                  </span>
                  <i aria-hidden="true">→</i>
                </a>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- ───────────────────────────────── Flow ───────────────────────────────── -->
    <section class="band band--alt">
      <div class="wrap flow">
        <div>
          <header class="band__head">
            <p class="label">How a trade moves</p>
            <h2>Four steps, and a deadline on every one</h2>
          </header>
          <ol class="steps">
            <li v-for="(step, index) in steps" :key="step.state">
              <span class="steps__n">{{ index + 1 }}</span>
              <div>
                <h3>
                  {{ step.title }}
                  <code>{{ step.state }}</code>
                </h3>
                <p>{{ step.body }}</p>
                <p class="steps__miss">
                  <span v-if="step.window" class="steps__window">{{ step.window }}</span>
                  {{ step.miss }}
                </p>
              </div>
            </li>
          </ol>
          <a class="more" href="/guide/try-it">Play both sides yourself →</a>
        </div>

        <div>
          <header class="band__head">
            <p class="label">What it costs</p>
            <h2>One function prices every trade</h2>
          </header>
          <FeeCalculator />
        </div>
      </div>
    </section>
    <!-- ─────────────────────────── The question ─────────────────────────── -->
    <section class="band question">
      <div class="wrap question__grid">
        <div>
          <p class="label">The question everyone asks</p>
          <h2>GTA VI is out.<br /><em>Where is the trading?</em></h2>
        </div>
        <div class="question__answer">
          <p>
            GTA VI launches on 19 November 2026 as a single-player game. Trading between players
            happens in an online economy, and GTA VI’s has not been dated.
          </p>
          <ul>
            <li>
              <b>Not tied to one game.</b> DacitySwap is the escrow between buyer and seller. It
              works the same for any game whose economy allows trading.
            </li>
            <li>
              <b>Using the time.</b> The company, a legal opinion, a licensed payment partner and
              the contract audit take months, and they come first whatever game opens first.
            </li>
            <li>
              <b>One connector away.</b> When an economy opens where trading is lawful, connecting
              it is an adapter, not a rebuild.
            </li>
          </ul>
          <a class="more" href="/guide/gta-vi-and-launch">The full answer →</a>
        </div>
      </div>
    </section>

    <!-- ───────────────────────────────── Code ───────────────────────────────── -->
    <section class="band">
      <div class="wrap">
        <header class="band__head">
          <p class="label">Read it</p>
          <h2>The same rules, twice</h2>
          <p class="band__sub">
            Once in TypeScript for the platform and once in Solidity for stablecoin payments. Both
            are checked against one file of numbers.
          </p>
        </header>

        <div class="code">
          <article class="ds-panel">
            <div class="ds-panel__bar">
              The engine
              <small>packages/escrow-core</small>
            </div>
            <div class="vp-doc"><slot name="engine" /></div>
            <a class="code__more" href="/developers/escrow-core">escrow-core reference →</a>
          </article>
          <article class="ds-panel">
            <div class="ds-panel__bar">
              The contract
              <small>packages/contracts</small>
            </div>
            <div class="vp-doc"><slot name="contract" /></div>
            <a class="code__more" href="/developers/contract">The escrow contract →</a>
          </article>
        </div>
      </div>
    </section>

    <!-- ────────────────────────────── Guarantees ────────────────────────────── -->
    <section class="band band--alt">
      <div class="wrap">
        <header class="band__head">
          <p class="label">What you can verify</p>
          <h2>Six claims, each with a test behind it</h2>
        </header>
        <ol class="claims">
          <li v-for="([title, body], index) in guarantees" :key="title">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <h3>{{ title }}</h3>
            <p>{{ body }}</p>
          </li>
        </ol>
        <a class="more" href="/protocol/guarantees"
          >Every guarantee, and what is not guaranteed →</a
        >
      </div>
    </section>

    <!-- ───────────────────────────────── Next ───────────────────────────────── -->
    <section class="band">
      <div class="wrap next">
        <header class="band__head">
          <p class="label">Where it is going</p>
          <h2>Built to be connected</h2>
          <p class="band__sub">
            The escrow does not depend on any one game or payment method. What comes next is
            connecting it.
          </p>
          <a class="more" href="/developers/connectors">How connectors work →</a>
        </header>
        <ul>
          <li v-for="[title, body] in next" :key="title">
            <h3>{{ title }}</h3>
            <p>{{ body }}</p>
          </li>
        </ul>
      </div>
    </section>

    <!-- ──────────────────────────────── Status ──────────────────────────────── -->
    <section class="notice">
      <div class="wrap notice__row">
        <p>
          <b>Pre-launch.</b> The engine and the contract are finished and tested. Trading opens once
          the company and the legal set-up are complete, and the contract is audited before it holds
          funds.
        </p>
        <a href="/security/audits">Current status →</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  --pad: var(--ds-gutter);
  color: var(--vp-c-text-1);
}

/* Every section lines up on the same two edges as the hero and the footer. */
.wrap {
  padding: 0 var(--pad);
}

/* ── Hero: always dark, whatever the theme, because it is built on a photograph ── */
.hero {
  position: relative;
  display: flex;
  align-items: center;
  min-height: min(780px, calc(100vh - var(--vp-nav-height) - 132px));
  padding: 4.5rem var(--pad);
  overflow: hidden;
  background: #050608;
  color: #f3f5fa;
}

.hero__art {
  position: absolute;
  inset: 0 0 0 auto;
  width: 66%;
}

.hero__art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 34% 50%;
}

.hero__art::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      #050608 0%,
      rgb(5 6 8 / 0.86) 14%,
      rgb(5 6 8 / 0.28) 44%,
      transparent 68%
    ),
    linear-gradient(0deg, #050608 0%, transparent 26%),
    linear-gradient(180deg, rgb(5 6 8 / 0.55) 0%, transparent 22%);
}

.hero__caption {
  position: absolute;
  right: var(--pad);
  bottom: 1.4rem;
  z-index: 1;
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(243 245 250 / 0.6);
}

.hero__copy {
  position: relative;
  z-index: 1;
  width: min(100%, 46rem);
}

.kicker {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 1.4rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(243 245 250 / 0.66);
}

.kicker i {
  width: 7px;
  height: 7px;
  background: var(--ds-accent);
}

.hero h1 {
  margin: 0;
  font-stretch: 68%;
  font-style: italic;
  font-weight: 800;
  font-size: clamp(3rem, 5.6vw, 6.4rem);
  line-height: 0.9;
  letter-spacing: 0.002em;
  text-transform: uppercase;
}

.hero h1 em {
  padding-right: 0.08em;
  background: var(--ds-dusk);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lead {
  margin: 1.6rem 0 0;
  max-width: 34rem;
  font-size: clamp(1.02rem, 1.15vw, 1.22rem);
  line-height: 1.6;
  color: rgb(243 245 250 / 0.78);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 2.1rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  height: 2.9rem;
  padding: 0 1.25rem;
  border: 1px solid rgb(255 255 255 / 0.22);
  border-radius: 3px;
  background: rgb(255 255 255 / 0.06);
  color: #f3f5fa;
  font-size: 0.92rem;
  font-weight: 600;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.btn:hover {
  border-color: rgb(255 255 255 / 0.5);
  background: rgb(255 255 255 / 0.12);
}

.btn--primary {
  border-color: var(--ds-accent);
  background: var(--ds-accent);
  color: #04110e;
}

.btn--primary:hover {
  border-color: #86f7de;
  background: #86f7de;
}

.btn--ghost {
  border-color: transparent;
  background: transparent;
  color: rgb(243 245 250 / 0.75);
}

/* ── Proof ── */
.stats {
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
}

.stats__grid {
  display: grid;
  grid-template-columns: minmax(200px, 1.5fr) repeat(5, minmax(0, 1fr));
}

.stats__lead {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 1.6rem 1.5rem 1.6rem 0;
  font-stretch: 68%;
  font-style: italic;
  font-weight: 800;
  font-size: 1.5rem;
  line-height: 1;
  text-transform: uppercase;
}

.stats dl {
  display: flex;
  flex-direction: column-reverse;
  justify-content: center;
  gap: 0.2rem;
  margin: 0;
  padding: 1.5rem 0 1.5rem 1.5rem;
  border-left: 1px solid var(--vp-c-divider);
}

.stats dd {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: clamp(1.8rem, 2.6vw, 2.7rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--vp-c-brand-1);
}

.stats dt {
  font-stretch: 112%;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--vp-c-text-3);
}

/* ── Bands ── */
.band {
  padding: clamp(3.5rem, 6vw, 6rem) 0;
}

.band--alt {
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
}

.band__head {
  margin-bottom: 2rem;
}

.label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 0.7rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.label::before {
  content: '';
  width: 1.4rem;
  height: 1px;
  background: currentColor;
}

.band h2 {
  margin: 0;
  font-stretch: 72%;
  font-style: italic;
  font-weight: 800;
  font-size: clamp(1.9rem, 3vw, 3rem);
  line-height: 1;
  text-transform: uppercase;
}

.band__sub {
  margin: 0.9rem 0 0;
  max-width: 40rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.more {
  display: inline-block;
  margin-top: 1.6rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.more:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

/* ── Routes ── */
.routes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-divider);
}

.route {
  background: var(--vp-c-bg);
}

.route > header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1.5rem 1.3rem;
  border-top: 2px solid var(--vp-c-brand-1);
}

.route__index {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
}

.route h3 {
  margin: 0;
  font-stretch: 72%;
  font-style: italic;
  font-weight: 800;
  font-size: 1.7rem;
  line-height: 1;
  text-transform: uppercase;
}

.route > header p {
  margin: 0.3rem 0 0;
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
}

.route ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.route li {
  border-top: 1px solid var(--vp-c-divider);
}

.route a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.5rem;
  color: inherit;
  transition: background 0.15s;
}

.route a b {
  display: block;
  font-size: 0.98rem;
  font-weight: 600;
}

.route a small {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}

.route a i {
  font-style: normal;
  color: var(--vp-c-text-3);
  transition:
    transform 0.15s,
    color 0.15s;
}

.route a:hover {
  background: var(--vp-c-brand-soft);
}

.route a:hover i {
  transform: translateX(4px);
  color: var(--vp-c-brand-1);
}

/* ── Flow ── */
.flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: clamp(2rem, 5vw, 5rem);
  align-items: start;
}

.flow :deep(.ds-panel) {
  margin: 0;
  background: var(--vp-c-bg);
}

.steps {
  margin: 0;
  padding: 0;
  list-style: none;
}

.steps li {
  position: relative;
  display: grid;
  grid-template-columns: 2.2rem 1fr;
  gap: 1.1rem;
  padding-bottom: 1.6rem;
}

.steps li:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 2.2rem;
  bottom: 0;
  left: 1.1rem;
  width: 1px;
  background: var(--vp-c-border);
}

.steps__n {
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border: 1px solid var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  color: var(--vp-c-brand-1);
}

.steps h3 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.7rem;
  margin: 0.25rem 0 0;
  font-size: 1.08rem;
  font-weight: 650;
}

.steps code {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
}

.steps p {
  margin: 0.3rem 0 0;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.steps__miss {
  font-size: 0.86rem;
  color: var(--vp-c-text-3) !important;
}

.steps__window {
  display: inline-block;
  margin-right: 0.5rem;
  padding: 0.05rem 0.4rem;
  border: 1px solid var(--vp-c-border);
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}

/* ── The question ── */
.question {
  border-top: 1px solid var(--vp-c-divider);
  background:
    radial-gradient(60% 120% at 0% 0%, rgb(244 70 127 / 0.1), transparent 60%),
    radial-gradient(50% 120% at 100% 100%, rgb(160 59 226 / 0.1), transparent 60%);
}

.question__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: clamp(2rem, 5vw, 6rem);
  align-items: start;
}

.question h2 em {
  padding-right: 0.08em;
  background: var(--ds-dusk);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.question__answer > p {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.6;
  color: var(--vp-c-text-1);
}

.question__answer ul {
  display: grid;
  gap: 0;
  margin: 1.4rem 0 0;
  padding: 0;
  list-style: none;
}

.question__answer li {
  padding: 1rem 0;
  border-top: 1px solid var(--vp-c-divider);
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.question__answer li b {
  color: var(--vp-c-text-1);
}

@media (max-width: 1100px) {
  .question__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* ── Code ── */
.code {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

.code .ds-panel {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.code .vp-doc {
  flex: 1;
}

.code :deep(div[class*='language-']) {
  margin: 0;
  border-radius: 0 !important;
  background: transparent;
}

.code :deep(pre) {
  padding: 1.1rem 0;
}

.code :deep(code) {
  font-size: 0.84rem;
  line-height: 1.75;
}

.code__more {
  display: block;
  padding: 0.85rem 1.4rem;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.code__more:hover {
  background: var(--vp-c-brand-soft);
}

/* ── Claims ── */
.claims {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--vp-c-divider);
  border-left: 1px solid var(--vp-c-divider);
  list-style: none;
}

.claims li {
  padding: 1.6rem 1.5rem 1.8rem;
  border-right: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.claims span {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  color: var(--vp-c-brand-1);
}

.claims h3 {
  margin: 0.7rem 0 0;
  font-size: 1.08rem;
  font-weight: 650;
  line-height: 1.3;
}

.claims p {
  margin: 0.5rem 0 0;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

/* ── Next ── */
.next {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.6fr);
  gap: clamp(2rem, 5vw, 5rem);
}

.next .band__head {
  margin: 0;
}

.next ul {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.next li {
  padding-top: 1.1rem;
  border-top: 1px solid var(--vp-c-border);
}

.next h3 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 650;
}

.next li p {
  margin: 0.5rem 0 0;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

/* ── Status ── */
.notice {
  border-top: 1px solid var(--vp-c-divider);
}

.notice__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem 2rem;
  padding-top: 1.3rem;
  padding-bottom: 1.3rem;
}

.notice p {
  position: relative;
  margin: 0;
  padding-left: 1.2rem;
  max-width: 62rem;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.notice p::before {
  content: '';
  position: absolute;
  top: 0.5em;
  left: 0;
  width: 7px;
  height: 7px;
  background: #ffb347;
}

.notice p b {
  color: var(--vp-c-text-1);
}

.notice a {
  flex: none;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

/* ── Smaller screens ── */
@media (max-width: 1100px) {
  .routes,
  .claims,
  .code,
  .flow,
  .next,
  .next ul {
    grid-template-columns: minmax(0, 1fr);
  }

  .stats__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .stats__lead {
    grid-column: 1 / -1;
    padding-bottom: 0;
  }

  .stats dl:first-of-type {
    padding-left: 0;
    border-left: 0;
  }
}

@media (max-width: 760px) {
  .hero {
    align-items: flex-end;
    min-height: 620px;
    padding-top: 15rem;
    padding-bottom: 3rem;
  }

  .hero__art {
    inset: 0 0 auto 0;
    width: 100%;
    height: 21rem;
  }

  .hero__art::after {
    background: linear-gradient(0deg, #050608 4%, rgb(5 6 8 / 0.4) 46%, rgb(5 6 8 / 0.5) 100%);
  }

  .hero__caption {
    display: none;
  }

  .stats__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats dl {
    padding: 1rem 0;
    border-left: 0;
    border-top: 1px solid var(--vp-c-divider);
  }
}
</style>
