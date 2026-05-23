/** Shared QR module settings — keep preview + export aligned across admin, review, and email. */

export const QR_ERROR_CORRECTION = "H" as const;

/** Quiet zone (modules) around the code — print-safe. */
export const QR_MARGIN_MODULES = 4;

/** On-screen preview (CSS pixels; not scaled for export). */
export const QR_PREVIEW_PX = 260;

/** PNG export / email attachment (native pixels). */
export const QR_EXPORT_PX = 1024;

/** Center logo as a fraction of QR width (matches qrcode.react excavate). */
export const QR_LOGO_SCALE = 0.22;
