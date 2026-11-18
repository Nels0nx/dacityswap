<script setup lang="ts">
import {
  applyEventAs,
  availableActions,
  createEscrow,
  fundsLocation,
  isTerminal,
  nextDeadline,
  quote,
  settle,
  tick,
  verifyRecord,
  type Actor,
  type EscrowEvent,
  type EscrowEventType,
  type EscrowRecord,
  type EscrowState,
} from '@dacityswap/escrow-core';
import { computed, ref, shallowRef } from 'vue';
import StateDiagram from './StateDiagram.vue';

/**
 * One order, driven by hand. Every button calls the published engine: the page holds no rules
 * of its own, so anything it lets you do is something the real escrow would let you do.
 */
const START = Date.parse('2026-11-19T18:00:00.000Z');
const STEP_MS = 5 * 60_000;

const fresh = (): EscrowRecord =>
  createEscrow({
    id: 'esc_8f2c41',
    quote: quote({ unitPriceMinor: 21_900, currency: 'EUR', method: 'card' }),
    now: new Date(START),
  });

const record = shallowRef<EscrowRecord>(fresh());
const clock = ref(START);
const error = ref('');
const splitShare = ref(40);
const tampered = ref(false);

const ROLES: { actor: Actor; title: string; hint: string }[] = [
  { actor: 'buyer', title: 'Buyer', hint: 'Paid for the item' },
  { actor: 'seller', title: 'Seller', hint: 'Delivers it in-game' },
  { actor: 'arbiter', title: 'Arbiter', hint: 'Rules on disputes' },
  { actor: 'system', title: 'System', hint: 'Payments and deadlines' },
];

const LABEL: Record<EscrowEventType, string> = {
  PAYMENT_CAPTURED: 'Payment captured',
  PAYMENT_FAILED: 'Payment failed',
  PAYMENT_EXPIRED: 'Payment window passed',
  SELLER_ACCEPTED: 'Accept the order',
  ACCEPTANCE_EXPIRED: 'Acceptance window passed',
  SELLER_MARKED_DELIVERED: 'Mark delivered',
  DELIVERY_EXPIRED: 'Delivery window passed',
  BUYER_CONFIRMED: 'Confirm and release',
  AUTO_RELEASED: 'Confirmation window passed',
  DISPUTE_OPENED: 'Open a dispute',
  DISPUTE_RESOLVED: 'Rule',
  DISPUTE_EXPIRED: 'Ruling window passed',
  CANCELLED: 'Cancel',
};

const FUNDS = {
  buyer: 'with the buyer',
  escrow: 'locked in escrow',
  seller: 'released to the seller',
  split: 'shared between buyer and seller',
} as const;

function build(type: EscrowEventType, actor: Actor): EscrowEvent | null {
  switch (type) {
    case 'PAYMENT_CAPTURED':
      return { type, paymentRef: 'pay_4242' };
    case 'PAYMENT_FAILED':
      return { type, reason: 'card_declined' };
    case 'DISPUTE_OPENED':
      return actor === 'buyer' || actor === 'seller'
        ? { type, by: actor, reason: 'Item not received' }
        : null;
    case 'CANCELLED':
      return actor === 'buyer' || actor === 'seller' ? { type, by: actor } : null;
    case 'DISPUTE_RESOLVED':
      return null; // The arbiter has three buttons of its own.
    default:
      return { type } as EscrowEvent;
  }
}

/** What each role can press right now. Deadlines are handled by one button, not five. */
const actions = computed(
  () =>
    Object.fromEntries(
      ROLES.map(({ actor }) => [
        actor,
        availableActions(record.value.state, actor).filter(
          (type) =>
            type !== 'DISPUTE_RESOLVED' && !type.endsWith('_EXPIRED') && type !== 'AUTO_RELEASED',
        ),
      ]),
    ) as Record<Actor, EscrowEventType[]>,
);

const deadline = computed(() => nextDeadline(record.value));
const canRule = computed(() => record.value.state === 'disputed');
const done = computed(() => isTerminal(record.value.state));
const settlement = computed(() => (tampered.value ? null : settle(record.value)));
const verification = computed(() => verifyRecord(record.value));
const visited = computed<EscrowState[]>(() => [
  'awaiting_payment',
  ...record.value.history.map((step) => step.to),
]);

