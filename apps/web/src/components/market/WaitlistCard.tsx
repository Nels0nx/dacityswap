'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/ui/Icons';
import { siteConfig } from '@/config/site';
import { formatCountdown } from '@/lib/format';
import { useNowSeconds } from '@/lib/hooks';
import { useMarket } from '@/store/market-store';

const LAUNCH_AT = Date.parse(siteConfig.gta6LaunchAt) / 1_000;

export function WaitlistCard() {
  const now = useNowSeconds();
  const waitlistEmail = useMarket((state) => state.waitlistEmail);
  const joinWaitlist = useMarket((state) => state.joinWaitlist);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const remaining = now === null ? null : LAUNCH_AT - now;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    joinWaitlist(value);
  };

  return (
    <div className="flex flex-1 flex-col justify-center p-5">
      <div className="relative overflow-hidden rounded-[4px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent p-6 text-center">
        <div
          className="bg-accent-fill pointer-events-none absolute -top-24 left-1/2 size-48 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          aria-hidden="true"
        />
        <p className="font-mono text-[10px] tracking-[0.2em] text-white/50 uppercase">
          {remaining !== null && remaining <= 0 ? 'GTA VI market' : 'GTA VI launches in'}
        </p>
        <p className="font-hud mt-3 text-5xl leading-none tabular-nums">
          {remaining === null ? '—' : remaining <= 0 ? 'Waitlist' : formatCountdown(remaining)}
        </p>
        <p className="mx-auto mt-4 max-w-[19rem] text-sm leading-relaxed text-white/65">
          GTA VI launches as a single-player game; trading happens in its online economy, which has
          not been dated. Escrow, checkout and the marketplace are built. The GTA VI connector goes
          live when that economy opens and its terms allow trading.
        </p>

        {waitlistEmail ? (
          <p className="mt-5 flex items-center justify-center gap-2 rounded-[4px] bg-emerald-400/10 p-3 text-sm text-emerald-200">
            <CheckIcon />
            {waitlistEmail} is on the list
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-2">
            <label htmlFor="waitlist-email" className="sr-only">
              Email address
            </label>
            <input
              id="waitlist-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error !== null}
              aria-describedby={error ? 'waitlist-error' : undefined}
              className="field text-center"
            />
            {error && (
              <p id="waitlist-error" role="alert" className="text-xs text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary">
              Join the waitlist
            </Button>
          </form>
        )}
      </div>
      <p className="mt-3 px-2 text-center text-[11px] leading-relaxed text-white/40">
        Demo: the address is kept in this browser tab only.
      </p>
    </div>
  );
}
