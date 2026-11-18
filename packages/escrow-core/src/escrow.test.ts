import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ESCROW_POLICY,
  ESCROW_STATES,
  EVENT_ACTORS,
  HAPPY_PATH,
  InvalidTransitionError,
  TIMEOUT_EVENTS,
  UnauthorizedActorError,
  applyEvent,
  applyEventAs,
  availableActions,
  availableEvents,
  canApply,
  createEscrow,
  dueTimeout,
  fundsLocation,
  isTerminal,
  nextDeadline,
  tick,
  transition,
  verifyRecord,
  type Actor,
  type EscrowEvent,
  type EscrowRecord,
} from './escrow';
import { quote } from './fees';

const t0 = new Date('2026-11-17T12:00:00.000Z');
const minutes = (n: number) => new Date(t0.getTime() + n * 60_000);

function funded(): EscrowRecord {
  const escrow = createEscrow({
    id: 'esc_test',
    quote: quote({ unitPriceMinor: 2_500, currency: 'EUR', method: 'card' }),
    now: t0,
  });
  return applyEvent(escrow, { type: 'PAYMENT_CAPTURED', paymentRef: 'pay_1' }, minutes(1));
}

function accepted(): EscrowRecord {
  return applyEvent(funded(), { type: 'SELLER_ACCEPTED' }, minutes(2));
}

function disputed(): EscrowRecord {
  return applyEvent(
    delivered(),
    { type: 'DISPUTE_OPENED', by: 'buyer', reason: 'Not received' },
    minutes(20),
  );
}

const EVERY_EVENT: EscrowEvent[] = [
  { type: 'PAYMENT_CAPTURED', paymentRef: 'x' },
  { type: 'PAYMENT_FAILED', reason: 'x' },
  { type: 'PAYMENT_EXPIRED' },
  { type: 'SELLER_ACCEPTED' },
  { type: 'ACCEPTANCE_EXPIRED' },
  { type: 'SELLER_MARKED_DELIVERED' },
  { type: 'DELIVERY_EXPIRED' },
  { type: 'BUYER_CONFIRMED' },
  { type: 'AUTO_RELEASED' },
  { type: 'DISPUTE_OPENED', by: 'buyer', reason: 'x' },
  { type: 'DISPUTE_RESOLVED', outcome: 'refund' },
  { type: 'DISPUTE_RESOLVED', outcome: 'split', buyerShareBps: 5_000 },
  { type: 'DISPUTE_EXPIRED' },
  { type: 'CANCELLED', by: 'buyer' },
];

function delivered(): EscrowRecord {
  const accepted = applyEvent(funded(), { type: 'SELLER_ACCEPTED' }, minutes(2));
  return applyEvent(accepted, { type: 'SELLER_MARKED_DELIVERED' }, minutes(10));
}

