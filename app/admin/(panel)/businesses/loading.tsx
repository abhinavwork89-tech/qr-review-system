export default function BusinessListLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="h-16 w-56 animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        <div className="h-10 w-32 animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="h-10 w-full max-w-xs animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-200/80 dark:bg-zinc-800/80" />
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800">
          <div className="min-w-[1040px] space-y-0 divide-y divide-zinc-200/80 dark:divide-zinc-800">
            <div className="h-11 animate-pulse bg-zinc-100/90 dark:bg-zinc-950/60" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                <div className="h-4 w-6 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
                <div className="h-4 flex-1 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
                <div className="h-4 w-24 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
                <div className="h-4 w-28 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
                <div className="h-4 w-20 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 h-12 animate-pulse rounded-xl bg-zinc-100/80 dark:bg-zinc-950/50" />
      </div>
    </div>
  );
}
