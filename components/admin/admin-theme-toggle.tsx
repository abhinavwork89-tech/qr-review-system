"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import {
  applyAdminTheme,
  readAdminTheme,
  type AdminThemeMode,
} from "./admin-theme-init";

function isDarkClassOnHtml(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function AdminThemeToggle() {
  /** Match SSR default; sync from storage after mount (see AdminThemeInit). */
  const [mode, setMode] = useState<AdminThemeMode>("light");

  useLayoutEffect(() => {
    setMode(readAdminTheme());
  }, []);

  const toggle = useCallback(() => {
    const next: AdminThemeMode = isDarkClassOnHtml() ? "light" : "dark";
    applyAdminTheme(next);
    setMode(next);
  }, []);

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${adminPanel.btnIcon} h-9 w-9 px-0`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className="sr-only">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </span>
      {isDark ? (
        <SunIcon className="h-4 w-4" aria-hidden />
      ) : (
        <MoonIcon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
