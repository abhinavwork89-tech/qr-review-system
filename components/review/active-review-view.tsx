import { BannerSlider } from "@/components/banner-slider";
import { OneCoreFooter } from "@/components/onecore-footer";
import { BusinessBrandHeader } from "@/components/review/business-brand-header";
import { ReviewDelayedModal } from "@/components/review/review-delayed-modal";
import { ReviewChannels } from "@/components/review/review-channels";
import { ReviewMasterQrLazy } from "@/components/review/review-master-qr-lazy";
import { ReviewRewardGames } from "@/components/review/review-reward-games";
import { ReviewRatingPlaceholder } from "@/components/review/review-rating-placeholder";
import { ScanTracker } from "@/components/review/scan-tracker";
import { ReviewThemeShell } from "@/components/review/review-theme-shell";
import {
  type ReviewDisplayModel,
  reviewDisplayToCssVars,
} from "@/lib/review/display-model";

export function ActiveReviewView({
  slug,
  display,
}: {
  slug: string;
  display: ReviewDisplayModel;
}) {
  return (
    <ReviewThemeShell
      lang={display.language}
      style={reviewDisplayToCssVars(display)}
    >
      <ScanTracker businessId={display.businessId} />
      <header className="shrink-0">
        <BusinessBrandHeader name={display.brandName} logoUrl={display.logoUrl} />
      </header>

      <ReviewDelayedModal
        googleReviewUrl={display.googleReviewUrl}
        channels={display.channels}
      />

      <ReviewMasterQrLazy slug={slug} />

      <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6">
        <div className="flex flex-col gap-8 sm:gap-10">
          <section aria-label="Promotions" className="w-full">
            {display.banners.length > 0 ? (
              <BannerSlider
                banners={display.banners}
                className="w-full"
                aspectClassName="aspect-[5/3] sm:aspect-[20/9]"
              />
            ) : (
              <div className="flex aspect-[5/3] items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_92%,var(--review-fg))] text-sm text-[var(--review-muted)] sm:aspect-[20/9]">
                No promotional banners available
              </div>
            )}
          </section>

          <section aria-label="Channels" className="w-full">
            <ReviewChannels
              channels={display.channels}
              customerCareNumber={display.customerCareNumber}
            />
          </section>

          <section aria-label="Rewards" className="w-full">
            <ReviewRewardGames
              key={display.businessId}
              businessId={display.businessId}
              spinEnabled={display.spinEnabled}
              scratchEnabled={display.scratchEnabled}
              rewardConfig={display.rewardConfig}
            />
          </section>

          <section id="review-flow" aria-label="Rating" className="w-full">
            <ReviewRatingPlaceholder
              businessId={display.businessId}
              googleReviewUrl={display.googleReviewUrl}
              threshold={display.threshold}
              directRedirect={display.directRedirect}
              allowLowRatingRedirect={display.allowLowRatingRedirect}
              channels={display.channels}
            />
          </section>
        </div>
      </div>

      <footer className="mt-auto shrink-0">
        <OneCoreFooter />
      </footer>
    </ReviewThemeShell>
  );
}
