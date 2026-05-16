import { NextResponse } from "next/server";
import { getAppSettingsPublic } from "@/lib/data/app-settings";

/** Public read-only branding/footer settings for review pages. */
export async function GET() {
  try {
    const settings = await getAppSettingsPublic();
    return NextResponse.json(settings, { status: 200 });
  } catch (err) {
    console.error("[app-settings]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
