"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

const DEBOUNCE_MS = 350;

function buildListUrl(pathname: string, base: URLSearchParams, q: string | null): string {
  const params = new URLSearchParams(base.toString());
  const trimmed = (q ?? "").trim();
  if (trimmed) params.set("q", trimmed);
  else params.delete("q");
  params.set("page", "1");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function BusinessListSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [input, setInput] = useState(() => searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedRef = useRef((searchParams.get("q") ?? "").trim());

  useEffect(() => {
    const sp = new URLSearchParams(searchParamsKey);
    const qTrim = (sp.get("q") ?? "").trim();
    if (qTrim !== lastAppliedRef.current) {
      setInput(sp.get("q") ?? "");
      lastAppliedRef.current = qTrim;
    }
  }, [searchParamsKey]);

  const pushUrl = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === lastAppliedRef.current) return;
      lastAppliedRef.current = trimmed;
      const params = new URLSearchParams(searchParamsKey);
      const url = buildListUrl(pathname, params, trimmed);
      startTransition(() => {
        router.replace(url);
      });
    },
    [pathname, router, searchParamsKey],
  );

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed === lastAppliedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      pushUrl(input);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, pushUrl]);

  const clear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setInput("");
    lastAppliedRef.current = "";
    const url = buildListUrl(pathname, new URLSearchParams(searchParamsKey), "");
    startTransition(() => {
      router.replace(url);
    });
  };

  const showClear = input.length > 0;

  return (
    <label className="relative block w-full sm:max-w-xs">
      <span className="sr-only">Search businesses</span>
      <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-zinc-400">
        {isPending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : <Search className="h-4 w-4 shrink-0" aria-hidden />}
      </span>
      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search by name or mobile…"
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 py-2.5 pl-10 pr-10 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-400/25"
      />
      {showClear ? (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          title="Clear search"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </label>
  );
}
