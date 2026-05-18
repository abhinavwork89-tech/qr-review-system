export const SCAN_QR_TYPES = [
  "master",
  "google",
  "instagram",
  "facebook",
  "youtube",
  "whatsapp",
  "website",
  "x",
  "resource",
] as const;

export type ScanQrType = (typeof SCAN_QR_TYPES)[number];

const SET = new Set<string>(SCAN_QR_TYPES);

export function isScanQrType(value: string): value is ScanQrType {
  return SET.has(value);
}

export function normalizeScanQrTypeParam(raw: string): ScanQrType | null {
  const t = raw.trim().toLowerCase();
  if (t === "twitter") return "x";
  if (isScanQrType(t)) return t;
  return null;
}

/** Admin QR link card label → stored qr_type */
export function adminQrLabelToScanType(label: string): ScanQrType | null {
  const key = label.trim().toLowerCase();
  if (key === "google") return "google";
  if (key === "instagram") return "instagram";
  if (key === "facebook") return "facebook";
  if (key === "youtube") return "youtube";
  if (key === "whatsapp") return "whatsapp";
  if (key === "website") return "website";
  if (key === "x") return "x";
  if (key.startsWith("resource")) return "resource";
  return null;
}

/** Preferred public URL label from getPreferredPublicUrl → scan type */
export function reviewSourceLabelToScanType(label: string): ScanQrType {
  const key = label.trim().toLowerCase();
  if (key === "instagram") return "instagram";
  if (key === "facebook") return "facebook";
  if (key === "youtube") return "youtube";
  if (key === "whatsapp") return "whatsapp";
  if (key === "website") return "website";
  if (key === "x") return "x";
  return "google";
}

export function displayQrTypeLabel(qrType: string | null | undefined): string {
  if (!qrType) return "Legacy";
  switch (qrType) {
    case "master":
      return "Master";
    case "x":
      return "X (Twitter)";
    case "resource":
      return "Resource";
    default:
      return qrType.charAt(0).toUpperCase() + qrType.slice(1);
  }
}
