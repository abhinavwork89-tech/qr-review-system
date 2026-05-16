/** Client-side debug logging — no-op in production builds. */
export function clientDevError(context: string, err: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  const msg = err instanceof Error ? err.message : String(err);
  console.error(context, msg);
}
