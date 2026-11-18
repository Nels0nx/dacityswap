'use client';

import { AnimatePresence, motion } from 'motion/react';
import { AlertIcon, CheckIcon, CloseIcon, LockIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/cn';
import { useMarket, type ToastTone } from '@/store/market-store';

const TONES: Record<ToastTone, { icon: typeof CheckIcon; className: string }> = {
  success: { icon: CheckIcon, className: 'bg-emerald-400/15 text-emerald-300' },
  info: { icon: LockIcon, className: 'bg-teal-300/15 text-teal-200' },
  danger: { icon: AlertIcon, className: 'bg-red-400/15 text-red-300' },
};

export function Toaster() {
  const toasts = useMarket((state) => state.toasts);
  const dismissToast = useMarket((state) => state.dismissToast);

  return (
    <div
      className="pointer-events-none fixed top-[4.5rem] left-1/2 z-[55] flex w-[min(21rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONES[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="hud-panel pointer-events-auto flex items-start gap-3 border-l-2 border-[var(--color-accent)] p-3 pr-2"
            >
              <span
                className={cn(
                  'mt-0.5 grid size-7 shrink-0 place-items-center rounded-[3px]',
                  tone.className,
                )}
              >
                <tone.icon width={14} height={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.body && <p className="mt-0.5 text-xs text-white/60">{toast.body}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss"
                className="grid size-7 shrink-0 place-items-center rounded-[3px] text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <CloseIcon width={13} height={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
