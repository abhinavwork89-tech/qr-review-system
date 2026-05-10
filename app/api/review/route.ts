import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { sendReviewEmail } from "@/lib/email/send-review-email";
import {
  parseReviewPostBody,
  type ReviewPostPayload,
} from "@/lib/validation/review-post";

export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseReviewPostBody(json);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fields: parsed.fields },
        { status: 400 },
      );
    }

    const row: ReviewPostPayload = parsed.data;

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
      console.error("SUPABASE REVIEWS INSERT:", error.message, error);
      return NextResponse.json(
        {
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
        },
        { status: error.code === "23503" ? 400 : 500 },
      );
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
      await sendReviewEmail(payload, branding, {
        dedupeKey: `review_submitted:${insertedId}`,
      });
    } catch (emailError) {
      console.error("REVIEW EMAIL SEND ERROR:", emailError);
    }

    return NextResponse.json({ ok: true, id: insertedId }, { status: 201 });
  } catch (error) {
    console.error("API ERROR:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
