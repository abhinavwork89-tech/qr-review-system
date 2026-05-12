"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useMemo, useRef } from "react";

type ReviewMasterQrProps = {
  slug: string;
  brandName?: string;
  logoUrl?: string | null;
  /** Tracked `/api/scan/out` URL for the master QR; must be set so scans log and redirect correctly. */
  trackUrl: string;
};

/** Client-only (load via `next/dynamic` with `ssr: false`) so `window` is defined. */
export default function ReviewMasterQr({ slug, brandName, logoUrl, trackUrl }: ReviewMasterQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trimmedTrack = trackUrl.trim();
  const url = trimmedTrack.length > 0 ? trimmedTrack : "";
  const size = 200;

  const imageSettings =
    logoUrl && logoUrl.trim().length > 0
      ? {
          src: logoUrl.trim(),
          height: Math.round(size * 0.22),
          width: Math.round(size * 0.22),
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

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    link.click();
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
              <QRCodeCanvas
                ref={canvasRef}
                value={url}
                size={size}
                marginSize={2}
                bgColor="#ffffff"
                fgColor="#111827"
                imageSettings={imageSettings}
              />
            ) : (
              <p className="max-w-[220px] px-2 py-6 text-center text-xs leading-relaxed text-[var(--review-muted)]">
                Master QR link is not available yet. Check that this business has an
                active master destination configured.
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
