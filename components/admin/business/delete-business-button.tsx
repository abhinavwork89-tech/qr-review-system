"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type Props = {
  businessId: string;
  className?: string;
  redirectTo?: string;
  confirmText?: string;
  /** Icon-only control with tooltip; keeps confirmation modal. */
  variant?: "default" | "icon";
};

export function DeleteBusinessButton({
  businessId,
  className,
  redirectTo = "/admin/businesses?deleted=1",
  confirmText = "Delete this business? This action cannot be undone.",
  variant = "default",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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
      startTransition(() => {
        router.replace(redirectTo);
        router.refresh();
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("DELETE_BUSINESS_ERROR", err);
      }
      setError("Network error while deleting business.");
    } finally {
      setLoading(false);
    }
  };

  const iconClass = `${adminPanel.btnSecondary} inline-flex h-9 w-9 shrink-0 items-center justify-center border-red-200 p-0 text-red-600 hover:border-red-300 hover:bg-red-50/80 hover:text-red-700 dark:border-red-900/50 dark:text-red-300 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60`;

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          disabled={loading}
          className={`${iconClass} ${className ?? ""}`}
          title="Delete"
          aria-label="Delete business"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
        </button>
      ) : (
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
      )}

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
