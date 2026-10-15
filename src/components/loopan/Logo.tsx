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

/**
 * Circular brand badge: the favicon image clipped to a circle so its square
 * green background becomes a round green chip (no square corners). Used as the
 * compact mark when the sidebar is collapsed.
 */
export function LoopanBadge({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src="/favicon.jpg"
      alt="Loopan"
      className={`${className} rounded-full object-cover`}
    />
  );
}

/**
 * The leaf-styled "L" glyph from the favicon, drawn as inline SVG so it has no
 * square background and inherits the current text color via `currentColor`.
 */
// logos-trimmed.png is cropped tight to the glyph (aspect w/h ≈ 0.676), so the
// mark fills its box with no empty padding and can be sized against the text.
export function LoopanL({ className = "h-[1em] w-[0.676em]" }: { className?: string }) {
  // Use the trimmed logo as a CSS mask so the shape is pixel-identical to the
  // brand logo, tinted with the current text color.
  return (
    <span
      role="img"
      aria-label="L"
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "currentColor",
        WebkitMaskImage: "url(/logos-trimmed.png)",
        maskImage: "url(/logos-trimmed.png)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

/**
 * Wordmark that renders the leaf "L" glyph followed by "oopan", all in the same
 * color so it reads as one word: Loopan.
 */
export function LoopanWordmark({
  className = "text-2xl font-extrabold leading-none tracking-tight text-primary",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-end ${className}`} aria-label="Loopan">
      <LoopanL className="h-[1.05em] w-[0.71em] -mb-[0.04em]" />
      <span className="ml-[0.02em]">oopan</span>
    </span>
  );
}
