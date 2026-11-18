/**
 * Escrow state machine.
 *
 * A trade can only move along the edges declared in `TRANSITIONS`. Everything here is pure:
 * `applyEvent` returns a new record and never mutates its input, which makes every order an
 * append-only audit log that anyone can replay with `verifyRecord`.
 *
 *   awaiting_payment ──► funded ──► in_delivery ──► delivered ──► completed
 *          │               │             │              │
 *          ▼               ▼             ▼              ▼
 *      cancelled        refunded ◄──────────────── disputed ──► completed | refunded | split
 *
 * Every state that holds money has a deadline. When it passes, the party that was kept
 * waiting gets the money without having to ask anyone: an order nobody accepts or delivers is
 * refunded, a delivery nobody contests is paid out, and a dispute nobody rules on is refunded.
 *
 * The on-chain counterpart lives in `packages/contracts/src/DacityEscrow.sol`.
 */
import type { Quote } from './fees';

export const ESCROW_STATES = [
  'awaiting_payment',
  'funded',
  'in_delivery',
  'delivered',
  'completed',
  'disputed',
  'refunded',
  'split',
  'cancelled',
] as const;
export type EscrowState = (typeof ESCROW_STATES)[number];

/** The states a healthy trade passes through, in order. */
export const HAPPY_PATH = [
  'awaiting_payment',
  'funded',
  'in_delivery',
  'delivered',
  'completed',
] as const satisfies readonly EscrowState[];

export type Party = 'buyer' | 'seller';

/** Who can send an event. `system` is the platform acting on a payment result or a deadline. */
export type Actor = Party | 'arbiter' | 'system';

export type EscrowEvent =
  | { readonly type: 'PAYMENT_CAPTURED'; readonly paymentRef: string }
  | { readonly type: 'PAYMENT_FAILED'; readonly reason: string }
  | { readonly type: 'PAYMENT_EXPIRED' }
  | { readonly type: 'SELLER_ACCEPTED' }
  | { readonly type: 'ACCEPTANCE_EXPIRED' }
  | { readonly type: 'SELLER_MARKED_DELIVERED'; readonly proofRef?: string }
  | { readonly type: 'DELIVERY_EXPIRED' }
  | { readonly type: 'BUYER_CONFIRMED' }
  | { readonly type: 'AUTO_RELEASED' }
  | { readonly type: 'DISPUTE_OPENED'; readonly by: Party; readonly reason: string }
  | { readonly type: 'DISPUTE_RESOLVED'; readonly outcome: 'release' | 'refund' }
  | {
      readonly type: 'DISPUTE_RESOLVED';
      readonly outcome: 'split';
      /** The buyer's share of the price, in basis points: 1 to 9999. */
      readonly buyerShareBps: number;
    }
  | { readonly type: 'DISPUTE_EXPIRED' }
  | { readonly type: 'CANCELLED'; readonly by: Party };

export type EscrowEventType = EscrowEvent['type'];

/** Events that only a passed deadline can cause. */
export const TIMEOUT_EVENTS = [
  'PAYMENT_EXPIRED',
  'ACCEPTANCE_EXPIRED',
  'DELIVERY_EXPIRED',
  'AUTO_RELEASED',
  'DISPUTE_EXPIRED',
] as const satisfies readonly EscrowEventType[];
export type TimeoutEventType = (typeof TIMEOUT_EVENTS)[number];

type Target = EscrowState | ((event: EscrowEvent) => EscrowState);

const TRANSITIONS: Readonly<Record<EscrowState, Partial<Record<EscrowEventType, Target>>>> = {
  awaiting_payment: {
    PAYMENT_CAPTURED: 'funded',
    PAYMENT_FAILED: 'cancelled',
    PAYMENT_EXPIRED: 'cancelled',
    CANCELLED: 'cancelled',
  },
  funded: {
    SELLER_ACCEPTED: 'in_delivery',
    ACCEPTANCE_EXPIRED: 'refunded',
    // Money is already held, so cancelling means giving it back. There is nothing to dispute
    // yet: until the seller accepts, either side can simply walk away.
    CANCELLED: 'refunded',
  },
  in_delivery: {
    SELLER_MARKED_DELIVERED: 'delivered',
    DELIVERY_EXPIRED: 'refunded',
    // Only the seller can back out once they have accepted: see `GUARDS`.
    CANCELLED: 'refunded',
    DISPUTE_OPENED: 'disputed',
  },
  delivered: {
    BUYER_CONFIRMED: 'completed',
    AUTO_RELEASED: 'completed',
    CANCELLED: 'refunded',
    DISPUTE_OPENED: 'disputed',
  },
  disputed: {
    DISPUTE_RESOLVED: (event) => {
      if (event.type !== 'DISPUTE_RESOLVED') return 'disputed';
      if (event.outcome === 'refund') return 'refunded';
      return event.outcome === 'split' ? 'split' : 'completed';
    },
    // An arbiter who never rules must not be able to hold the buyer's money for ever.
    DISPUTE_EXPIRED: 'refunded',
  },
  completed: {},
  refunded: {},
  split: {},
  cancelled: {},
};

