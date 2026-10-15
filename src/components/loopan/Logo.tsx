export function LoopanMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M40 24a16 16 0 1 1-6.2-12.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path d="M36.5 6.5l-1 7.6-7.4-1.4" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 31c0-8 5-13 14-13 0 9-5 14-13 14z" fill="currentColor" opacity="0.9" />
      <path d="M18 31l8-8" stroke="var(--color-card)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
