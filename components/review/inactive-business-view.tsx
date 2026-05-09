import { OneCoreFooter } from "@/components/onecore-footer";
import { BusinessBrandHeader } from "@/components/review/business-brand-header";
import { ReviewMasterQrLazy } from "@/components/review/review-master-qr-lazy";
import { ReviewThemeShell } from "@/components/review/review-theme-shell";
import { resolveBusinessTheme, themeToCssVars } from "@/lib/review-theme";
import type { InactiveBusinessForReview } from "@/lib/types/business";

export function InactiveBusinessView({
  slug,
  business,
}: {
  slug: string;
  business: InactiveBusinessForReview;
}) {
  const theme = resolveBusinessTheme(business);
  const displayName =
    business.brand_name?.trim() || business.name?.trim() || "Business";

  return (
    <ReviewThemeShell style={themeToCssVars(theme)}>
      <BusinessBrandHeader name={displayName} logoUrl={business.logo_url} />
      <ReviewMasterQrLazy slug={slug} />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-12">
        <div
          className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_85%,var(--review-primary)_6%)] px-5 py-6 text-center shadow-sm"
          role="status"
        >
          <p className="text-sm font-medium text-[var(--review-fg)]">
            Service unavailable
          </p>
          <p className="mt-2 text-sm text-[var(--review-muted)]">
            This business is not accepting reviews right now.
          </p>
        </div>
      </main>
      <OneCoreFooter />
    </ReviewThemeShell>
  );
}
