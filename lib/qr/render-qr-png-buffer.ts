import QRCode from "qrcode";

export const QR_PNG_RENDER_OPTIONS = {
  type: "png" as const,
  width: 220,
  margin: 1,
  errorCorrectionLevel: "M" as const,
};

/** Renders a PNG QR code for an absolute http(s) payload URL. */
export async function renderQrPngBuffer(payload: string): Promise<Buffer | null> {
  const text = payload.trim();
  if (!text) return null;
  try {
    return await QRCode.toBuffer(text, QR_PNG_RENDER_OPTIONS);
  } catch {
    return null;
  }
}
