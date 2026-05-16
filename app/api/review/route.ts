import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { emailFlowErrorWithCause, emailFlowInfo } from "@/lib/email/email-flow-log";
import { sendReviewEmail } from "@/lib/email/send-review-email";
import { enforcePublicRateLimits } from "@/lib/security/enforce-public-rate-limit";
import {
  consumePublicRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/security/public-rate-limit";
import { rejectOversizedBody } from "@/lib/security/request-body-limit";
import { createRouteLogger } from "@/lib/logging/app-logger";
import {
  parseReviewPostBody,
  type ReviewPostPayload,
} from "@/lib/validation/review-post";

const REVIEW_BODY_MAX_BYTES = 32_768;

export async function POST(request: Request) {
  const log = createRouteLogger("review", "/api/review", request.headers);
  try {
    const tooLarge = rejectOversizedBody(request, REVIEW_BODY_MAX_BYTES);
    if (tooLarge) return tooLarge;

    const limited = enforcePublicRateLimits(request.headers, [
      { prefix: "review:ip", max: 25, windowMs: 10 * 60_000 },
    ]);
    if (limited) return limited;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseReviewPostBody(json);
    if (!parsed.ok) {
      log.warn("validation_failed", { fields: parsed.fields });
      return NextResponse.json(
        { error: parsed.error, fields: parsed.fields },
        { status: 400 },
      );
    }

    const row: ReviewPostPayload = parsed.data;

    const ip = getClientIp(request.headers);
    const burst = consumePublicRateLimit(
      `review:burst:${ip}:${row.business_id}`,
      3,
      60_000,
    );
    if (!burst.allowed) {
      return rateLimitExceededResponse(burst.retryAfterSec);
    }

    const supabase = createServiceRoleClient();
    const { data: businessRow } = await supabase
      .from("businesses")
      .select("id,status,is_active,name,brand_name,email,logo_url,primary_color")
      .eq("id", row.business_id)
      .maybeSingle();
    if (!businessRow) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    const status = normalizeBusinessStatus(businessRow as Record<string, unknown>);
    if (!isBusinessActiveStatus(status)) {
      return NextResponse.json({ error: "Business no longer available" }, { status: 410 });
    }
    const { data, error } = await supabase
      .from("reviews")
      .insert([
        {
          business_id: row.business_id,
          rating: row.rating,
          review_text: row.review_text,
          name: row.name,
          email: row.email,
          mobile: row.mobile,
        },
      ])
      .select("id")
      .single();
    if (error) {
      log.error("insert_failed", { code: error.code ?? null });
      if (error.code === "23503") {
        return NextResponse.json({ error: "Invalid business" }, { status: 400 });
      }
      return NextResponse.json({ error: "Could not save review" }, { status: 500 });
    }

    const rawId =
      data && typeof data === "object" && "id" in data
        ? (data as { id: unknown }).id
        : null;
    const insertedId =
      rawId == null ? "" : typeof rawId === "string" ? rawId : String(rawId);

    if (!insertedId) {
      return NextResponse.json(
        { error: "Review was saved but the server response was incomplete." },
        { status: 500 },
      );
    }

    try {
      emailFlowInfo("lifecycle_trigger_scheduled", {
        eventTrigger: "review_submitted",
        correlationId: insertedId,
        businessId: row.business_id,
      });
      const payload = {
        rating: row.rating,
        review_text: row.review_text,
        name: row.name,
        email: row.email,
        mobile: row.mobile,
      };
      const b = businessRow as Record<string, unknown>;
      const bizName = typeof b.name === "string" ? b.name : "";
      const bizBrand =
        typeof b.brand_name === "string" && b.brand_name.trim()
          ? b.brand_name.trim()
          : bizName;
      const branding = {
        ownerFullName: bizName || "there",
        brandName: bizBrand || "your business",
        businessEmail:
          typeof b.email === "string" && b.email.trim() ? b.email.trim() : null,
        clientLogoUrl:
          typeof b.logo_url === "string" && b.logo_url.trim()
            ? b.logo_url.trim()
            : null,
        primaryColor:
          typeof b.primary_color === "string" ? b.primary_color : null,
      };
      const sendResult = await sendReviewEmail(payload, branding, {
        dedupeKey: `review_submitted:${insertedId}`,
        correlationId: insertedId,
      });
      emailFlowInfo("lifecycle_trigger_finished", {
        eventTrigger: "review_submitted",
        correlationId: insertedId,
        businessId: row.business_id,
        resendMessageId:
          sendResult && typeof sendResult === "object" && "id" in sendResult
            ? String((sendResult as { id: unknown }).id)
            : null,
        outbound:
          sendResult === null
            ? "skipped_duplicate_or_no_recipient"
            : "resend_accepted",
      });
    } catch (emailError) {
      emailFlowErrorWithCause(
        "review_submitted_email_failed",
        {
          eventTrigger: "review_submitted",
          correlationId: insertedId,
          businessId: row.business_id,
          note: "Review row was saved; email send failed.",
        },
        emailError,
      );
    }

    log.info("submitted", { reviewId: insertedId, businessId: row.business_id });
    return NextResponse.json({ ok: true, id: insertedId }, { status: 201 });
  } catch (error) {
    log.error("unhandled", {}, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
