import type { ReactNode } from "react";

/** Shared visual + identity context for all transactional templates. */
export type EmailBrandContext = {
  oneCoreLogoUrl: string | null;
  clientBrandLogoUrl: string | null;
  /** Normalized hex, e.g. from `sanitizePrimaryColor`. */
  primaryColor: string;
  ownerFullName: string;
  brandName: string;
  footerCopyrightYear: number;
};

export type QrImageAsset = {
  src: string;
  alt: string;
};

export type MasterEmailLayoutProps = EmailBrandContext & {
  previewText?: string;
  title: string;
  greeting: string;
  mainMessage: ReactNode;
  ctaText?: string;
  ctaUrl?: string;
  qrImages?: QrImageAsset[];
};