/** Who may send each event. Checked by `applyEventAs`. */
export const EVENT_ACTORS: Readonly<Record<EscrowEventType, readonly Actor[]>> = {
  PAYMENT_CAPTURED: ['system'],
  PAYMENT_FAILED: ['system'],
  PAYMENT_EXPIRED: ['system'],
  SELLER_ACCEPTED: ['seller'],
  ACCEPTANCE_EXPIRED: ['system'],
  SELLER_MARKED_DELIVERED: ['seller'],
  DELIVERY_EXPIRED: ['system'],
  BUYER_CONFIRMED: ['buyer'],
  AUTO_RELEASED: ['system'],
  DISPUTE_OPENED: ['buyer', 'seller'],
  DISPUTE_RESOLVED: ['arbiter'],
  DISPUTE_EXPIRED: ['system'],
  CANCELLED: ['buyer', 'seller'],
};

/** The deadline each waiting state runs on, and the event that fires when it passes. */
const TIMEOUTS: Readonly<
  Partial<
    Record<EscrowState, { readonly event: TimeoutEventType; readonly window: keyof EscrowPolicy }>
  >
> = {
  awaiting_payment: { event: 'PAYMENT_EXPIRED', window: 'paymentWindowMs' },
  funded: { event: 'ACCEPTANCE_EXPIRED', window: 'acceptanceWindowMs' },
  in_delivery: { event: 'DELIVERY_EXPIRED', window: 'deliveryWindowMs' },
  delivered: { event: 'AUTO_RELEASED', window: 'autoReleaseWindowMs' },
  disputed: { event: 'DISPUTE_EXPIRED', window: 'disputeWindowMs' },
};

export class InvalidTransitionError extends Error {
  constructor(
    readonly state: EscrowState,
    readonly eventType: EscrowEventType,
    detail?: string,
  ) {
    super(
      `Cannot apply ${eventType} to an escrow in state "${state}"${detail ? `: ${detail}` : ''}`,
    );
    this.name = 'InvalidTransitionError';
  }
}

export class UnauthorizedActorError extends Error {
  constructor(
    readonly actor: Actor,
    readonly eventType: EscrowEventType,
    detail?: string,
  ) {
    super(`A ${actor} cannot send ${eventType}${detail ? `: ${detail}` : ''}`);
    this.name = 'UnauthorizedActorError';
  }
}

export function canApply(state: EscrowState, eventType: EscrowEventType): boolean {
  return eventType in TRANSITIONS[state];
}

export function availableEvents(state: EscrowState): EscrowEventType[] {
  return Object.keys(TRANSITIONS[state]) as EscrowEventType[];
}

/** The events `actor` may send while the escrow is in `state`. Drives what a UI offers. */
export function availableActions(state: EscrowState, actor: Actor): EscrowEventType[] {
  return availableEvents(state).filter((type) => {
    if (!EVENT_ACTORS[type].includes(actor)) return false;
    // Once the seller has accepted, the buyer can no longer simply walk away.
    return !(
      type === 'CANCELLED' &&
      actor === 'buyer' &&
      state !== 'awaiting_payment' &&
      state !== 'funded'
    );
  });
}

export function isTerminal(state: EscrowState): boolean {
  return availableEvents(state).length === 0;
}

/** Where the money is while the escrow sits in a given state. */
export function fundsLocation(state: EscrowState): 'buyer' | 'escrow' | 'seller' | 'split' {
  switch (state) {
    case 'awaiting_payment':
    case 'cancelled':
    case 'refunded':
      return 'buyer';
    case 'completed':
      return 'seller';
    case 'split':
      return 'split';
    default:
      return 'escrow';
  }
}

