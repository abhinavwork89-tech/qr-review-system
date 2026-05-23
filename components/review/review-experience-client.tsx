"use client";

import type { ReactNode } from "react";
import { BannerSlider } from "@/components/banner-slider";
import { BusinessBrandHeader } from "@/components/review/business-brand-header";
import {
  ReviewDelayedModalLazy,
  ReviewDigitalResourcesLazy,
  ReviewRewardGamesLazy,
} from "@/components/review/review-below-fold-lazy";
import { ReviewChannels } from "@/components/review/review-channels";
import {
  ReviewI18nProvider,
  useReviewT,
} from "@/components/review/review-i18n-provider";
import { ReviewLanguageSwitcher } from "@/components/review/review-language-switcher";
import { ReviewPageFooter } from "@/components/review/review-page-footer";
import { ReviewRatingPlaceholder } from "@/components/review/review-rating-placeholder";
import { ScanTracker } from "@/components/review/scan-tracker";
import type { AppSettingsPublic } from "@/lib/data/app-settings";
import type { BannerSlide } from "@/components/banner-slider";
import type { ReviewDisplayModel } from "@/lib/review/display-model";

function PromotionsSection({ banners }: { banners: BannerSlide[] }) {
  const t = useReviewT();
  return (
    <section aria-label={t("promotions.aria")} className="w-full promotions-banner">
      {banners.length > 0 ? (
        <BannerSlider
          banners={banners}
          className="w-full"
          aspectClassName="aspect-[5/3] sm:aspect-[20/9]"
        />
      ) : (
        <div className="flex aspect-[5/3] items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_92%,var(--review-fg))] px-2 text-center text-sm leading-snug text-[var(--review-muted)] sm:aspect-[20/9]">
          {t("promotions.empty")}
        </div>
      )}
    </section>
  );
}

export function ReviewExperienceClient({
  slug,
  display,
  settings,
}: {
  slug: string;
  display: ReviewDisplayModel;
  settings: AppSettingsPublic;
}) {
  const switcher: ReactNode = <ReviewLanguageSwitcher />;

  return (
    <ReviewI18nProvider businessDefaultLocale={display.language} slug={slug}>
      <ScanTracker businessId={display.businessId} />
      <BusinessBrandHeader
        name={display.brandName}
        logoUrl={display.logoUrl}
        controls={switcher}
      />

      <ReviewDelayedModalLazy
        googleReviewUrl={display.googleReviewUrl}
        channels={display.channels}
        directRedirect={display.directRedirect}
        pageSlug={slug}
      />

      <div className="lang-update mx-auto w-full max-w-lg flex-1 px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6">
        <div className="flex flex-col gap-5 sm:gap-5">
          <PromotionsSection banners={display.banners} />

          <section className="w-full">
            <ReviewChannels
              businessId={display.businessId}
              channels={display.channels}
              customerCareNumber={display.customerCareNumber}
              callTelHref={display.callTelHref}
            />
          </section>

          {display.resourceUrls.length > 0 ? (
            <section className="w-full">
              <ReviewDigitalResourcesLazy urls={display.resourceUrls} />
            </section>
          ) : null}

          <section className="w-full">
            <ReviewRewardGamesLazy
              key={display.businessId}
              businessId={display.businessId}
              spinEnabled={display.spinEnabled}
              scratchEnabled={display.scratchEnabled}
              rewardConfig={display.rewardConfig}
            />
          </section>

          <section id="review-flow" className="w-full">
            <ReviewRatingPlaceholder
              businessId={display.businessId}
              googleReviewUrl={display.googleReviewUrl}
              threshold={display.threshold}
              directRedirect={display.directRedirect}
              skipPreferredAutoRedirect={display.directOutboundFromReviewPage}
              allowLowRatingRedirect={display.allowLowRatingRedirect}
              channels={display.channels}
              aiReviewGenerationEnabled={display.aiReviewGenerationEnabled}
              aiGenerateLanguage={display.aiGenerateLanguage}
              aiSuggestionCount={display.aiSuggestionCount}
            />
          </section>
        </div>
      </div>

      <ReviewPageFooter settings={settings} />
    </ReviewI18nProvider>
  );
}
