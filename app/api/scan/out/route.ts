import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessActiveStatus, normalizeBusinessStatus } from "@/lib/business/status";
import { hasRecentScanLog } from "@/lib/scan/scan-log-dedupe";
import { normalizeScanQrTypeParam, type ScanQrType } from "@/lib/scan/qr-types";
import { isScanDestinationAllowed } from "@/lib/scan/verify-scan-destination";
import { isSafeHttpUrl } from "@/lib/review/business-config";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const businessId = sp.get("b")?.trim() ?? "";
  const tRaw = sp.get("t")?.trim() ?? "";
  const uRaw = sp.get("u")?.trim() ?? "";

  if (!businessId || !UUID_RE.test(businessId)) {
    return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
  }

  const qrType = normalizeScanQrTypeParam(tRaw);
  if (!qrType) {
    return NextResponse.json({ error: "Invalid QR type" }, { status: 400 });
  }

  let destination: string;
  try {
    destination = decodeURIComponent(uRaw);
  } catch {
    return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
  }

  if (!destination || !isSafeHttpUrl(destination)) {
    return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: row, error: rowErr } = await supabase
    .from("businesses")
    .select(
      "id,status,is_active,slug,google_url,channels,resource_urls,whatsapp_country_code,whatsapp_number,master_qr_type",
    )
    .eq("id", businessId)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const status = normalizeBusinessStatus(row as Record<string, unknown>);
  if (!isBusinessActiveStatus(status)) {
    return NextResponse.json({ error: "Business no longer available" }, { status: 410 });
  }

  const slug = typeof (row as Record<string, unknown>).slug === "string" ? String((row as Record<string, unknown>).slug).trim() : "";
  const reviewUrl = slug
    ? `${request.nextUrl.origin}/r/${encodeURIComponent(slug)}`
    : request.nextUrl.origin;

  const scanRow = {
    google_url:
      typeof row.google_url === "string" ? row.google_url : null,
    channels: row.channels,
    resource_urls: row.resource_urls,
    whatsapp_country_code:
      typeof (row as Record<string, unknown>).whatsapp_country_code === "string"
        ? ((row as Record<string, unknown>).whatsapp_country_code as string)
        : null,
    whatsapp_number:
      typeof (row as Record<string, unknown>).whatsapp_number === "string"
        ? ((row as Record<string, unknown>).whatsapp_number as string)
        : null,
    slug,
    master_qr_type:
      typeof (row as Record<string, unknown>).master_qr_type === "string"
        ? ((row as Record<string, unknown>).master_qr_type as string)
        : null,
  };

  if (!isScanDestinationAllowed(scanRow, qrType as ScanQrType, destination, reviewUrl)) {
    return NextResponse.json({ error: "Destination not allowed" }, { status: 400 });
  }

  const ua = request.headers.get("user-agent");
  const ref =
    request.headers.get("referer") ??
    request.headers.get("referrer") ??
    null;

  const dup = await hasRecentScanLog(supabase, businessId, qrType);
  if (!dup) {
    const { error: insErr } = await supabase.from("scan_logs").insert([
      {
        business_id: businessId,
        event_type: "scan",
        device: ua,
        qr_type: qrType,
        referrer: ref,
      },
    ]);
    if (insErr) {
      console.error("[scan_logs] out insert", insErr.message);
    }
  }

  return NextResponse.redirect(destination, 302);
}
