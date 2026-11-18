'use client';

import { HAPPY_PATH, type EscrowRecord, type EscrowState } from '@dacityswap/escrow-core';
import { AlertIcon, CheckIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/cn';

export const STATE_LABEL: Record<EscrowState, string> = {
  awaiting_payment: 'Awaiting payment',
  funded: 'Funds in escrow',
  in_delivery: 'Seller delivering',
  delivered: 'Delivered',
  completed: 'Complete',
  disputed: 'In dispute',
  refunded: 'Refunded',
  split: 'Split',
  cancelled: 'Cancelled',
};

export const STATE_TONE: Record<EscrowState, string> = {
  awaiting_payment: 'bg-white/10 text-white/70',
  funded: 'bg-teal-300/15 text-teal-200',
  in_delivery: 'bg-teal-300/15 text-teal-200',
  delivered: 'bg-sky-300/15 text-sky-200',
  completed: 'bg-emerald-400/15 text-emerald-300',
  disputed: 'bg-red-400/15 text-red-300',
  refunded: 'bg-white/10 text-white/70',
  split: 'bg-white/10 text-white/70',
  cancelled: 'bg-white/10 text-white/70',
};

const STEP_LABEL = ['Ordered', 'In escrow', 'Delivering', 'Delivered', 'Released'] as const;

const timeFormat = new Intl.DateTimeFormat('en-IE', { hour: '2-digit', minute: '2-digit' });

/** The five stops of a healthy trade, with a branch shown when it leaves the path. */
export function EscrowTimeline({ escrow }: { escrow: EscrowRecord }) {
  const offPath = !(HAPPY_PATH as readonly EscrowState[]).includes(escrow.state);
  // If the trade left the happy path, show progress up to the last state that was on it.
  const lastOnPath = offPath
    ? [...escrow.history]
        .reverse()
        .find((step) => (HAPPY_PATH as readonly EscrowState[]).includes(step.from))?.from
    : escrow.state;
  const reached = HAPPY_PATH.indexOf(
    (lastOnPath ?? 'awaiting_payment') as (typeof HAPPY_PATH)[number],
  );
  const reachedAt = (state: EscrowState) =>
    state === 'awaiting_payment'
      ? escrow.createdAt
      : escrow.history.find((step) => step.to === state)?.at;

  return (
    <div>
      <ol className="flex items-start" aria-label="Escrow progress">
        {HAPPY_PATH.map((state, index) => {
          const done = index <= reached;
          const current = index === reached && !offPath && escrow.state !== 'completed';
          const at = reachedAt(state);
          return (
            <li
              key={state}
              className="relative flex flex-1 flex-col items-center text-center"
              aria-current={current ? 'step' : undefined}
            >
              {index > 0 && (
                <span
                  className={cn(
                    'absolute top-[10px] right-1/2 h-0.5 w-full -translate-y-1/2',
                    done ? 'bg-accent-fill' : 'bg-white/12',
                  )}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  'relative grid size-5 place-items-center rounded-full border-2 transition-colors',
                  done
                    ? 'bg-accent-fill border-transparent text-ink-950'
                    : 'border-white/20 bg-ink-900',
                  current && 'ring-4 ring-teal-300/25',
                )}
              >
                {done && <CheckIcon width={12} height={12} strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  'mt-1.5 text-[10px] leading-tight',
                  done ? 'text-white/85' : 'text-white/40',
                )}
              >
                {STEP_LABEL[index]}
              </span>
              <span className="font-mono text-[9px] text-white/35 tabular-nums">
                {/* Times are local, so render them on the client only. */}
                <time suppressHydrationWarning dateTime={at}>
                  {at && done ? timeFormat.format(new Date(at)) : ' '}
                </time>
              </span>
            </li>
          );
        })}
      </ol>

      {offPath && (
        <p
          className={cn(
            'mt-3 flex items-center gap-2 rounded-[4px] px-3 py-2 text-xs',
            escrow.state === 'disputed' ? 'bg-red-400/10 text-red-200' : 'bg-white/6 text-white/75',
          )}
        >
          <AlertIcon width={13} height={13} className="shrink-0" />
          {escrow.state === 'disputed' && 'Funds are frozen while an arbiter reviews this trade.'}
          {escrow.state === 'refunded' && 'The payment was returned to the buyer in full.'}
          {escrow.state === 'split' && 'The arbiter divided the payment between buyer and seller.'}
          {escrow.state === 'cancelled' && 'This order was cancelled before any payment was taken.'}
        </p>
      )}
    </div>
  );
}
