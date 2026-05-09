"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type Props = {
  businessId: string;
  className?: string;
  redirectTo?: string;
  confirmText?: string;
};

export function DeleteBusinessButton({
  businessId,
  className,
  redirectTo = "/admin/businesses?deleted=1",
  confirmText = "Delete this business? This action cannot be undone.",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/business/${businessId}`, {
        method: "DELETE",
      });
      const result: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof (result as { error?: unknown }).error === "string"
            ? (result as { error: string }).error
            : "Failed to delete business";
        setError(message);
        return;
      }

      setOpen(false);
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("DELETE_BUSINESS_ERROR", err);
      }
      setError("Network error while deleting business.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={loading}
        className={`${adminPanel.btnSecondary} text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
      >
        {loading ? "Deleting..." : "Delete"}
      </button>

      <ConfirmModal
        open={open}
        title="Confirm deletion"
        description={confirmText}
        errorText={error}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        loading={loading}
        onCancel={() => {
          if (!loading) setOpen(false);
        }}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
