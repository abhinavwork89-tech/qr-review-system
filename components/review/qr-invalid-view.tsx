import { OneCoreFooter } from "@/components/onecore-footer";
import { ReviewThemeShell } from "@/components/review/review-theme-shell";
import { defaultReviewThemeCssVars } from "@/lib/review-theme";

export function QrInvalidView() {
  return (
    <ReviewThemeShell style={defaultReviewThemeCssVars()}>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-16 sm:py-20">
        <div
          className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_85%,var(--review-primary)_6%)] px-5 py-8 text-center shadow-sm"
          role="status"
        >
          <p className="text-base font-semibold text-[var(--review-fg)]">
            QR invalid
          </p>
          <p className="mt-2 text-sm text-[var(--review-muted)]">
            This link does not match an active review page. Check the code or ask
            the business for an updated QR.
          </p>
        </div>
      </main>
      <footer className="mt-auto shrink-0">
        <OneCoreFooter />
      </footer>
    </ReviewThemeShell>
  );
}
