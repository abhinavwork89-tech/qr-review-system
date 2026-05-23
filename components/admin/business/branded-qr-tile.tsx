"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useMemo, useRef, useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import {
  QR_ERROR_CORRECTION,
  QR_EXPORT_PX,
  QR_LOGO_SCALE,
  QR_MARGIN_MODULES,
  QR_PREVIEW_PX,
} from "@/lib/qr/qr-constants";
import { normalizeMasterQrPayloadUrl } from "@/lib/qr/qr-urls";
import { resolvePublicAppOrigin } from "@/lib/public-app-origin";

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
  /** On-screen preview size (native canvas pixels — not CSS-scaled). */
  size?: number;
  /** PNG export resolution (print-safe). */
  exportSize?: number;
  /** When set, payload is coerced to `/m/{businessId}` (blocks legacy scan/out URLs). */
  masterBusinessId?: string;
};

export function BrandedQrTile({
  value,
  brandLabel,
  qrType,
  logoUrl,
  size = QR_PREVIEW_PX,
  exportSize = QR_EXPORT_PX,
  masterBusinessId,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);
  const safeBrand = sanitizeFilenameSegment(brandLabel);
  const safeType = sanitizeFilenameSegment(qrType.toLowerCase());

  const fileName = useMemo(
    () => `${safeBrand}-${safeType}-one-core-app-qr.png`,
    [safeBrand, safeType],
  );

  const logoSrc = logoUrl?.trim() || "";

  const imageSettings = useMemo(
    () =>
      logoSrc
        ? {
            src: logoSrc,
            height: Math.round(size * QR_LOGO_SCALE),
            width: Math.round(size * QR_LOGO_SCALE),
            excavate: true,
            crossOrigin: "anonymous" as const,
          }
        : undefined,
    [logoSrc, size],
  );

  const exportImageSettings = useMemo(
    () =>
      logoSrc
        ? {
            src: logoSrc,
            height: Math.round(exportSize * QR_LOGO_SCALE),
            width: Math.round(exportSize * QR_LOGO_SCALE),
            excavate: true,
            crossOrigin: "anonymous" as const,
          }
        : undefined,
    [logoSrc, exportSize],
  );

  const payload = useMemo(() => {
    const raw = value.trim();
    if (!masterBusinessId?.trim()) return raw;
    return normalizeMasterQrPayloadUrl(
      raw,
      masterBusinessId.trim(),
      resolvePublicAppOrigin(),
    );
  }, [value, masterBusinessId]);

  const handleDownload = async () => {
    if (!payload || downloading) return;
    setDownloading(true);
    try {
      // Allow hidden export canvas (and optional logo) to paint before read.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (logoSrc) {
        await new Promise((r) => setTimeout(r, 120));
      }

      const tryExport = (canvas: HTMLCanvasElement | null): string | null => {
        if (!canvas) return null;
        try {
          return canvas.toDataURL("image/png");
        } catch {
          return null;
        }
      };

      const dataUrl =
        tryExport(exportCanvasRef.current) ?? tryExport(canvasRef.current);
      if (!dataUrl) return;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex w-full max-w-[min(100%,320px)] flex-col items-center gap-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        {payload ? (
          <QRCodeCanvas
            ref={canvasRef}
            value={payload}
            size={size}
            level={QR_ERROR_CORRECTION}
            marginSize={QR_MARGIN_MODULES}
            bgColor="#ffffff"
            fgColor="#111827"
            imageSettings={imageSettings}
          />
        ) : (
          <div
            className="flex items-center justify-center text-center text-xs text-zinc-500"
            style={{ width: size, height: size }}
          >
            No URL
          </div>
        )}
      </div>
      {payload ? (
        <div className="pointer-events-none fixed left-0 top-0 -z-10 h-0 w-0 overflow-hidden opacity-0" aria-hidden>
          <QRCodeCanvas
            ref={exportCanvasRef}
            value={payload}
            size={exportSize}
            level={QR_ERROR_CORRECTION}
            marginSize={QR_MARGIN_MODULES}
            bgColor="#ffffff"
            fgColor="#111827"
            imageSettings={exportImageSettings}
          />
        </div>
      ) : null}
      <button
        type="button"
        disabled={!payload || downloading}
        className={`${adminPanel.btnSecondary} text-xs disabled:cursor-not-allowed disabled:opacity-50`}
        onClick={() => void handleDownload()}
      >
        {downloading ? "Preparing…" : "Download QR"}
      </button>
      <p className="text-center text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
        Print file: {exportSize}×{exportSize}px PNG
      </p>
    </div>
  );
}
