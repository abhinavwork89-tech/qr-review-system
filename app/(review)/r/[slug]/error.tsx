"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ReviewPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 text-center">
      <div className="max-w-sm space-y-2">
        <h1 className="text-lg font-semibold text-zinc-900">
          Something went wrong
        </h1>
        <p className="text-sm text-zinc-600">
          We could not load this review page. Try again, or return home.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
