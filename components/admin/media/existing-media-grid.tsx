"use client";

import { useState } from "react";

type Props = {
  urls: string[];
  emptyLabel: string;
  editable?: boolean;
  removingUrl?: string | null;
  onRemove?: (index: number, url: string) => void;
};

function MediaThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-28 items-center justify-center bg-zinc-100 px-2 text-center text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        Preview unavailable
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-28 w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function ExistingMediaGrid({
  urls,
  emptyLabel,
  editable = false,
  removingUrl = null,
  onRemove,
}: Props) {
  if (urls.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {urls.map((url, idx) => {
        const trimmed = url.trim();
        const busy = removingUrl === trimmed;
        return (
          <div
            key={`${trimmed}-${idx}`}
            className="relative min-h-[7rem] overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          >
            {/^https?:\/\//i.test(trimmed) ? (
              <MediaThumb src={trimmed} alt={`Image ${idx + 1}`} />
            ) : (
              <span className="block px-3 py-2 text-xs text-zinc-500">Attachment</span>
            )}
            {editable && onRemove ? (
              <button
                type="button"
                disabled={busy}
                className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white hover:bg-black/80 disabled:cursor-wait disabled:opacity-70"
                onClick={() => onRemove(idx, trimmed)}
              >
                {busy ? "Removing…" : "Remove"}
              </button>
            ) : null}
            {busy ? (
              <div
                className="pointer-events-none absolute inset-0 bg-white/50 dark:bg-zinc-950/50"
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
