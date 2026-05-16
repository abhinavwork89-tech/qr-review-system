"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function GlobalPageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const inFlightRef = useRef(0);
  const navPendingRef = useRef(false);

  useEffect(() => {
    if (!navPendingRef.current) return;
    navPendingRef.current = false;
    if (inFlightRef.current === 0) {
      setVisible(false);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const sync = () => {
      setVisible(navPendingRef.current || inFlightRef.current > 0);
    };

    window.fetch = (async (...args: Parameters<typeof fetch>) => {
      inFlightRef.current += 1;
      sync();
      try {
        return await originalFetch(...args);
      } finally {
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
        // Submit / click can set navPending expecting a route change. If no navigation
        // happens (e.g. login error on same URL), pathname never updates — clear pending
        // once all wrapped fetches finish so the overlay cannot stick forever.
        if (inFlightRef.current === 0) {
          navPendingRef.current = false;
        }
        sync();
      }
    }) as typeof window.fetch;

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) return;
      if (
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search &&
        nextUrl.hash === window.location.hash
      ) {
        return;
      }

      navPendingRef.current = true;
      sync();
    };

    document.addEventListener("click", onDocumentClick, true);

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, []);

  if (!visible) return null;

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
