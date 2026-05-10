"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";

type Props = {
  businessId: string;
  status: "active" | "inactive" | "deleted";
};

export function BusinessStatusToggleButton({ businessId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "deleted") return null;
  const nextStatus = status === "active" ? "inactive" : "active";

  const onToggle = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/business/${businessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof (result as { error?: unknown }).error === "string"
            ? (result as { error: string }).error
            : "Failed to update status";
        setError(message);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while updating status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        className={`${adminPanel.btnSecondary} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? "Updating..." : status === "active" ? "Set Inactive" : "Set Active"}
      </button>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
