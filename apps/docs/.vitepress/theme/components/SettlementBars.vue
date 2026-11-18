<script setup lang="ts">
import { quote, settleSplit } from '@dacityswap/escrow-core';
import { computed, ref } from 'vue';

/**
 * Where a buyer's payment ends up, for each way a trade can end. Every figure comes from
 * `settleSplit()`. A segmented bar per outcome: one whole (the payment), split into parts.
 */
const props = withDefaults(defineProps<{ priceMinor?: number }>(), { priceMinor: 21_900 });

const PARTS = [
  { key: 'buyer', name: 'Back to the buyer' },
  { key: 'seller', name: 'To the seller' },
  { key: 'platform', name: 'To DacitySwap' },
  { key: 'rail', name: 'To the payment rail' },
] as const;
type PartKey = (typeof PARTS)[number]['key'];

const priced = computed(() =>
  quote({ unitPriceMinor: props.priceMinor, currency: 'EUR', method: 'card' }),
);

const rows = computed(() =>
  [
    { label: 'Completed', note: 'The buyer confirms, or 24 hours pass', share: 0 },
    { label: 'Split 40 / 60', note: 'An arbiter returns 40 % to the buyer', share: 4_000 },
    { label: 'Refunded', note: 'A missed deadline, a seller refund or a ruling', share: 10_000 },
  ].map((row) => {
    const s = settleSplit(priced.value, row.share);
    // From the payment itself; a rail fee DacitySwap returns comes on top, from its own pocket.
    const amounts: Record<PartKey, number> = {
      buyer: s.buyerRefundMinor - s.platformCostMinor,
      seller: s.sellerPayoutMinor,
      platform: s.platformRevenueMinor,
      rail: s.processingFeeMinor,
    };
    return { ...row, amounts, topUp: s.platformCostMinor, received: s.buyerRefundMinor };
  }),
);

const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const eur = (minor: number) => money.format(minor / 100);
const pct = (minor: number) => `${((minor / priced.value.totalMinor) * 100).toFixed(1)} %`;

const active = ref<string | null>(null);
</script>

<template>
  <figure
    class="ds-panel bars"
    :aria-label="`Where a ${eur(priced.totalMinor)} card payment ends up`"
  >
    <div class="ds-panel__bar">
      Where {{ eur(priced.totalMinor) }} ends up
      <small>computed by settleSplit()</small>
    </div>

    <div class="ds-panel__body">
      <ul class="legend" aria-hidden="true">
        <li v-for="part in PARTS" :key="part.key">
          <i :class="`sw sw--${part.key}`" />{{ part.name }}
        </li>
      </ul>

      <div v-for="row in rows" :key="row.label" class="row">
        <div class="row__head">
          <b>{{ row.label }}</b>
          <span>{{ row.note }}</span>
        </div>
        <div class="bar" role="list" :aria-label="row.label">
          <template v-for="part in PARTS" :key="part.key">
            <div
              v-if="row.amounts[part.key] > 0"
              role="listitem"
              tabindex="0"
              :class="[
                'seg',
                `sw--${part.key}`,
                { 'is-active': active === `${row.label}:${part.key}` },
              ]"
              :style="{ flexGrow: row.amounts[part.key] }"
              :aria-label="`${part.name}: ${eur(row.amounts[part.key])}, ${pct(row.amounts[part.key])}`"
              @mouseenter="active = `${row.label}:${part.key}`"
              @mouseleave="active = null"
              @focus="active = `${row.label}:${part.key}`"
              @blur="active = null"
            >
              <span class="seg__value">{{ eur(row.amounts[part.key]) }}</span>
              <span class="seg__tip" role="tooltip">
                <b>{{ part.name }}</b>
                {{ eur(row.amounts[part.key]) }} · {{ pct(row.amounts[part.key]) }}
              </span>
            </div>
          </template>
        </div>
        <p v-if="row.topUp" class="row__topup">
          + {{ eur(row.topUp) }} returned by DacitySwap from its own funds, so the buyer receives
          {{ eur(row.received) }}.
        </p>
      </div>

      <details class="table">
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th>Outcome</th>
              <th v-for="part in PARTS" :key="part.key">{{ part.name }}</th>
              <th>Paid by DacitySwap</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.label">
              <td>{{ row.label }}</td>
              <td v-for="part in PARTS" :key="part.key" class="ds-num">
                {{ eur(row.amounts[part.key]) }}
              </td>
              <td class="ds-num">{{ eur(row.topUp) }}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  </figure>
</template>

<style scoped>
/* Categorical slots 1–4 of the reference palette, validated for both surfaces. */
.bars {
  --s-buyer: #2a78d6;
  --s-seller: #eb6834;
  --s-platform: #1baf7a;
  --s-rail: #eda100;
  --on-buyer: #ffffff;
  --on-seller: #0b0b0b;
  --on-platform: #0b0b0b;
  --on-rail: #0b0b0b;
}

:global(.dark) .bars {
  --s-buyer: #3987e5;
  --s-seller: #d95926;
  --s-platform: #199e70;
  --s-rail: #c98500;
  --on-buyer: #ffffff;
  --on-seller: #ffffff;
  --on-platform: #0b0b0b;
  --on-rail: #0b0b0b;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.3rem;
  margin: 0 0 1.1rem;
  padding: 0;
  list-style: none;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}

.legend li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
}

.sw {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.sw--buyer {
  background: var(--s-buyer);
  color: var(--on-buyer);
}

.sw--seller {
  background: var(--s-seller);
  color: var(--on-seller);
}

.sw--platform {
  background: var(--s-platform);
  color: var(--on-platform);
}

.sw--rail {
  background: var(--s-rail);
  color: var(--on-rail);
}

.row + .row {
  margin-top: 1.1rem;
}

.row__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.8rem;
  margin-bottom: 0.4rem;
  font-size: 0.88rem;
}

.row__head span {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.bar {
  display: flex;
  gap: 2px;
  height: 28px;
  container-type: inline-size;
}

.seg {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 3px;
  padding: 0 8px;
  border-radius: 4px;
  outline-offset: 2px;
  cursor: default;
  container-type: inline-size;
}

.seg__value {
  overflow: visible;
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
}

/* A part too narrow for its amount prints none: the tooltip, the legend and the table carry it. */
@container (max-width: 72px) {
  .seg__value {
    visibility: hidden;
  }
}

.seg__tip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 5;
  display: none;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font-size: 0.78rem;
  white-space: nowrap;
  transform: translateX(-50%);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
}

.seg__tip b {
  display: block;
  font-weight: 600;
}

.seg.is-active .seg__tip,
.seg:focus-visible .seg__tip {
  display: block;
}

.row__topup {
  margin: 0.45rem 0 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.table {
  margin-top: 1.2rem;
  font-size: 0.84rem;
}

.table summary {
  cursor: pointer;
  color: var(--vp-c-brand-1);
}

.table table {
  margin-top: 0.8rem;
}
</style>