describe('escrow state machine', () => {
  it('walks the happy path', () => {
    const done = applyEvent(delivered(), { type: 'BUYER_CONFIRMED' }, minutes(12));
    expect(done.state).toBe('completed');
    expect(['awaiting_payment', ...done.history.map((step) => step.to)]).toEqual([...HAPPY_PATH]);
  });

  it('never mutates the record it is given', () => {
    const before = funded();
    const snapshot = JSON.parse(JSON.stringify(before)) as EscrowRecord;
    applyEvent(before, { type: 'SELLER_ACCEPTED' }, minutes(5));
    expect(before).toEqual(snapshot);
  });

  it('records an append-only audit trail', () => {
    const escrow = delivered();
    expect(escrow.history).toHaveLength(3);
    expect(escrow.history[0]).toMatchObject({
      from: 'awaiting_payment',
      to: 'funded',
      at: minutes(1).toISOString(),
    });
  });

  it('cancels for free before payment and refunds after it', () => {
    const unpaid = createEscrow({
      id: 'esc_unpaid',
      quote: quote({ unitPriceMinor: 100, currency: 'EUR', method: 'crypto' }),
      now: t0,
    });
    expect(applyEvent(unpaid, { type: 'CANCELLED', by: 'buyer' }, minutes(1)).state).toBe(
      'cancelled',
    );
    expect(applyEvent(funded(), { type: 'CANCELLED', by: 'seller' }, minutes(3)).state).toBe(
      'refunded',
    );
  });

  it('cancels when the payment fails', () => {
    const unpaid = createEscrow({
      id: 'esc_fail',
      quote: quote({ unitPriceMinor: 100, currency: 'EUR', method: 'card' }),
      now: t0,
    });
    const failed = applyEvent(unpaid, { type: 'PAYMENT_FAILED', reason: 'declined' }, minutes(1));
    expect(failed.state).toBe('cancelled');
  });

  it('never releases funds without delivery', () => {
    expect(() => applyEvent(funded(), { type: 'BUYER_CONFIRMED' }, minutes(2))).toThrow(
      InvalidTransitionError,
    );
    expect(() => applyEvent(funded(), { type: 'AUTO_RELEASED' }, minutes(9_999))).toThrow(
      InvalidTransitionError,
    );
  });

  it('opens the confirmation window on delivery and enforces it', () => {
    const escrow = delivered();
    expect(escrow.autoReleaseAt).toBe(minutes(10 + 24 * 60).toISOString());

    expect(() => applyEvent(escrow, { type: 'AUTO_RELEASED' }, minutes(60))).toThrow(
      /confirmation window/,
    );
    const released = applyEvent(escrow, { type: 'AUTO_RELEASED' }, minutes(10 + 24 * 60));
    expect(released.state).toBe('completed');
    expect(released.autoReleaseAt).toBeNull();
  });

  it('respects a custom confirmation window', () => {
    const accepted = applyEvent(funded(), { type: 'SELLER_ACCEPTED' }, minutes(2));
    const escrow = applyEvent(accepted, { type: 'SELLER_MARKED_DELIVERED' }, minutes(10), {
      autoReleaseWindowMs: 60_000,
    });
    expect(applyEvent(escrow, { type: 'AUTO_RELEASED' }, minutes(11)).state).toBe('completed');
  });

  it('freezes the auto-release clock while a dispute is open', () => {
    const disputed = applyEvent(
      delivered(),
      { type: 'DISPUTE_OPENED', by: 'buyer', reason: 'Not received' },
      minutes(20),
    );
    expect(disputed.state).toBe('disputed');
    expect(disputed.autoReleaseAt).toBeNull();
    expect(() => applyEvent(disputed, { type: 'AUTO_RELEASED' }, minutes(99_999))).toThrow(
      InvalidTransitionError,
    );
  });

  it('resolves a dispute either way', () => {
    const disputed = applyEvent(
      delivered(),
      { type: 'DISPUTE_OPENED', by: 'buyer', reason: 'Wrong item' },
      minutes(20),
    );
    expect(
      applyEvent(disputed, { type: 'DISPUTE_RESOLVED', outcome: 'refund' }, minutes(30)).state,
    ).toBe('refunded');
    expect(
      applyEvent(disputed, { type: 'DISPUTE_RESOLVED', outcome: 'release' }, minutes(30)).state,
    ).toBe('completed');
  });

  it('treats completed, refunded, split and cancelled as final', () => {
    for (const state of ['completed', 'refunded', 'split', 'cancelled'] as const) {
      expect(isTerminal(state)).toBe(true);
      for (const event of EVERY_EVENT) {
        expect(() => transition(state, event)).toThrow(InvalidTransitionError);
      }
    }
  });

  it('keeps canApply and availableEvents consistent with transition', () => {
    for (const state of ESCROW_STATES) {
      for (const type of availableEvents(state)) expect(canApply(state, type)).toBe(true);
    }
    expect(canApply('funded', 'BUYER_CONFIRMED')).toBe(false);
  });

  it('knows where the money is in every state', () => {
    expect(fundsLocation('awaiting_payment')).toBe('buyer');
    expect(fundsLocation('funded')).toBe('escrow');
    expect(fundsLocation('disputed')).toBe('escrow');
    expect(fundsLocation('completed')).toBe('seller');
    expect(fundsLocation('refunded')).toBe('buyer');
    expect(fundsLocation('split')).toBe('split');
  });
});

