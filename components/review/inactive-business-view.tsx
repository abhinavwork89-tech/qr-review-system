import type { CSSProperties } from "react";
import { OneCoreFooter } from "@/components/onecore-footer";
import { ReviewThemeShell } from "@/components/review/review-theme-shell";

const UNAVAILABLE_THEME = {
  "--review-primary": "#2563eb",
  "--review-secondary": "#64748b",
  "--review-bg": "#fafafa",
  "--review-fg": "#0f172a",
  "--review-muted": "color-mix(in srgb, var(--review-fg) 62%, transparent)",
} as CSSProperties;

export function InactiveBusinessView() {
  return (
    <ReviewThemeShell style={UNAVAILABLE_THEME} lang="en">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-12">
        <div
          className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_85%,var(--review-primary)_6%)] px-5 py-6 text-center shadow-sm"
          role="status"
        >
          <p className="text-sm font-medium text-[var(--review-fg)]">Service unavailable</p>
          <p className="mt-2 text-sm text-[var(--review-muted)]">
            This service is currently unavailable
          </p>
        </div>
      </main>
      <OneCoreFooter />
    </ReviewThemeShell>
  );
}
