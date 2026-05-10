import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_COOKIE_VALUE } from "@/lib/admin-auth";

/**
 * For Route Handlers under `/api/admin/*` (middleware does not protect `/api`).
 * Returns a 401 JSON response if the admin session cookie is missing/invalid.
 */
export async function requireAdminSession(): Promise<NextResponse | null> {
  const store = await cookies();
  if (store.get(ADMIN_SESSION_COOKIE)?.value !== ADMIN_SESSION_COOKIE_VALUE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
