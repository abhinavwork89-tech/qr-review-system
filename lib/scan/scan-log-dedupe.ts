import type { SupabaseClient } from "@supabase/supabase-js";

/** Skip logging when the same business + QR type was recorded moments ago (refresh / double-tap). */
const DEDUPE_WINDOW_MS = 60_000;

export async function hasRecentScanLog(
  supabase: SupabaseClient,
  businessId: string,
  qrType: string,
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("scan_logs")
    .select("id")
    .eq("business_id", businessId)
    .eq("qr_type", qrType)
    .gte("created_at", since)
    .limit(1);

  if (error) {
    console.warn("[scan_logs] dedupe check failed", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
