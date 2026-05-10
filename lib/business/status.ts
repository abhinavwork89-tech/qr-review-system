export type BusinessStatus = "active" | "inactive" | "deleted";

export function normalizeBusinessStatus(input: {
  status?: unknown;
  is_active?: unknown;
}): BusinessStatus {
  const rawStatus = typeof input.status === "string" ? input.status.trim().toLowerCase() : "";
  if (rawStatus === "active" || rawStatus === "inactive" || rawStatus === "deleted") {
    return rawStatus;
  }
  return input.is_active === false ? "inactive" : "active";
}

export function isBusinessActiveStatus(status: BusinessStatus): boolean {
  return status === "active";
}
