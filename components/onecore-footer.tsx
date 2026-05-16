import Image from "next/image";
import { getAppSettingsPublic } from "@/lib/data/app-settings";
import { isOptimizableRemoteImageUrl } from "@/lib/images/optimizable-image-url";

export async function OneCoreFooter() {
  const s = await getAppSettingsPublic();

  let linkLabel = "OneCore";
  try {
    linkLabel =
      new URL(s.poweredByUrl.trim()).hostname.replace(/^www\./, "") || linkLabel;
  } catch {
    /* keep default */
  }

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
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-2 sm:gap-y-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-[13px] leading-snug text-[var(--review-muted)] sm:text-sm">
            Reviews powered by
          </span>
          {s.brandingLogoUrl && isOptimizableRemoteImageUrl(s.brandingLogoUrl) ? (
            <span className="relative inline-flex h-7 w-[120px] max-w-[160px] items-center">
              <Image
                src={s.brandingLogoUrl}
                alt=""
                width={160}
                height={28}
                className="h-7 w-auto max-h-7 max-w-[160px] object-contain object-center"
                sizes="160px"
              />
            </span>
          ) : s.brandingLogoUrl ? (
            <span className="relative inline-flex h-7 max-w-[160px] items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- non-Supabase branding URL */}
              <img
                src={s.brandingLogoUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-7 w-auto max-h-7 max-w-[160px] object-contain object-center"
              />
            </span>
          ) : null}
          <a
            href={s.poweredByUrl || "https://onecore.example"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold leading-snug tracking-wide text-[var(--review-primary)] underline-offset-4 hover:underline sm:text-sm"
          >
            {linkLabel}
          </a>
        </div>
        <p className="w-full text-[12px] leading-snug text-[var(--review-muted)] sm:w-auto">
          © {s.copyrightYear}
          {s.copyrightText.trim() ? ` ${s.copyrightText.trim()}` : ""}
        </p>
      </div>
    </footer>
  );
}
