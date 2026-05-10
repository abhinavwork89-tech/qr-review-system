"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useMemo, useRef } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";

function sanitizeFilenameSegment(value: string): string {
  const base = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "business";
}

type Props = {
  value: string;
  brandLabel: string;
  qrType: string;
  logoUrl?: string | null;
  size?: number;
};

export function BrandedQrTile({ value, brandLabel, qrType, logoUrl, size = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const safeBrand = sanitizeFilenameSegment(brandLabel);
  const safeType = sanitizeFilenameSegment(qrType.toLowerCase());

  const fileName = useMemo(
    () => `${safeBrand}-${safeType}-one-core-app-qr.png`,
    [safeBrand, safeType],
  );

  const imageSettings =
    logoUrl && logoUrl.trim().length > 0
      ? {
          src: logoUrl.trim(),
          height: Math.round(size * 0.22),
          width: Math.round(size * 0.22),
          excavate: true,
          /** Lets CORS-enabled hosts export PNG; without this the canvas stays tainted. */
          crossOrigin: "anonymous" as const,
        }
      : undefined;

  const handleDownload = () => {
    const tryExport = (canvas: HTMLCanvasElement | null): string | null => {
      if (!canvas) return null;
      try {
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    };

    const primary = tryExport(canvasRef.current);
    const dataUrl =
      primary ?? tryExport(fallbackCanvasRef.current);

    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950">
        <QRCodeCanvas
          ref={canvasRef}
          value={value}
          size={size}
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#111827"
          imageSettings={imageSettings}
        />
      </div>
      {/* Same QR without logo — export fallback when logo is cross-origin without CORS */}
      {imageSettings ? (
        <div className="pointer-events-none fixed left-0 top-0 -z-10 opacity-0" aria-hidden>
          <QRCodeCanvas
            ref={fallbackCanvasRef}
            value={value}
            size={size}
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#111827"
          />
        </div>
      ) : null}
      <button type="button" className={`${adminPanel.btnSecondary} text-xs`} onClick={handleDownload}>
        Download QR
      </button>
    </div>
  );
}