function attempt(change: (now: Date) => EscrowRecord) {
  error.value = '';
  try {
    const now = new Date(clock.value + STEP_MS);
    record.value = change(now);
    clock.value = now.getTime();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : String(reason);
  }
}

function send(type: EscrowEventType, actor: Actor) {
  const event = build(type, actor);
  if (event) attempt((now) => applyEventAs(record.value, event, actor, now));
}

function rule(outcome: 'release' | 'refund' | 'split') {
  const event: EscrowEvent =
    outcome === 'split'
      ? { type: 'DISPUTE_RESOLVED', outcome, buyerShareBps: Math.round(splitShare.value * 100) }
      : { type: 'DISPUTE_RESOLVED', outcome };
  attempt((now) => applyEventAs(record.value, event, 'arbiter', now));
}

/** Moves the clock to the deadline and lets the engine fire whatever is due. */
function passDeadline() {
  if (!deadline.value) return;
  error.value = '';
  clock.value = Date.parse(deadline.value.at);
  record.value = tick(record.value, new Date(clock.value));
}

/** Rewrites the stored state without a matching event, the way a dishonest database could. */
function tamper() {
  tampered.value = true;
  record.value = { ...record.value, state: 'completed', deadlineAt: null, autoReleaseAt: null };
}

function reset() {
  record.value = fresh();
  clock.value = START;
  error.value = '';
  tampered.value = false;
}

const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const eur = (minor: number) => money.format(minor / 100);
const stamp = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
const at = (iso: string | number) => stamp.format(new Date(iso));

function wait(iso: string) {
  const minutes = Math.max(0, Math.round((Date.parse(iso) - clock.value) / 60_000));
  if (minutes >= 48 * 60) return `${Math.round(minutes / 1_440)} days`;
  if (minutes >= 120) return `${Math.round(minutes / 60)} hours`;
  return `${minutes} minutes`;
}
</script>

