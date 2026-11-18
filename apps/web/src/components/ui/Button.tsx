import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent-fill text-ink-950 font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.6),inset_0_-1px_0_rgb(0_0_0/0.14),0_0_0_1px_rgb(79_242_207/0.35),0_8px_28px_-10px_rgb(79_242_207/0.55)] hover:brightness-110 active:brightness-95',
  secondary:
    'bg-gradient-to-b from-white/[0.13] to-white/[0.04] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),inset_0_0_0_1px_rgb(255_255_255/0.1)] hover:from-white/[0.2] hover:to-white/[0.08]',
  ghost: 'text-white/70 hover:text-white hover:bg-white/[0.07]',
  danger: 'border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[4px]',
  md: 'h-10 px-4.5 text-sm gap-2 rounded-[4px]',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-[4px]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap transition duration-150 select-none',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
