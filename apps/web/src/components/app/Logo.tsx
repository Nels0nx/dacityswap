import { useId } from 'react';

/** The coin, flat: the same "D" crossed by a stroke as the 3D coin on stage. */
export function LogoMark({ size = 34 }: { size?: number }) {
  const rim = useId();
  const mark = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3f5f8" />
          <stop offset=".5" stopColor="#8d949e" />
          <stop offset="1" stopColor="#dfe3e9" />
        </linearGradient>
        <linearGradient id={mark} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9c0ca" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29.5" fill="#0b0c0f" stroke={`url(#${rim})`} strokeWidth="3.5" />
      <circle cx="32" cy="32" r="23.5" fill="none" stroke="#4ff2cf" strokeWidth="1.6" />
      <g fill={`url(#${mark})`}>
        <path
          fillRule="evenodd"
          d="M24.2 21.2H31.6A10.8 10.8 0 0 1 31.6 42.8H24.2ZM29.2 26.2V37.8H31.6A5.8 5.8 0 0 0 31.6 26.2Z"
        />
        <rect x="30.7" y="17.6" width="2.6" height="4.4" />
        <rect x="30.7" y="42" width="2.6" height="4.4" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-hud text-[1.35rem] leading-none">
        Dacity<span className="text-gradient">Swap</span>
      </span>
    </span>
  );
}