<template>
  <div class="ds-panel sim">
    <div class="ds-panel__bar">
      Live order
      <small>{{ at(clock) }} UTC · your clock</small>
    </div>

    <div class="ds-panel__body">
      <StateDiagram :current="record.state" :visited="visited" />

      <div class="facts">
        <div>
          <span class="ds-label">State</span>
          <code>{{ record.state }}</code>
        </div>
        <div>
          <span class="ds-label">The {{ eur(record.quote.totalMinor) }} is</span>
          <span>{{
            record.state === 'awaiting_payment'
              ? 'not charged yet'
              : FUNDS[fundsLocation(record.state)]
          }}</span>
        </div>
        <div>
          <span class="ds-label">Deadline</span>
          <span v-if="deadline"
            >in {{ wait(deadline.at) }} → <code>{{ deadline.event }}</code></span
          >
          <span v-else>none: the trade is final</span>
        </div>
        <div>
          <span class="ds-label">History check</span>
          <span v-if="verification.valid" class="ok">verifyRecord() passes</span>
          <span v-else class="bad"
            >fails at step {{ verification.index + 1 }}: {{ verification.reason }}</span
          >
        </div>
      </div>

      <div class="roles">
        <section v-for="role in ROLES" :key="role.actor">
          <h4>
            {{ role.title }} <span>{{ role.hint }}</span>
          </h4>

          <button
            v-for="type in actions[role.actor]"
            :key="type"
            type="button"
            class="ds-btn"
            :class="{
              'ds-btn--primary': type === 'BUYER_CONFIRMED' || type === 'PAYMENT_CAPTURED',
            }"
            :disabled="tampered"
            @click="send(type, role.actor)"
          >
            {{ LABEL[type] }}
          </button>

          <template v-if="role.actor === 'arbiter' && canRule">
            <button type="button" class="ds-btn" :disabled="tampered" @click="rule('release')">
              Release to the seller
            </button>
            <button type="button" class="ds-btn" :disabled="tampered" @click="rule('refund')">
              Refund the buyer
            </button>
            <div class="split">
              <button type="button" class="ds-btn" :disabled="tampered" @click="rule('split')">
                Split: {{ splitShare }} % back
              </button>
              <input
                v-model.number="splitShare"
                type="range"
                min="5"
                max="95"
                step="5"
                aria-label="Buyer's share in percent"
              />
            </div>
          </template>

          <button
            v-if="role.actor === 'system' && deadline"
            type="button"
            class="ds-btn"
            :disabled="tampered"
            @click="passDeadline"
          >
            Let the deadline pass
          </button>

          <p
            v-if="
              actions[role.actor].length === 0 &&
              !(role.actor === 'arbiter' && canRule) &&
              !(role.actor === 'system' && deadline)
            "
            class="idle"
          >
            Nothing to do
          </p>
        </section>
      </div>

      <p v-if="error" class="refused" role="alert">Refused by the engine: {{ error }}</p>

      <div v-if="settlement" class="settlement">
        <span class="ds-label">Settlement</span>
        <ul>
          <li>
            <span>Buyer</span><b class="ds-num">{{ eur(settlement.buyerRefundMinor) }}</b>
          </li>
          <li>
            <span>Seller</span><b class="ds-num">{{ eur(settlement.sellerPayoutMinor) }}</b>
          </li>
          <li>
            <span>DacitySwap</span><b class="ds-num">{{ eur(settlement.platformRevenueMinor) }}</b>
          </li>
          <li>
            <span>Payment rail</span><b class="ds-num">{{ eur(settlement.processingFeeMinor) }}</b>
          </li>
        </ul>
      </div>

      <div class="log">
        <span class="ds-label">Audit trail</span>
        <ol>
          <li>
            <time>{{ at(record.createdAt) }}</time>
            <span>Order created</span>
            <code>awaiting_payment</code>
          </li>
          <li v-for="(step, index) in record.history" :key="index">
            <time>{{ at(step.at) }}</time>
            <span>
              <b>{{ step.actor ?? 'system' }}</b> · {{ step.event.type }}
              <template v-if="step.event.type === 'DISPUTE_RESOLVED'">
                ({{ step.event.outcome }})</template
              >
            </span>
            <code>{{ step.from }} → {{ step.to }}</code>
          </li>
        </ol>
      </div>

      <div class="foot">
        <button type="button" class="ds-btn" @click="reset">Start over</button>
        <button type="button" class="ds-btn" :disabled="tampered || done" @click="tamper">
          Tamper with the stored state
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.9rem 1.2rem;
  padding: 0.9rem 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.88rem;
}

.ok {
  color: var(--vp-c-brand-1);
}

.bad {
  color: #ff7a8a;
}

.roles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
  margin-top: 1rem;
}

@media (max-width: 760px) {
  .roles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.roles section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg);
}

.roles h4 {
  margin: 0 0 0.2rem;
  font-size: 0.9rem;
  font-weight: 700;
}

.roles h4 span {
  display: block;
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.roles .ds-btn {
  width: 100%;
  padding: 0.42rem 0.55rem;
  font-size: 0.78rem;
  line-height: 1.25;
  text-align: left;
}

.split {
  display: grid;
  gap: 0.3rem;
}

.split input {
  width: 100%;
  accent-color: var(--vp-c-brand-1);
}

.idle {
  margin: 0;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.refused {
  margin: 1rem 0 0;
  padding: 0.6rem 0.8rem;
  border: 1px solid rgb(255 122 138 / 0.4);
  border-radius: 3px;
  background: rgb(255 122 138 / 0.08);
  font-size: 0.84rem;
}

.settlement,
.log {
  margin-top: 1.1rem;
}

.settlement ul {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.settlement li {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}

.settlement li b {
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.log ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.log li {
  display: grid;
  grid-template-columns: 7.2rem 1fr auto;
  gap: 0.8rem;
  align-items: baseline;
  margin: 0;
  padding: 0.32rem 0 0.32rem 0.8rem;
  border-left: 1px solid var(--vp-c-border);
  font-size: 0.8rem;
}

.log time {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
}

.log code {
  font-size: 0.7rem;
}

.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.1rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--vp-c-divider);
}

@media (max-width: 560px) {
  .log li {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
}
</style>
