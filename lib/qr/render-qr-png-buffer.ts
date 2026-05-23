import QRCode from "qrcode";
import {
  QR_ERROR_CORRECTION,
  QR_EXPORT_PX,
  QR_MARGIN_MODULES,
} from "@/lib/qr/qr-constants";

/** Print / email: native 1024px, level H, generous quiet zone. */
export const QR_PNG_PRINT_OPTIONS = {
  type: "png" as const,
  width: QR_EXPORT_PX,
  margin: QR_MARGIN_MODULES,
  errorCorrectionLevel: QR_ERROR_CORRECTION,
};

/** Server/API preview PNG (not CSS-scaled). */
export const QR_PNG_PREVIEW_OPTIONS = {
  type: "png" as const,
  width: 512,
  margin: QR_MARGIN_MODULES,
  errorCorrectionLevel: QR_ERROR_CORRECTION,
};

/** @deprecated Use QR_PNG_PRINT_OPTIONS or QR_PNG_PREVIEW_OPTIONS */
export const QR_PNG_RENDER_OPTIONS = QR_PNG_PREVIEW_OPTIONS;

/** Renders a PNG QR code for an absolute http(s) payload URL. */
export async function renderQrPngBuffer(
  payload: string,
  options: typeof QR_PNG_PRINT_OPTIONS = QR_PNG_PRINT_OPTIONS,
): Promise<Buffer | null> {
  const text = payload.trim();
  if (!text) return null;
  try {
    return await QRCode.toBuffer(text, options);
  } catch {
    return null;
  }
}
