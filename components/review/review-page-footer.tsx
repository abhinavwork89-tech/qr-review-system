"use client";

import Image from "next/image";
import type { AppSettingsPublic } from "@/lib/data/app-settings";
import { useReviewT } from "@/components/review/review-i18n-provider";
import { isOptimizableRemoteImageUrl } from "@/lib/images/optimizable-image-url";

export function ReviewPageFooter({ settings }: { settings: AppSettingsPublic }) {
  const t = useReviewT();
  const s = settings;

  let linkLabel = "OneCore";
  try {
    linkLabel =
      new URL(s.poweredByUrl.trim()).hostname.replace(/^www\./, "") || linkLabel;
  } catch {
    /* keep default */
  }

  return (
    <footer
      className="mt-3 px-3 sm:px-3 py-4 client-footer bg-[var(--review-primary)] text-white"
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-2 sm:gap-y-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {s.brandingLogoUrl ? (
              <div className="relative inline-flex  items-center">
                {isOptimizableRemoteImageUrl(s.brandingLogoUrl) ? (
                  <Image
                    src={s.brandingLogoUrl}
                    alt=""
                    width={200}
                    height={48}
                    className="h-12 w-auto max-h-12 max-w-auto object-contain object-center"
                    sizes="160px"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- non-Supabase branding URL */
                  <img
                    src={s.brandingLogoUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-auto max-h-12 max-w-auto object-contain object-center"
                  />
                )}
              </div>
            ) : null}
            <div>

            </div>
          </div>
          <span className="text-[14px] leading-snug text-white sm:text-sm">
            {t("footer.poweredBy")} 
          </span> {"|"}
          <a
            href={s.poweredByUrl || "https://onecoreapp.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-semibold leading-snug tracking-wide text-white underline-offset-4 hover:underline sm:text-sm"
          >{linkLabel}
          </a>
        </div>
        <p className="w-full max-w-full text-[12px] leading-snug text-white sm:w-auto mt-1 sm:mt-3">
          © {s.copyrightYear}
          {s.copyrightText.trim() ? ` ${s.copyrightText.trim()}` : ""}
        </p>
      </div>
    </footer>
  );
}
