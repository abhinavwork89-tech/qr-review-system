import { translateReview } from "@/lib/i18n/review-messages";

export default function ReviewPageLoading() {
  const loading = translateReview("en", "loading.srOnly");
  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-zinc-50"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{loading}</span>
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-5">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-zinc-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
            <div className="h-6 w-44 animate-pulse rounded bg-zinc-200" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-lg px-4 pt-5 sm:px-5 sm:pt-6">
        <div className="aspect-[5/3] w-full animate-pulse rounded-xl bg-zinc-200/90 sm:aspect-[20/9]" />
        <div className="mx-auto mt-3 flex justify-center gap-2">
          <div className="h-1.5 w-6 animate-pulse rounded-full bg-zinc-300" />
          <div className="h-1.5 w-2 animate-pulse rounded-full bg-zinc-300" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 py-6 sm:space-y-10 sm:px-5">
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="h-4 w-28 animate-pulse rounded bg-zinc-200" />
          <div className="flex justify-center sm:justify-start">
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={String(i)}
                  className="h-9 w-9 animate-pulse rounded-lg bg-zinc-200"
                />
              ))}
            </div>
          </div>
          <div className="mx-auto mt-4 h-3 max-w-[14rem] animate-pulse rounded bg-zinc-200 sm:mx-0" />
        </div>
      </div>
      <div className="mt-auto border-t border-zinc-200 px-4 py-5">
        <div className="mx-auto h-3 w-48 animate-pulse rounded bg-zinc-200" />
      </div>
    </div>
  );
}
