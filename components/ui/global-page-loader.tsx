"use client";

import {
  beginAppNavigation,
  clearAppNavigation,
  isAppNavigationPending,
  subscribeAppNavigation,
} from "@/lib/navigation/app-navigation-loader";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeNavigationPending(onStoreChange: () => void) {
  return subscribeAppNavigation(onStoreChange);
}

function getNavigationPendingSnapshot() {
  return isAppNavigationPending();
}

function getNavigationPendingServerSnapshot() {
  return false;
}

export function GlobalPageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navPending = useSyncExternalStore(
    subscribeNavigationPending,
    getNavigationPendingSnapshot,
    getNavigationPendingServerSnapshot,
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    clearAppNavigation();
  }, [pathname, searchParams]);

  useEffect(() => {
    const onPopState = () => {
      beginAppNavigation();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
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
      if (nextUrl.pathname === window.location.pathname) return;

      beginAppNavigation();
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, []);

  const visible =
    navPending || (!mounted && (pathname === "/admin" || pathname.startsWith("/admin/")));

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
