import { NextResponse } from "next/server";
import { getAppSettingsPublic } from "@/lib/data/app-settings";

/** Public read-only branding/footer settings for review pages. */
export async function GET() {
  try {
    const settings = await getAppSettingsPublic();
    return NextResponse.json(settings, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
