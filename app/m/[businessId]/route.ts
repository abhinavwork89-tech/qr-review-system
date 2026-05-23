import { NextRequest, NextResponse } from "next/server";
import {
  getBusinessForMasterRedirect,
  resolveMasterRedirectUrl,
} from "@/lib/data/business-master-redirect";
import { getServerRequestPublicOrigin } from "@/lib/scan/server-public-origin";

export const runtime = "nodejs";

/**
 * Master QR runtime: `/m/{businessId}` → direct redirect to configured target (no scan/out tracking).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ businessId: string }> },
) {
  const { businessId: raw } = await context.params;
  const businessId = raw?.trim() ?? "";
  if (!businessId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const row = await getBusinessForMasterRedirect(businessId);
  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }

  const origin = await getServerRequestPublicOrigin();
  const destination = resolveMasterRedirectUrl(row, origin);

  try {
    const target = new URL(destination);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return new NextResponse("Invalid destination", { status: 500 });
    }
    return NextResponse.redirect(target.href, 302);
  } catch {
    return new NextResponse("Invalid destination", { status: 500 });
  }
}
