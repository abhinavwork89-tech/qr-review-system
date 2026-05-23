"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useMemo, useRef, useState } from "react";
import {
  QR_ERROR_CORRECTION,
  QR_EXPORT_PX,
  QR_LOGO_SCALE,
  QR_MARGIN_MODULES,
} from "@/lib/qr/qr-constants";
import { normalizeMasterQrPayloadUrl } from "@/lib/qr/qr-urls";
import { resolvePublicAppOrigin } from "@/lib/public-app-origin";

type ReviewMasterQrProps = {
  slug: string;
  brandName?: string;
  logoUrl?: string | null;
  businessId: string;
  /** Permanent master QR payload `/m/{businessId}`. */
  masterQrUrl: string;
};

/** Client-only (load via `next/dynamic` with `ssr: false`) so `window` is defined. */
export default function ReviewMasterQr({
  slug,
  brandName,
  logoUrl,
  businessId,
  masterQrUrl,
}: ReviewMasterQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  const url = useMemo(
    () =>
      normalizeMasterQrPayloadUrl(
        masterQrUrl,
        businessId,
        resolvePublicAppOrigin(),
      ).trim(),
    [masterQrUrl, businessId],
  );
  const size = 220;
  const exportSize = QR_EXPORT_PX;
  const [downloading, setDownloading] = useState(false);

  const imageSettings =
    logoUrl && logoUrl.trim().length > 0
      ? {
          src: logoUrl.trim(),
          height: Math.round(size * QR_LOGO_SCALE),
          width: Math.round(size * QR_LOGO_SCALE),
          excavate: true,
        }
      : undefined;

  const fileName = useMemo(() => {
    const brandPart = (brandName ?? slug)
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "business";
    return `${brandPart}-master.png`;
  }, [brandName, slug]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (logoUrl?.trim()) {
        await new Promise((r) => setTimeout(r, 120));
      }
      const canvas = exportCanvasRef.current ?? canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section
      aria-label="Share this page"
      className="shrink-0 border-b border-[color-mix(in_srgb,var(--review-fg)_10%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_92%,var(--review-primary)_3%)] px-4 py-5 sm:px-5 sm:py-6"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--review-muted)]">
          Scan & Share
        </p>
        <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-white/90 p-3 shadow-sm sm:p-4">
          <div className="flex justify-center">
            {url ? (
              <>
                <QRCodeCanvas
                  ref={canvasRef}
                  value={url}
                  size={size}
                  level={QR_ERROR_CORRECTION}
                  marginSize={QR_MARGIN_MODULES}
                  bgColor="#ffffff"
                  fgColor="#111827"
                  imageSettings={imageSettings}
                />
                <div className="pointer-events-none fixed left-0 top-0 -z-10 opacity-0" aria-hidden>
                  <QRCodeCanvas
                    ref={exportCanvasRef}
                    value={url}
                    size={exportSize}
                    level={QR_ERROR_CORRECTION}
                    marginSize={QR_MARGIN_MODULES}
                    bgColor="#ffffff"
                    fgColor="#111827"
                    imageSettings={
                      logoUrl?.trim()
                        ? {
                            src: logoUrl.trim(),
                            height: Math.round(exportSize * QR_LOGO_SCALE),
                            width: Math.round(exportSize * QR_LOGO_SCALE),
                            excavate: true,
                          }
                        : undefined
                    }
                  />
                </div>
              </>
            ) : (
              <p className="max-w-[220px] px-2 py-6 text-center text-xs leading-relaxed text-[var(--review-muted)]">
                Master QR is not available yet.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={!url}
          onClick={handleDownload}
          className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,transparent)] px-4 py-2.5 text-sm font-medium text-[var(--review-fg)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--review-bg)_88%,var(--review-primary)_8%)] active:scale-[0.99] enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 sm:px-5"
        >
          Download QR
        </button>
      </div>
    </section>
  );
}