/** The state an event leads to, by the table alone. Deadlines and roles are `applyEvent`'s job. */
export function transition(state: EscrowState, event: EscrowEvent): EscrowState {
  const target = TRANSITIONS[state][event.type];
  if (target === undefined) throw new InvalidTransitionError(state, event.type);
  return typeof target === 'function' ? target(event) : target;
}

export interface EscrowTransition {
  readonly from: EscrowState;
  readonly to: EscrowState;
  readonly event: EscrowEvent;
  /** ISO-8601 timestamp. */
  readonly at: string;
  /** Who sent the event, when it was applied through `applyEventAs`. */
  readonly actor?: Actor;
}

export interface EscrowRecord {
  readonly id: string;
  readonly state: EscrowState;
  readonly quote: Quote;
  readonly createdAt: string;
  /** When the current state times out, or null once the trade is final. */
  readonly deadlineAt: string | null;
  /** The deadline while the escrow is `delivered`: when the seller is paid if the buyer stays silent. */
  readonly autoReleaseAt: string | null;
  readonly history: readonly EscrowTransition[];
}

export interface EscrowPolicy {
  /** How long the buyer has to pay before the order lapses. */
  readonly paymentWindowMs: number;
  /** How long the seller has to accept a paid order before the buyer is refunded. */
  readonly acceptanceWindowMs: number;
  /** How long the seller has to deliver after accepting before the buyer is refunded. */
  readonly deliveryWindowMs: number;
  /** How long the buyer has to confirm or dispute after delivery before the seller is paid. */
  readonly autoReleaseWindowMs: number;
  /** How long the arbiter has to rule before a dispute is settled in the buyer's favour. */
  readonly disputeWindowMs: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const DEFAULT_ESCROW_POLICY: EscrowPolicy = Object.freeze({
  paymentWindowMs: 30 * MINUTE,
  acceptanceWindowMs: 12 * HOUR,
  deliveryWindowMs: DAY,
  autoReleaseWindowMs: DAY,
  disputeWindowMs: 14 * DAY,
});

function resolvePolicy(policy: Partial<EscrowPolicy>): EscrowPolicy {
  const resolved = { ...DEFAULT_ESCROW_POLICY, ...policy };
  for (const [name, value] of Object.entries(resolved)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive whole number of milliseconds, got ${value}`);
    }
  }
  return resolved;
}

function deadlineFor(state: EscrowState, now: Date, policy: EscrowPolicy): string | null {
  const timeout = TIMEOUTS[state];
  return timeout ? new Date(now.getTime() + policy[timeout.window]).toISOString() : null;
}

export function createEscrow(input: {
  id: string;
  quote: Quote;
  now: Date;
  policy?: Partial<EscrowPolicy>;
}): EscrowRecord {
  return {
    id: input.id,
    state: 'awaiting_payment',
    quote: input.quote,
    createdAt: input.now.toISOString(),
    deadlineAt: deadlineFor('awaiting_payment', input.now, resolvePolicy(input.policy ?? {})),
    autoReleaseAt: null,
    history: [],
  };
}

/** The deadline the escrow is running on and the event that will fire, or null if it is final. */
export function nextDeadline(
  record: EscrowRecord,
): { readonly at: string; readonly event: TimeoutEventType } | null {
  const timeout = TIMEOUTS[record.state];
  return timeout && record.deadlineAt ? { at: record.deadlineAt, event: timeout.event } : null;
}

/** The timeout event that is due at `now`, or null. A scheduler calls this, then `applyEvent`. */
export function dueTimeout(record: EscrowRecord, now: Date): EscrowEvent | null {
  const deadline = nextDeadline(record);
  return deadline && now.getTime() >= Date.parse(deadline.at) ? { type: deadline.event } : null;
}

/** The rules the transition table cannot express: time, and who is cancelling. */
function guard(record: EscrowRecord, event: EscrowEvent, now: Date): void {
  const refuse = (detail: string) => new InvalidTransitionError(record.state, event.type, detail);
  const deadline = record.deadlineAt === null ? null : Date.parse(record.deadlineAt);
  const overdue = deadline !== null && now.getTime() >= deadline;

  if ((TIMEOUT_EVENTS as readonly EscrowEventType[]).includes(event.type)) {
    if (!overdue) {
      throw refuse(
        event.type === 'AUTO_RELEASED'
          ? 'the buyer confirmation window is still open'
          : 'the deadline has not passed',
      );
    }
    return;
  }

  if (event.type === 'CANCELLED' && event.by === 'buyer') {
    if (record.state === 'in_delivery' || record.state === 'delivered') {
      throw refuse('the seller has accepted; the buyer can open a dispute instead');
    }
  }

  if (event.type === 'DISPUTE_OPENED' && event.by === 'buyer') {
    if (record.state === 'delivered' && overdue) {
      throw refuse('the buyer confirmation window has closed');
    }
  }

  if (event.type === 'DISPUTE_RESOLVED' && event.outcome === 'split') {
    const share = event.buyerShareBps;
    if (!Number.isInteger(share) || share < 1 || share > 9_999) {
      throw refuse(`buyerShareBps must be an integer from 1 to 9999, got ${share}`);
    }
  }
}

/**
 * Applies an event and returns the next record. Throws `InvalidTransitionError` when the state
 * machine, a deadline or a guard does not allow it. The input record is never changed.
 *
 * Use this from code that has already established who is acting (a payment webhook, a
 * scheduler). For a request made by a person, use `applyEventAs`.
 */
export function applyEvent(
  record: EscrowRecord,
  event: EscrowEvent,
  now: Date,
  policy: Partial<EscrowPolicy> = {},
  actor?: Actor,
): EscrowRecord {
  const to = transition(record.state, event);
  guard(record, event, now);
  const deadlineAt = deadlineFor(to, now, resolvePolicy(policy));

  return {
    ...record,
    state: to,
    deadlineAt,
    autoReleaseAt: to === 'delivered' ? deadlineAt : null,
    history: [
      ...record.history,
      {
        from: record.state,
        to,
        event,
        at: now.toISOString(),
        ...(actor === undefined ? {} : { actor }),
      },
    ],
  };
}

/**
 * Applies an event on behalf of `actor`, refusing it unless that role may send it. A buyer
 * cannot mark a delivery, a seller cannot confirm one, and nobody can rule on a dispute or
 * fire a deadline but the arbiter and the system.
 */
export function applyEventAs(
  record: EscrowRecord,
  event: EscrowEvent,
  actor: Actor,
  now: Date,
  policy: Partial<EscrowPolicy> = {},
): EscrowRecord {
  if (!EVENT_ACTORS[event.type].includes(actor)) {
    throw new UnauthorizedActorError(actor, event.type);
  }
  if ((event.type === 'DISPUTE_OPENED' || event.type === 'CANCELLED') && event.by !== actor) {
    throw new UnauthorizedActorError(
      actor,
      event.type,
      `the event says it comes from the ${event.by}`,
    );
  }
  return applyEvent(record, event, now, policy, actor);
}

/** Applies the timeout that is due at `now`, if there is one. Safe to call on a schedule. */
export function tick(
  record: EscrowRecord,
  now: Date,
  policy: Partial<EscrowPolicy> = {},
): EscrowRecord {
  const due = dueTimeout(record, now);
  return due ? applyEvent(record, due, now, policy, 'system') : record;
}

export type Verification =
  | { readonly valid: true }
  | { readonly valid: false; readonly index: number; readonly reason: string };

/**
 * Replays a record's history from the start and checks that it is a legal walk through the
 * state machine that ends in the state the record claims. It is how a buyer, a seller or an
 * auditor checks an order without trusting whoever stored it.
 */
export function verifyRecord(record: EscrowRecord): Verification {
  let state: EscrowState = 'awaiting_payment';
  let clock = Date.parse(record.createdAt);
  if (Number.isNaN(clock)) return { valid: false, index: -1, reason: 'createdAt is not a date' };

  for (const [index, step] of record.history.entries()) {
    const fail = (reason: string): Verification => ({ valid: false, index, reason });
    if (step.from !== state)
      return fail(`starts from "${step.from}" but the escrow was "${state}"`);

    let to: EscrowState;
    try {
      to = transition(state, step.event);
    } catch {
      return fail(`${step.event.type} is not allowed in "${state}"`);
    }
    if (step.to !== to) return fail(`${step.event.type} leads to "${to}", not "${step.to}"`);

    const at = Date.parse(step.at);
    if (Number.isNaN(at)) return fail('its timestamp is not a date');
    if (at < clock) return fail('it is dated before the step it follows');
    if (step.actor !== undefined && !EVENT_ACTORS[step.event.type].includes(step.actor)) {
      return fail(`a ${step.actor} cannot send ${step.event.type}`);
    }

    state = to;
    clock = at;
  }

  if (state !== record.state) {
    return {
      valid: false,
      index: record.history.length,
      reason: `the history ends in "${state}" but the record says "${record.state}"`,
    };
  }
  return { valid: true };
}
