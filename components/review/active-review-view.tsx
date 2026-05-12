import { getAppSettingsPublic } from "@/lib/data/app-settings";
import { ReviewExperienceClient } from "@/components/review/review-experience-client";
import { ReviewThemeShell } from "@/components/review/review-theme-shell";
import {
  type ReviewDisplayModel,
  reviewDisplayToCssVars,
} from "@/lib/review/display-model";
import { normalizeReviewLocale } from "@/lib/i18n/review-locale";

export async function ActiveReviewView({
  slug,
  display,
}: {
  slug: string;
  display: ReviewDisplayModel;
}) {
  const settings = await getAppSettingsPublic();
  const shellLang = normalizeReviewLocale(display.language);

  return (
    <ReviewThemeShell lang={shellLang} style={reviewDisplayToCssVars(display)}>
      <ReviewExperienceClient slug={slug} display={display} settings={settings} />
    </ReviewThemeShell>
  );
}
