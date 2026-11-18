'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { useKeydown } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { CloseIcon } from './Icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Hide the visual header but keep the accessible name. */
  hideHeader?: boolean;
  className?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, hideHeader, className, children }: ModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (open && event.key === 'Escape') onClose();
    },
    [open, onClose],
  );
  useKeydown(onKeydown);

  // Move focus into the dialog and give it back to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const target =
        dialog.current?.querySelector<HTMLElement>('[data-autofocus]') ?? dialog.current;
      target?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              'hud-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden outline-none',
              className,
            )}
            initial={{ y: 28, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className={cn(
                'hud-header flex h-11 shrink-0 items-center justify-between gap-4 pr-1.5 pl-3.5',
                hideHeader && 'sr-only',
              )}
            >
              <h2 id={titleId} className="font-hud text-[1.3rem] leading-none">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-ink-950/70 hover:text-ink-950 grid size-8 place-items-center rounded-[3px] transition hover:bg-black/10"
              >
                <CloseIcon />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
