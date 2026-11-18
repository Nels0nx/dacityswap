'use client';

import { DEFAULT_FEE_SCHEDULE } from '@dacityswap/escrow-core';
import { CodeIcon, LockIcon, ShieldIcon } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { siteConfig } from '@/config/site';
import { useMarket } from '@/store/market-store';

const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

const STEPS = [
  ['You pay', 'Card or crypto. The money goes into escrow, not to the seller.'],
  [
    'Seller delivers',
    'The seller accepts, hands over the item in-game and marks it delivered. If they miss a deadline, you are refunded.',
  ],
  ['You confirm', 'Funds release when you confirm, or automatically after 24 hours.'],
  [
    'Or you dispute',
    'One tap freezes the funds. An arbiter decides; if nobody rules in 14 days, you are refunded.',
  ],
] as const;

const OPEN_SOURCE = [
  [
    'Escrow state machine',
    'packages/escrow-core/src/escrow.ts',
    'Every state a trade can be in, and every move between them.',
  ],
  [
    'Fee engine',
    'packages/escrow-core/src/fees.ts',
    'The exact function that prices every quote and payout.',
  ],
  [
    'On-chain escrow',
    'packages/contracts/src/DacityEscrow.sol',
    'The contract that holds stablecoin payments. We cannot withdraw from it.',
  ],
] as const;

export function TrustModal() {
  const open = useMarket((state) => state.modal === 'trust');
  const closeModal = useMarket((state) => state.closeModal);
  const fees = DEFAULT_FEE_SCHEDULE;

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="How DacitySwap protects a trade"
      className="sm:max-w-2xl"
    >
      <div className="scroll-thin overflow-y-auto p-5">
        <ol className="grid gap-2 sm:grid-cols-4">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="rounded-[4px] glass-inset p-3">
              <span className="text-gradient font-mono text-xs font-semibold">0{index + 1}</span>
              <p className="mt-1.5 text-sm font-medium">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">{body}</p>
            </li>
          ))}
        </ol>

        <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold">
          <CodeIcon className="text-accent" />
          Open source where it matters
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          The code that touches your money is public. Read it, run its tests, or audit it yourself.
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {OPEN_SOURCE.map(([name, path, body]) => (
            <li key={path}>
              <a
                href={`${siteConfig.repoUrl}/blob/main/${path}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-[4px] glass-inset p-3 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{name}</span>
                  <span className="mt-0.5 block text-xs text-white/55">{body}</span>
                </span>
                <code className="hidden shrink-0 rounded-md bg-white/6 px-2 py-1 font-mono text-[10px] text-white/55 sm:block">
                  {path.split('/').slice(-1)[0]}
                </code>
              </a>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold">
          <ShieldIcon className="text-accent" />
          Fees, in full
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {[
            ['Buyer service fee', pct(fees.buyerServiceBps)],
            ['Seller commission', pct(fees.sellerCommissionBps)],
            [
              'Card processing',
              `${pct(fees.processing.card.bps)} + €0.${fees.processing.card.fixedMinor}`,
            ],
            ['Crypto processing', pct(fees.processing.crypto.bps)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[4px] glass-inset p-3">
              <dd className="font-mono text-base font-medium tabular-nums">{value}</dd>
              <dt className="mt-0.5 text-[11px] text-white/50">{label}</dt>
            </div>
          ))}
        </dl>

        <p className="mt-6 flex items-start gap-2 border-t border-white/8 pt-4 text-[11px] leading-relaxed text-white/45">
          <LockIcon width={13} height={13} className="mt-0.5 shrink-0" />
          {siteConfig.legalNotice}
        </p>
      </div>
    </Modal>
  );
}