describe('deadlines', () => {
  const { paymentWindowMs, acceptanceWindowMs, deliveryWindowMs, disputeWindowMs } =
    DEFAULT_ESCROW_POLICY;
  const after = (record: EscrowRecord, ms = 0) => new Date(Date.parse(record.deadlineAt!) + ms);

  it('gives every state that waits a deadline, and no final state one', () => {
    const unpaid = createEscrow({
      id: 'esc_new',
      quote: quote({ unitPriceMinor: 100, currency: 'EUR', method: 'card' }),
      now: t0,
    });
    expect(unpaid.deadlineAt).toBe(new Date(t0.getTime() + paymentWindowMs).toISOString());
    expect(funded().deadlineAt).toBe(
      new Date(minutes(1).getTime() + acceptanceWindowMs).toISOString(),
    );
    expect(accepted().deadlineAt).toBe(
      new Date(minutes(2).getTime() + deliveryWindowMs).toISOString(),
    );
    expect(disputed().deadlineAt).toBe(
      new Date(minutes(20).getTime() + disputeWindowMs).toISOString(),
    );
    expect(nextDeadline(delivered())).toEqual({
      at: delivered().autoReleaseAt,
      event: 'AUTO_RELEASED',
    });

    const done = applyEvent(delivered(), { type: 'BUYER_CONFIRMED' }, minutes(12));
    expect(done.deadlineAt).toBeNull();
    expect(nextDeadline(done)).toBeNull();
  });

  it('refuses a timeout before its deadline and allows it from the deadline on', () => {
    const cases: [EscrowRecord, EscrowEvent, string][] = [
      [funded(), { type: 'ACCEPTANCE_EXPIRED' }, 'refunded'],
      [accepted(), { type: 'DELIVERY_EXPIRED' }, 'refunded'],
      [delivered(), { type: 'AUTO_RELEASED' }, 'completed'],
      [disputed(), { type: 'DISPUTE_EXPIRED' }, 'refunded'],
    ];
    for (const [record, event, outcome] of cases) {
      expect(() => applyEvent(record, event, after(record, -1))).toThrow(InvalidTransitionError);
      expect(applyEvent(record, event, after(record)).state).toBe(outcome);
    }
  });

  it('lets an unpaid order lapse', () => {
    const unpaid = createEscrow({
      id: 'esc_lapse',
      quote: quote({ unitPriceMinor: 100, currency: 'EUR', method: 'card' }),
      now: t0,
    });
    expect(() => applyEvent(unpaid, { type: 'PAYMENT_EXPIRED' }, minutes(29))).toThrow(
      /deadline has not passed/,
    );
    expect(applyEvent(unpaid, { type: 'PAYMENT_EXPIRED' }, minutes(30)).state).toBe('cancelled');
  });

  it('reports the timeout that is due and applies it on a tick', () => {
    const record = accepted();
    expect(dueTimeout(record, after(record, -1))).toBeNull();
    expect(tick(record, after(record, -1))).toBe(record);

    expect(dueTimeout(record, after(record))).toEqual({ type: 'DELIVERY_EXPIRED' });
    const expired = tick(record, after(record));
    expect(expired.state).toBe('refunded');
    expect(expired.history.at(-1)).toMatchObject({ actor: 'system' });
    expect(tick(expired, after(record, 1e9))).toBe(expired);
  });

  it('closes the dispute window for the buyer once the delivery deadline has passed', () => {
    const record = delivered();
    const late = { type: 'DISPUTE_OPENED', by: 'buyer', reason: 'Too late' } as const;
    expect(() => applyEvent(record, late, after(record))).toThrow(/window has closed/);
    expect(applyEvent(record, late, after(record, -1)).state).toBe('disputed');
  });

  it('rejects windows that are not positive whole numbers', () => {
    expect(() =>
      applyEvent(funded(), { type: 'SELLER_ACCEPTED' }, minutes(2), {
        deliveryWindowMs: 0,
      }),
    ).toThrow(RangeError);
  });
});

