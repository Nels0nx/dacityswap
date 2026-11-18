'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { randomHex, wait } from '@/lib/payments/util';
import { useMarket } from '@/store/market-store';

const WALLETS = [
  { id: 'metamask', label: 'MetaMask', note: 'Browser extension', dot: 'bg-orange-400' },
  {
    id: 'walletconnect',
    label: 'WalletConnect',
    note: 'Scan with any mobile wallet',
    dot: 'bg-sky-400',
  },
  { id: 'coinbase', label: 'Coinbase Wallet', note: 'App or extension', dot: 'bg-blue-500' },
  { id: 'phantom', label: 'Phantom', note: 'Solana and EVM', dot: 'bg-violet-400' },
] as const;

function WalletList() {
  const connectWallet = useMarket((state) => state.connectWallet);
  const [connecting, setConnecting] = useState<string | null>(null);

  const connect = async (wallet: (typeof WALLETS)[number]) => {
    setConnecting(wallet.id);
    await wait(900);
    connectWallet({ label: wallet.label, address: `0x${randomHex(40)}` });
  };

  return (
    <div className="p-3">
      <ul className="flex flex-col gap-1.5">
        {WALLETS.map((wallet, index) => (
          <li key={wallet.id}>
            <button
              type="button"
              data-autofocus={index === 0 ? '' : undefined}
              disabled={connecting !== null}
              onClick={() => connect(wallet)}
              className="flex w-full items-center gap-3 rounded-[4px] glass-inset p-3 text-left transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-60"
            >
              <span className="grid size-10 place-items-center rounded-[4px] bg-white/8">
                <span className={cn('size-3.5 rounded-full', wallet.dot)} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">{wallet.label}</span>
                <span className="block text-xs text-white/50">{wallet.note}</span>
              </span>
              {connecting === wallet.id && (
                <span className="size-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-[4px] border border-teal-300/20 bg-teal-300/[0.07] p-3 text-xs leading-relaxed text-teal-100/80">
        Demo mode: this simulates a connection and generates a throwaway address. No wallet is
        opened and no signature is requested.
      </p>
    </div>
  );
}

export function ConnectWalletModal() {
  const open = useMarket((state) => state.modal === 'wallet');
  const closeModal = useMarket((state) => state.closeModal);

  return (
    <Modal open={open} onClose={closeModal} title="Connect a wallet" className="sm:max-w-sm">
      <WalletList />
    </Modal>
  );
}
