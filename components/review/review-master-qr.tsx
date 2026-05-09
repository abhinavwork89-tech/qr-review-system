"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useMemo, useRef } from "react";

type ReviewMasterQrProps = {
  slug: string;
};

/** Client-only (load via `next/dynamic` with `ssr: false`) so `window` is defined. */
export default function ReviewMasterQr({ slug }: ReviewMasterQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `${window.location.origin}/r/${slug}`;

  const fileName = useMemo(() => {
    const normalized = slug.trim().replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-");
    const safe = normalized.replace(/^-|-$/g, "") || "review";
    return `${safe}-qr.png`;
  }, [slug]);

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
            <QRCodeCanvas
              ref={canvasRef}
              value={url}
              size={200}
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#111827"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_14%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,transparent)] px-4 py-2.5 text-sm font-medium text-[var(--review-fg)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--review-bg)_88%,var(--review-primary)_8%)] active:scale-[0.99] sm:px-5"
        >
          Download QR
        </button>
      </div>
    </section>
  );
}
