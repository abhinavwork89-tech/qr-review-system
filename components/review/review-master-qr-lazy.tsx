"use client";

import dynamic from "next/dynamic";

const ReviewMasterQr = dynamic(() => import("@/components/review/review-master-qr"), {
  ssr: false,
  loading: () => null,
});

export function ReviewMasterQrLazy({ slug }: { slug: string }) {
  return <ReviewMasterQr slug={slug} />;
}
