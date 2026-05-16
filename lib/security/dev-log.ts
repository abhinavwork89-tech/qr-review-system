/**
 * Ad-hoc debug logging — no-op in production builds.
 * Prefer `createRouteLogger` from `@/lib/logging/app-logger` for API routes.
 */
export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === "production") return;
  console.log(...args);
}

export function devWarn(...args: unknown[]): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(...args);
}