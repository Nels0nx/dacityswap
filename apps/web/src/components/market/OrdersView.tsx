'use client';

import { canApply, fundsLocation, type EscrowEvent } from '@dacityswap/escrow-core';
import { Button } from '@/components/ui/Button';
import { CheckIcon, LockIcon } from '@/components/ui/Icons';
import { Thumb } from '@/components/ui/Thumb';
import type { Order } from '@/domain/types';
import { cn } from '@/lib/cn';
import { formatCountdown, formatEUR } from '@/lib/format';
import { useNowSeconds } from '@/lib/hooks';
import { useMarket } from '@/store/market-store';
import { EscrowTimeline, STATE_LABEL, STATE_TONE } from './EscrowTimeline';

const FUNDS_COPY = {
  buyer: 'Back with you',
  escrow: 'Locked in escrow',
  seller: 'Released to seller',
  split: 'Shared by the arbiter',
} as const;

/** How each escrow event reads in the audit trail. */
const EVENT_COPY: Record<EscrowEvent['type'], string> = {
  PAYMENT_CAPTURED: 'Payment captured, funds locked',
  PAYMENT_FAILED: 'Payment failed',
  PAYMENT_EXPIRED: 'Not paid in time, order lapsed',
  SELLER_ACCEPTED: 'Seller accepted the order',
  ACCEPTANCE_EXPIRED: 'Seller did not accept in time, funds returned',
  SELLER_MARKED_DELIVERED: 'Seller marked it delivered',
  DELIVERY_EXPIRED: 'Seller did not deliver in time, funds returned',
  BUYER_CONFIRMED: 'You confirmed delivery, funds released',
  AUTO_RELEASED: 'Confirmation window passed, funds released',
  DISPUTE_OPENED: 'Dispute opened, funds frozen',
  DISPUTE_RESOLVED: 'Arbiter ruled',
  DISPUTE_EXPIRED: 'No ruling in time, funds returned',
  CANCELLED: 'Order cancelled',
};

const timeFormat = new Intl.DateTimeFormat('en-IE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function AutoRelease({ at }: { at: string }) {
  const now = useNowSeconds();
  if (now === null) return null;
  return (
    <p className="text-[11px] text-white/50">
      Releases automatically in{' '}
      <span className="font-mono text-white/80 tabular-nums">
        {formatCountdown(Date.parse(at) / 1_000 - now)}
      </span>
    </p>
  );
}

