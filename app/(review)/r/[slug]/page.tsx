import type { Metadata } from "next";
import { ActiveReviewView } from "@/components/review/active-review-view";
import { InactiveBusinessView } from "@/components/review/inactive-business-view";
import {
  getBusinessBySlug,
  type GetBusinessBySlugResult,
} from "@/lib/data/business";
import { activeBusinessToDisplay } from "@/lib/review/display-model";
import { getGlobalAISettings } from "@/lib/ai/global-settings";
import {
  auditPublicAiEligibility,
  logPublicAiEligibilityAudit,
} from "@/lib/ai/audit-public-ai-eligibility";
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

  const [publicOrigin, globalAi] = await Promise.all([
    getServerRequestPublicOrigin(),
    getGlobalAISettings(),
  ]);
  const display = activeBusinessToDisplay(result.business, { publicOrigin, globalAi });

  if (
    process.env.AI_REVIEW_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_AI_REVIEW_DEBUG === "1"
  ) {
    const audit = auditPublicAiEligibility(globalAi, result.business);
    logPublicAiEligibilityAudit(slug, audit);
    if (audit.aiReviewGenerationEnabled !== display.aiReviewGenerationEnabled) {
      console.warn("[ai-review-audit] display flag mismatch", {
        auditEnabled: audit.aiReviewGenerationEnabled,
        displayEnabled: display.aiReviewGenerationEnabled,
        aiSuggestionCount: display.aiSuggestionCount,
        aiGenerateLanguage: display.aiGenerateLanguage,
      });
    }
  }

  if (process.env.MASTER_QR_DEBUG === "1") {
    console.warn("[master-qr:review-page]", {
      slug,
      publicOrigin,
      storedMasterQrType: result.business.master_qr_type ?? null,
      effectiveMasterQrType: display.masterQrType,
      masterOutboundUrl: display.masterOutboundUrl,
      masterQrUrl: display.masterQrUrl,
    });
  }

  return <ActiveReviewView slug={slug} display={display} />;
}
