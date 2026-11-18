import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
export const WalletIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v4" />
    <path d="M3 7.5V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 7.5Z" />
    <circle cx="16.5" cy="14" r="1" fill="currentColor" stroke="none" />
  </Icon>
);
export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.2 10" />
  </Icon>
);
export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Icon>
);
export const BoltIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 3 5 13.5h6L10 21l8.5-11H12.5L13 3Z" />
  </Icon>
);
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);
export const StarIcon = (p: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...p}>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.8l-5.3 2.8 1.1-5.8L3.5 9.7l5.9-.8L12 3.5Z" />
  </Icon>
);
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);
export const CardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3 10h18M7 15h3" />
  </Icon>
);
export const ChainIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 4.5 7.5v9L12 21l7.5-4.5v-9L12 3Z" />
    <path d="M4.5 7.5 12 12l7.5-4.5M12 12v9" />
  </Icon>
);
export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4 3 19.5h18L12 4Z" />
    <path d="M12 10v4.5M12 17.2v.1" />
  </Icon>
);
export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </Icon>
);
export const CodeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5" />
  </Icon>
);
export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const VerifiedIcon = (p: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...p}>
    <path
      fillRule="evenodd"
      d="M12 2.5 14.3 4.3l2.9-.2.9 2.8 2.4 1.6-1 2.7 1 2.7-2.4 1.6-.9 2.8-2.9-.2L12 20.9l-2.3-1.8-2.9.2-.9-2.8-2.4-1.6 1-2.7-1-2.7 2.4-1.6.9-2.8 2.9.2L12 2.5Zm3.9 7.3a.9.9 0 0 0-1.3-1.2l-3.7 4-1.5-1.5a.9.9 0 1 0-1.3 1.3l2.2 2.2a.9.9 0 0 0 1.3 0l4.3-4.8Z"
    />
  </Icon>
);
