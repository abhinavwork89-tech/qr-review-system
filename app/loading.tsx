export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/35 backdrop-blur-[1px]">
      <div
        className="flex items-center gap-3 rounded-xl border border-zinc-200/70 bg-white px-4 py-3 shadow-md dark:border-zinc-700 dark:bg-zinc-900"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-zinc-600 dark:border-t-indigo-400"
          aria-hidden
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Loading...
        </span>
      </div>
    </div>
  );
}