function Detail({ order }: { order: Order }) {
  const dispatchEscrow = useMarket((state) => state.dispatchEscrow);
  const { escrow } = order;
  const canConfirm = canApply(escrow.state, 'BUYER_CONFIRMED');
  const canDispute = canApply(escrow.state, 'DISPUTE_OPENED');

  return (
    <section
      className="hud-panel flex min-h-0 flex-col overflow-hidden"
      aria-label={`Order ${order.id}`}
    >
      <header className="hud-header flex h-11 shrink-0 items-center justify-between gap-3 px-3.5">
        <h3 className="font-hud truncate text-[1.3rem] leading-none">{order.title}</h3>
        <span className="shrink-0 font-mono text-[11px] font-semibold">{order.id}</span>
      </header>

      <div className="scroll-thin flex min-h-0 flex-col gap-5 overflow-y-auto p-4">
        <EscrowTimeline escrow={escrow} />

        {escrow.state === 'funded' && (
          <p className="text-xs text-white/55">Waiting for @{order.sellerHandle} to accept…</p>
        )}
        {escrow.state === 'in_delivery' && (
          <p className="text-xs text-white/55">
            @{order.sellerHandle} is delivering in-game. You will confirm once it arrives.
          </p>
        )}

        {(canConfirm || canDispute) && (
          <div className="flex flex-col gap-2">
            {escrow.autoReleaseAt && <AutoRelease at={escrow.autoReleaseAt} />}
            <div className="flex gap-2">
              {canConfirm && (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => dispatchEscrow(order.id, { type: 'BUYER_CONFIRMED' })}
                >
                  <CheckIcon />
                  Confirm and release
                </Button>
              )}
              <Button
                variant="danger"
                className={canConfirm ? '' : 'flex-1'}
                onClick={() =>
                  dispatchEscrow(order.id, {
                    type: 'DISPUTE_OPENED',
                    by: 'buyer',
                    reason: 'Opened from the order screen',
                  })
                }
              >
                Open dispute
              </Button>
            </div>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="label text-[9.5px] text-white/45">Funds</dt>
            <dd className="mt-1 flex items-center gap-1.5">
              <LockIcon width={12} height={12} className="text-white/50" />
              {FUNDS_COPY[fundsLocation(escrow.state)]}
            </dd>
          </div>
          <div>
            <dt className="label text-[9.5px] text-white/45">Seller</dt>
            <dd className="mt-1 truncate">@{order.sellerHandle}</dd>
          </div>
          <div>
            <dt className="label text-[9.5px] text-white/45">Paid with</dt>
            <dd className="mt-1 truncate">{order.rail}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="label text-[9.5px] text-white/45">Payment reference</dt>
            <dd className="mt-1 truncate font-mono text-[11px] text-white/70">
              {order.paymentRef}
            </dd>
          </div>
        </dl>

        <div>
          <h4 className="label text-[9.5px] text-white/45">Receipt</h4>
          <dl className="mt-2 flex flex-col gap-1 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-white/55">Item</dt>
              <dd className="font-mono tabular-nums">{formatEUR(escrow.quote.subtotalMinor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/55">Service fee</dt>
              <dd className="font-mono tabular-nums">
                {formatEUR(escrow.quote.buyerServiceFeeMinor)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/55">Processing</dt>
              <dd className="font-mono tabular-nums">
                {formatEUR(escrow.quote.processingFeeMinor)}
              </dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-white/[0.08] pt-2 font-medium">
              <dt>Total paid</dt>
              <dd className="font-mono tabular-nums">{formatEUR(escrow.quote.totalMinor)}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="label text-[9.5px] text-white/45">Audit trail</h4>
          <ol className="mt-2 flex flex-col">
            {escrow.history.map((step, index) => (
              <li
                key={index}
                className="flex items-baseline gap-3 border-l border-white/12 py-1 pl-3 text-xs"
              >
                {/* Times are local, so they only render in the browser. */}
                <time
                  suppressHydrationWarning
                  dateTime={step.at}
                  className="shrink-0 font-mono text-[10.5px] text-white/40 tabular-nums"
                >
                  {timeFormat.format(new Date(step.at))}
                </time>
                <span className="text-white/75">{EVENT_COPY[step.event.type]}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Orders, as a list and a detail pane: where the money is, what happened, what you can do. */
export function OrdersView() {
  const orders = useMarket((state) => state.orders);
  const expandedOrderId = useMarket((state) => state.expandedOrderId);
  const toggleOrder = useMarket((state) => state.toggleOrder);
  const setTab = useMarket((state) => state.setTab);

  if (orders.length === 0) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <p className="text-sm font-medium">No orders yet</p>
          <p className="mt-1 text-xs text-white/50">
            Your purchases and their escrow status appear here.
          </p>
          <Button className="mt-4" onClick={() => setTab('buy')}>
            Browse the market
          </Button>
        </div>
      </div>
    );
  }

  const selected = orders.find((order) => order.id === expandedOrderId) ?? orders[0]!;

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 gap-4 pb-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section
        className="hud-panel flex max-h-48 min-h-0 flex-col overflow-hidden lg:max-h-none"
        aria-label="Your orders"
      >
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.08] px-3.5">
          <h3 className="label text-white/85">Your orders</h3>
          <span className="font-mono text-[11px] text-white/45">
            {String(orders.length).padStart(2, '0')}
          </span>
        </header>
        <div role="listbox" aria-label="Orders" className="scroll-thin min-h-0 overflow-y-auto">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              role="option"
              aria-selected={order.id === selected.id}
              onClick={() => order.id !== selected.id && toggleOrder(order.id)}
              className="group flex w-full items-center gap-3 border-b border-white/[0.06] p-2.5 text-left transition hover:bg-white/[0.06] aria-selected:bg-white/[0.1]"
            >
              <Thumb model={order.model} className="h-11 w-14" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{order.title}</span>
                <span className="mt-0.5 block font-mono text-[10.5px] text-white/45">
                  {order.id}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={cn(
                    'rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium',
                    STATE_TONE[order.escrow.state],
                  )}
                >
                  {STATE_LABEL[order.escrow.state]}
                </span>
                <span className="font-mono text-xs tabular-nums">
                  {formatEUR(order.escrow.quote.totalMinor)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <Detail key={selected.id} order={selected} />
    </div>
  );
}
