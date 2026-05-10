"use client";

import { useEffect } from "react";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin panel]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-200/80 bg-red-50/90 px-6 py-8 text-center shadow-sm dark:border-red-900/50 dark:bg-red-950/40">
      <h2 className="text-base font-semibold text-red-900 dark:text-red-100">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-red-800/90 dark:text-red-200/90">
        {error.message || "An unexpected error occurred in the admin panel."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
