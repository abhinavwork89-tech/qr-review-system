"use client";

import { useLayoutEffect } from "react";

export const ADMIN_THEME_STORAGE_KEY = "admin-theme";

export type AdminThemeMode = "light" | "dark";

export function readAdminTheme(): AdminThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

export function syncAdminThemeClassFromStorage() {
  const mode = readAdminTheme();
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function applyAdminTheme(mode: AdminThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Runs before paint so saved theme matches SSR default (light) without long flash. */
export function AdminThemeInit() {
  useLayoutEffect(() => {
    syncAdminThemeClassFromStorage();
  }, []);

  return null;
}
