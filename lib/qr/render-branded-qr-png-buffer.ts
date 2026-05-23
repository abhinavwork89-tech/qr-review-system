import { isSafeHttpUrl } from "@/lib/review/business-config";
import {
  QR_EXPORT_PX,
  QR_LOGO_SCALE,
  QR_MARGIN_MODULES,
} from "@/lib/qr/qr-constants";
import { renderQrPngBuffer, QR_PNG_PRINT_OPTIONS } from "@/lib/qr/render-qr-png-buffer";

export type BrandedQrPngOptions = {
  logoUrl?: string | null;
  /** Output edge length in pixels (default 1024). */
  size?: number;
};

/**
 * Print-quality PNG QR with optional center logo (server-side).
 * Falls back to unbranded QR if logo fetch or compositing fails.
 */
export async function renderBrandedQrPngBuffer(
  payload: string,
  options?: BrandedQrPngOptions,
): Promise<Buffer | null> {
  const size = options?.size ?? QR_EXPORT_PX;
  const base = await renderQrPngBuffer(payload, {
    ...QR_PNG_PRINT_OPTIONS,
    width: size,
    margin: QR_MARGIN_MODULES,
  });
  if (!base) return null;

  const logoUrl = options?.logoUrl?.trim() ?? "";
  if (!logoUrl || !isSafeHttpUrl(logoUrl)) return base;

  try {
    const sharp = (await import("sharp")).default;
    const logoRes = await fetch(logoUrl, { signal: AbortSignal.timeout(12_000) });
    if (!logoRes.ok) return base;

    const logoRaw = Buffer.from(await logoRes.arrayBuffer());
    const qrImage = sharp(base);
    const meta = await qrImage.metadata();
    const edge = meta.width ?? size;
    const logoEdge = Math.max(32, Math.round(edge * QR_LOGO_SCALE));
    const pad = Math.max(6, Math.round(logoEdge * 0.14));
    const plateEdge = logoEdge + pad * 2;

    const whitePlate = await sharp({
      create: {
        width: plateEdge,
        height: plateEdge,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const logoPng = await sharp(logoRaw)
      .resize(logoEdge, logoEdge, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    const plateLeft = Math.round((edge - plateEdge) / 2);
    const plateTop = Math.round((edge - plateEdge) / 2);
    const logoLeft = plateLeft + pad;
    const logoTop = plateTop + pad;

    return await qrImage
      .composite([
        { input: whitePlate, left: plateLeft, top: plateTop },
        { input: logoPng, left: logoLeft, top: logoTop },
      ])
      .png({ compressionLevel: 6, quality: 100, effort: 7 })
      .toBuffer();
  } catch {
    return base;
  }
}
