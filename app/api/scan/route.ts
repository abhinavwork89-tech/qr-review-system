import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { hasRecentScanLog } from "@/lib/scan/scan-log-dedupe";
import { normalizeScanQrTypeParam, type ScanQrType } from "@/lib/scan/qr-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REFERRER_MAX = 2048;

type ScanPostBody = {
  business_id: string;
  event_type: "scan";
  qr_type: ScanQrType;
  referrer: string | null;
};

function parseScanBody(input: unknown):
  | { ok: true; data: ScanPostBody }
  | { ok: false; error: string; fields?: Record<string, string> } {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const body = input as Record<string, unknown>;
  const businessId =
    typeof body.business_id === "string" ? body.business_id.trim() : "";
  const eventType =
    typeof body.event_type === "string" ? body.event_type.trim() : "";

  const fields: Record<string, string> = {};
  if (!businessId) {
    fields.business_id = "Required";
  } else if (!UUID_RE.test(businessId)) {
    fields.business_id = "Must be a valid UUID";
  }

  if (eventType !== "scan") {
    fields.event_type = 'Must be "scan"';
  }

  const rawQr =
    typeof body.qr_type === "string" ? body.qr_type.trim() : "";
  let qrType: ScanQrType = "master";
  if (rawQr) {
    const normalized = normalizeScanQrTypeParam(rawQr);
    if (!normalized) {
      fields.qr_type = "Invalid qr_type";
    } else {
      qrType = normalized;
    }
  }

  let referrer: string | null = null;
  if (body.referrer !== undefined && body.referrer !== null) {
    if (typeof body.referrer !== "string") {
      fields.referrer = "Must be a string";
    } else {
      const r = body.referrer.trim();
      referrer = r ? r.slice(0, REFERRER_MAX) : null;
    }
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Validation failed", fields };
  }

  return {
    ok: true,
    data: {
      business_id: businessId,
      event_type: "scan",
      qr_type: qrType,
      referrer,
    },
  };
}

export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseScanBody(json);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: parsed.error,
          ...(parsed.fields ? { fields: parsed.fields } : {}),
        },
        { status: 400 },
      );
    }

    const headerUa = request.headers.get("user-agent");
    const headerRef =
      request.headers.get("referer") ?? request.headers.get("referrer");

    const payload = {
      business_id: parsed.data.business_id,
      event_type: parsed.data.event_type,
      device: headerUa,
      qr_type: parsed.data.qr_type,
      referrer: parsed.data.referrer ?? headerRef,
    };

    const supabase = createServiceRoleClient();
    const { data: businessRow } = await supabase
      .from("businesses")
      .select("id,status,is_active")
      .eq("id", payload.business_id)
      .maybeSingle();
    if (!businessRow) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    const status = normalizeBusinessStatus(businessRow as Record<string, unknown>);
    if (!isBusinessActiveStatus(status)) {
      return NextResponse.json({ error: "Business no longer available" }, { status: 410 });
    }

    const dup = await hasRecentScanLog(
      supabase,
      payload.business_id,
      payload.qr_type,
    );
    if (dup) {
      return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("scan_logs")
      .insert([payload])
      .select("id")
      .single();

    if (error) {
      console.error("SUPABASE SCAN LOG INSERT:", error.message, error);
      return NextResponse.json(
        { error: error.message, ...(error.code ? { code: error.code } : {}) },
        { status: error.code === "23503" ? 400 : 500 },
      );
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/scan ERROR:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
