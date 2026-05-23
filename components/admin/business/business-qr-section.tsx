"use client";

import { useCallback, useRef, useState } from "react";
import { BrandedQrTile } from "@/components/admin/business/branded-qr-tile";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { QR_PREVIEW_PX } from "@/lib/qr/qr-constants";
import { normalizeMasterQrPayloadUrl } from "@/lib/qr/qr-urls";
import { resolvePublicAppOrigin } from "@/lib/public-app-origin";

export type BusinessQrSectionVariant = "master" | "client-review";

type Props = {
  title: string;
  description: string;
  payloadUrl: string;
  brandLabel: string;
  qrType: string;
  logoUrl?: string | null;
  variant: BusinessQrSectionVariant;
  /** Required for master variant — enforces `/m/{businessId}` payload. */
  businessId?: string;
  /** Shown on Master QR only — current master target label. */
  targetLabel?: string;
  previewSize?: number;
};

const VARIANT_STYLES: Record<
  BusinessQrSectionVariant,
  { ring: string; badge: string; badgeText: string }
> = {
  master: {
    ring: "border-indigo-200/90 dark:border-indigo-800/80",
    badge: "bg-indigo-100 dark:bg-indigo-950/60",
    badgeText: "text-indigo-900 dark:text-indigo-100",
  },
  "client-review": {
    ring: "border-emerald-200/90 dark:border-emerald-800/80",
    badge: "bg-emerald-100 dark:bg-emerald-950/60",
    badgeText: "text-emerald-900 dark:text-emerald-100",
  },
};

export function BusinessQrSection({
  title,
  description,
  payloadUrl,
  brandLabel,
  qrType,
  logoUrl,
  variant,
  businessId,
  targetLabel,
  previewSize = QR_PREVIEW_PX,
}: Props) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = VARIANT_STYLES[variant];

  const encodedPayload =
    variant === "master" && businessId?.trim()
      ? normalizeMasterQrPayloadUrl(payloadUrl, businessId.trim(), resolvePublicAppOrigin())
      : payloadUrl.trim();

  const canShow = encodedPayload.length > 0;

  const handleCopy = useCallback(async () => {
    const url = encodedPayload;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [encodedPayload]);

  return (
    <div
      className={`rounded-2xl border-2 bg-white p-4 shadow-sm dark:bg-zinc-900/80 sm:p-5 ${styles.ring}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </p>
        {variant === "master" && targetLabel ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${styles.badge} ${styles.badgeText}`}
          >
            Target: {targetLabel}
          </span>
        ) : variant === "client-review" ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${styles.badge} ${styles.badgeText}`}
          >
            Fixed review page
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
      {!canShow ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          QR is not available until the business is active and links are configured.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/30">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              QR payload
            </p>
            <code className="mt-1 block break-all text-xs text-zinc-800 dark:text-zinc-200">
              {encodedPayload}
            </code>
          </div>
          <div className="flex w-full flex-col items-center justify-center gap-3">
            <BrandedQrTile
              value={encodedPayload}
              brandLabel={brandLabel}
              qrType={qrType}
              logoUrl={logoUrl}
              size={previewSize}
              masterBusinessId={variant === "master" ? businessId : undefined}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className={`${adminPanel.btnSecondary} text-xs`}
              onClick={() => void handleCopy()}
            >
              {copied ? "Copied" : "Copy URL"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
