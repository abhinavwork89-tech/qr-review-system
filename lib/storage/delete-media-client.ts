/**
 * Client-side delete for uploaded business-media objects (admin session required).
 */

export type DeleteMediaResult = {
  ok: boolean;
  removed: number;
  error?: string;
};

export async function deleteMediaUrls(
  urls: string[],
  options?: { businessSlug?: string },
): Promise<DeleteMediaResult> {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  if (unique.length === 0) return { ok: true, removed: 0 };

  const res = await fetch("/api/upload/media", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: unique,
      ...(options?.businessSlug ? { businessSlug: options.businessSlug } : {}),
    }),
  });

  const result: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof (result as { error?: unknown }).error === "string"
        ? (result as { error: string }).error
        : "Delete failed";
    return { ok: false, removed: 0, error: message };
  }

  const removed =
    typeof result === "object" &&
    result !== null &&
    "removed" in result &&
    typeof (result as { removed?: unknown }).removed === "number"
      ? (result as { removed: number }).removed
      : unique.length;

  return { ok: true, removed };
}
