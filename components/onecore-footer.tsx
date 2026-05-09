export function OneCoreFooter() {
  return (
    <footer
      className="mt-auto px-4 py-4 sm:px-5 sm:py-5"
      style={{
        borderTop:
          "1px solid color-mix(in srgb, var(--review-fg) 12%, transparent)",
        backgroundColor:
          "color-mix(in srgb, var(--review-bg) 92%, var(--review-fg))",
      }}
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-2">
        <span className="text-[13px] leading-snug text-[var(--review-muted)] sm:text-sm">
          Reviews powered by
        </span>
        <a
          href="https://onecore.example"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-semibold leading-snug tracking-wide text-[var(--review-primary)] underline-offset-4 hover:underline sm:text-sm"
        >
          OneCore
        </a>
      </div>
    </footer>
  );
}
