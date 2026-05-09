import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
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
    console.log("INSERT PAYLOAD:", row);

    console.log("STEP 1: API HIT");

    const supabase = createServiceRoleClient();
console.log("STEP 2: SUPABASE CLIENT CREATED");
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
console.log("STEP 3: INSERT DONE");
    if (error) {
      console.error("SUPABASE REVIEWS INSERT:", error.message, error);
 console.log("STEP ERROR BEFORE EMAIL");
      return NextResponse.json(
        {
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
        },
        { status: error.code === "23503" ? 400 : 500 },
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
      console.log("EMAIL START");
      console.log("SENDING EMAIL WITH:", payload);
      await sendReviewEmail(payload);
    } catch (emailError) {
      console.error("REVIEW EMAIL SEND ERROR:", emailError);
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error("API ERROR:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