describe('who may do what', () => {
  it('names at least one actor for every event', () => {
    for (const event of EVERY_EVENT) expect(EVENT_ACTORS[event.type].length).toBeGreaterThan(0);
    for (const type of TIMEOUT_EVENTS) expect(EVENT_ACTORS[type]).toEqual(['system']);
  });

  it('refuses an event from the wrong role', () => {
    const wrong: [EscrowRecord, EscrowEvent, Actor][] = [
      [funded(), { type: 'SELLER_ACCEPTED' }, 'buyer'],
      [accepted(), { type: 'SELLER_MARKED_DELIVERED' }, 'buyer'],
      [delivered(), { type: 'BUYER_CONFIRMED' }, 'seller'],
      [delivered(), { type: 'AUTO_RELEASED' }, 'seller'],
      [disputed(), { type: 'DISPUTE_RESOLVED', outcome: 'release' }, 'seller'],
      [disputed(), { type: 'DISPUTE_RESOLVED', outcome: 'refund' }, 'buyer'],
    ];
    for (const [record, event, actor] of wrong) {
      expect(() => applyEventAs(record, event, actor, minutes(30))).toThrow(UnauthorizedActorError);
    }
  });

  it('refuses an event that claims to come from the other party', () => {
    expect(() =>
      applyEventAs(
        delivered(),
        { type: 'DISPUTE_OPENED', by: 'seller', reason: 'x' },
        'buyer',
        minutes(15),
      ),
    ).toThrow(/comes from the seller/);
  });

  it('records who acted', () => {
    const next = applyEventAs(funded(), { type: 'SELLER_ACCEPTED' }, 'seller', minutes(2));
    expect(next.history.at(-1)).toMatchObject({ actor: 'seller', to: 'in_delivery' });
  });

  it('has nothing to dispute before the seller accepts', () => {
    expect(() =>
      applyEvent(funded(), { type: 'DISPUTE_OPENED', by: 'buyer', reason: 'x' }, minutes(2)),
    ).toThrow(InvalidTransitionError);
  });

  it('lets only the seller back out after accepting', () => {
    for (const record of [accepted(), delivered()]) {
      expect(() => applyEvent(record, { type: 'CANCELLED', by: 'buyer' }, minutes(11))).toThrow(
        /open a dispute instead/,
      );
      expect(applyEvent(record, { type: 'CANCELLED', by: 'seller' }, minutes(11)).state).toBe(
        'refunded',
      );
    }
  });

  it('offers each role only what it may do', () => {
    expect(availableActions('funded', 'seller')).toEqual(['SELLER_ACCEPTED', 'CANCELLED']);
    expect(availableActions('funded', 'buyer')).toEqual(['CANCELLED']);
    expect(availableActions('in_delivery', 'buyer')).toEqual(['DISPUTE_OPENED']);
    expect(availableActions('delivered', 'buyer')).toEqual(['BUYER_CONFIRMED', 'DISPUTE_OPENED']);
    expect(availableActions('disputed', 'arbiter')).toEqual(['DISPUTE_RESOLVED']);
    expect(availableActions('disputed', 'buyer')).toEqual([]);
    expect(availableActions('completed', 'buyer')).toEqual([]);
  });
});

describe('split rulings', () => {
  it('ends a dispute by sharing the price', () => {
    const split = applyEvent(
      disputed(),
      { type: 'DISPUTE_RESOLVED', outcome: 'split', buyerShareBps: 4_000 },
      minutes(40),
    );
    expect(split.state).toBe('split');
    expect(isTerminal(split.state)).toBe(true);
  });

  it('insists on a real share', () => {
    for (const buyerShareBps of [0, 10_000, -1, 12.5, Number.NaN]) {
      expect(() =>
        applyEvent(
          disputed(),
          { type: 'DISPUTE_RESOLVED', outcome: 'split', buyerShareBps },
          minutes(40),
        ),
      ).toThrow(/buyerShareBps/);
    }
  });
});

describe('verifyRecord', () => {
  const settled = () => applyEvent(delivered(), { type: 'BUYER_CONFIRMED' }, minutes(12));

  it('accepts every record the engine produces', () => {
    for (const record of [funded(), accepted(), delivered(), disputed(), settled()]) {
      expect(verifyRecord(record)).toEqual({ valid: true });
    }
  });

  it('catches a state that the history does not lead to', () => {
    expect(verifyRecord({ ...delivered(), state: 'completed' })).toMatchObject({
      valid: false,
      index: 3,
    });
  });

  it('catches a step that was removed, reordered or invented', () => {
    const record = settled();
    const without = { ...record, history: record.history.filter((_, index) => index !== 2) };
    expect(verifyRecord(without)).toMatchObject({ valid: false, index: 2 });

    const skipped: EscrowRecord = {
      ...funded(),
      state: 'completed',
      history: [
        ...funded().history,
        {
          from: 'funded',
          to: 'completed',
          event: { type: 'BUYER_CONFIRMED' },
          at: minutes(2).toISOString(),
        },
      ],
    };
    expect(verifyRecord(skipped)).toMatchObject({ valid: false, index: 1 });
  });

  it('catches a step dated before the one it follows, and a role that could not have acted', () => {
    const record = settled();
    const backdated = {
      ...record,
      history: record.history.map((step, index) =>
        index === 3 ? { ...step, at: minutes(0).toISOString() } : step,
      ),
    };
    expect(verifyRecord(backdated)).toMatchObject({ valid: false, index: 3 });

    const forged = {
      ...record,
      history: record.history.map((step, index) =>
        index === 3 ? { ...step, actor: 'seller' as const } : step,
      ),
    };
    expect(verifyRecord(forged)).toMatchObject({ valid: false, index: 3 });
  });
});
