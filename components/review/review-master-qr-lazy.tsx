"use client";

import dynamic from "next/dynamic";

const ReviewMasterQr = dynamic(() => import("@/components/review/review-master-qr"), {
  ssr: false,
  loading: () => null,
});

export function ReviewMasterQrLazy({
  slug,
  brandName,
  logoUrl,
}: {
  slug: string;
  brandName?: string;
  logoUrl?: string | null;
}) {
  return <ReviewMasterQr slug={slug} brandName={brandName} logoUrl={logoUrl} />;
}
