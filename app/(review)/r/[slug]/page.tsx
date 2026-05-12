import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActiveReviewView } from "@/components/review/active-review-view";
import { InactiveBusinessView } from "@/components/review/inactive-business-view";
import {
  getBusinessBySlug,
  type GetBusinessBySlugResult,
} from "@/lib/data/business";
import { activeBusinessToDisplay } from "@/lib/review/display-model";
import { getServerRequestPublicOrigin } from "@/lib/scan/server-public-origin";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = raw.trim();
  if (!slug) {
    return { title: "Service unavailable" };
  }

  let result: GetBusinessBySlugResult;
  try {
    result = await getBusinessBySlug(slug);
  } catch {
    return { title: "Service unavailable" };
  }

  if (result.status === "not_found" || result.status === "inactive") {
    return { title: "Service unavailable" };
  }

  const name =
    result.business.brand_name?.trim() ||
    result.business.name?.trim() ||
    "Review";
  return { title: `Review · ${name}` };
}

export default async function ReviewPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = raw.trim();
  if (!slug) {
    return <InactiveBusinessView />;
  }

  let result: GetBusinessBySlugResult;
  try {
    result = await getBusinessBySlug(slug);
  } catch {
    return <InactiveBusinessView />;
  }

  if (result.status === "not_found" || result.status === "inactive") {
    return <InactiveBusinessView />;
  }

  const publicOrigin = await getServerRequestPublicOrigin();
  const display = activeBusinessToDisplay(result.business, { publicOrigin });

  if (process.env.MASTER_QR_DEBUG === "1") {
    console.warn("[master-qr:review-page]", {
      slug,
      publicOrigin,
      storedMasterQrType: result.business.master_qr_type ?? null,
      effectiveMasterQrType: display.masterQrType,
      directRedirectRaw: result.business.direct_redirect,
      directRedirectResolved: display.directRedirect,
      masterOutboundUrl: display.masterOutboundUrl,
      directOutboundFromReviewPage: display.directOutboundFromReviewPage,
      masterQrTrackUrl: display.masterQrTrackUrl,
    });
  }

  if (display.directOutboundFromReviewPage) {
    redirect(display.masterQrTrackUrl);
  }

  return <ActiveReviewView slug={slug} display={display} />;
}
