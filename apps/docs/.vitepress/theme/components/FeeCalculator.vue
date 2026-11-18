<script setup lang="ts">
import {
  DEFAULT_FEE_SCHEDULE,
  quote,
  settleSplit,
  type PaymentMethod,
} from '@dacityswap/escrow-core';
import { computed, ref } from 'vue';

/**
 * Prices a trade with the published fee engine. Nothing here knows a rate or a rounding rule:
 * every number comes from `quote()` and `settleSplit()`.
 */
const price = ref(219);
const quantity = ref(1);
const method = ref<PaymentMethod>('card');
const share = ref(0);

const priced = computed(() => {
  const unit = Math.round(Number(price.value) * 100);
  const count = Math.floor(Number(quantity.value));
  if (!Number.isFinite(unit) || unit < 1 || unit > 1_000_000_00 || count < 1 || count > 999) {
    return null;
  }
  return quote({ unitPriceMinor: unit, quantity: count, currency: 'EUR', method: method.value });
});

const settlement = computed(() =>
  priced.value ? settleSplit(priced.value, Math.round(share.value * 100)) : null,
);

const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const eur = (minor: number) => money.format(minor / 100);
const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)} %`;

const rail = computed(() => DEFAULT_FEE_SCHEDULE.processing[method.value]);
const outcome = computed(() =>
  share.value === 0
    ? 'The trade completes'
    : share.value === 100
      ? 'The buyer is refunded'
      : `A dispute returns ${share.value} % to the buyer`,
);
</script>

<template>
  <div class="ds-panel">
    <div class="ds-panel__bar">
      Fee calculator
      <small>runs quote() from escrow-core</small>
    </div>
    <div class="ds-panel__body calc">
      <div class="inputs">
        <label>
          <span class="ds-label">Price per item (EUR)</span>
          <input
            v-model="price"
            class="ds-input"
            type="number"
            min="0.01"
            step="0.01"
            inputmode="decimal"
          />
        </label>
        <label>
          <span class="ds-label">Quantity</span>
          <input
            v-model="quantity"
            class="ds-input"
            type="number"
            min="1"
            max="999"
            step="1"
            inputmode="numeric"
          />
        </label>
        <div>
          <span class="ds-label">Paid by</span>
          <div class="toggle" role="group" aria-label="Payment method">
            <button
              v-for="option in ['card', 'crypto'] as const"
              :key="option"
              type="button"
              class="ds-btn"
              :class="{ 'ds-btn--primary': method === option }"
              :aria-pressed="method === option"
              @click="method = option"
            >
              {{ option === 'card' ? 'Card' : 'Crypto' }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="!priced" class="empty">Enter a price above zero and a quantity from 1 to 999.</p>

      <template v-else>
        <div class="columns">
          <dl>
            <dt class="ds-label">The buyer pays</dt>
            <div>
              <dt>Items</dt>
              <dd class="ds-num">{{ eur(priced.subtotalMinor) }}</dd>
            </div>
            <div>
              <dt>
                Service fee <i>{{ pct(DEFAULT_FEE_SCHEDULE.buyerServiceBps) }}</i>
              </dt>
              <dd class="ds-num">{{ eur(priced.buyerServiceFeeMinor) }}</dd>
            </div>
            <div>
              <dt>
                Processing
                <i
                  >{{ pct(rail.bps)
                  }}<template v-if="rail.fixedMinor"> + {{ eur(rail.fixedMinor) }}</template></i
                >
              </dt>
              <dd class="ds-num">{{ eur(priced.processingFeeMinor) }}</dd>
            </div>
            <div class="total">
              <dt>Total charged</dt>
              <dd class="ds-num">{{ eur(priced.totalMinor) }}</dd>
            </div>
          </dl>

          <dl>
            <dt class="ds-label">The seller receives</dt>
            <div>
              <dt>Items</dt>
              <dd class="ds-num">{{ eur(priced.subtotalMinor) }}</dd>
            </div>
            <div>
              <dt>
                Commission <i>{{ pct(DEFAULT_FEE_SCHEDULE.sellerCommissionBps) }}</i>
              </dt>
              <dd class="ds-num">− {{ eur(priced.sellerCommissionMinor) }}</dd>
            </div>
            <div class="spacer" aria-hidden="true">
              <dt>&nbsp;</dt>
              <dd>&nbsp;</dd>
            </div>
            <div class="total">
              <dt>Paid out on release</dt>
              <dd class="ds-num">{{ eur(priced.sellerPayoutMinor) }}</dd>
            </div>
          </dl>
        </div>

        <div v-if="settlement" class="outcome">
          <label>
            <span class="ds-label">How it ends: {{ outcome }}</span>
            <input
              v-model.number="share"
              type="range"
              min="0"
              max="100"
              step="5"
              aria-label="Share returned to the buyer, in percent"
            />
          </label>
          <ul>
            <li>
              <span>Back to the buyer</span
              ><b class="ds-num">{{ eur(settlement.buyerRefundMinor) }}</b>
            </li>
            <li>
              <span>To the seller</span
              ><b class="ds-num">{{ eur(settlement.sellerPayoutMinor) }}</b>
            </li>
            <li>
              <span>To DacitySwap</span
              ><b class="ds-num">{{ eur(settlement.platformRevenueMinor) }}</b>
            </li>
            <li>
              <span>To the payment rail</span
              ><b class="ds-num">{{ eur(settlement.processingFeeMinor) }}</b>
            </li>
            <li v-if="settlement.platformCostMinor" class="note">
              <span>Rail fee DacitySwap returns out of its own pocket</span>
              <b class="ds-num">{{ eur(settlement.platformCostMinor) }}</b>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.calc {
  display: grid;
  gap: 1.1rem;
}

.inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.9rem;
  align-items: end;
}

.toggle {
  display: flex;
  gap: 0.4rem;
}

.toggle .ds-btn {
  flex: 1;
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

dl {
  margin: 0;
}

dl > div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.3rem 0;
  font-size: 0.9rem;
}

dl dt,
dl dd {
  margin: 0;
}

dl i {
  margin-left: 0.3rem;
  font-style: normal;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

dl .total {
  margin-top: 0.3rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--vp-c-divider);
  font-weight: 650;
}

.outcome {
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
}

.outcome input[type='range'] {
  width: 100%;
  accent-color: var(--vp-c-brand-1);
}

.outcome ul {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.6rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}

.outcome li {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: 0;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}

.outcome li b {
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.outcome li.note {
  border-style: dashed;
}

.empty {
  margin: 0;
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
}
</style>
