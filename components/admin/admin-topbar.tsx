"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminLogoutButton } from "@/components/admin/auth/admin-logout-button";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { AdminThemeToggle } from "@/components/admin/admin-theme-toggle";

export function AdminTopbar({
  onToggleSidebar,
  onToggleDesktopSidebar,
  desktopSidebarCollapsed,
}: {
  onToggleSidebar: () => void;
  onToggleDesktopSidebar: () => void;
  desktopSidebarCollapsed: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);
  const dateTimeLabel = `${dateLabel} • ${timeLabel}`;

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`${adminPanel.btnIcon} md:hidden`}
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onToggleDesktopSidebar}
            className={`${adminPanel.btnIcon} hidden md:inline-flex`}
            aria-label={desktopSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            title={desktopSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            {desktopSidebarCollapsed ? (
              <PanelShowIcon className="h-5 w-5" aria-hidden />
            ) : (
              <PanelHideIcon className="h-5 w-5" aria-hidden />
            )}
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Welcome back
            </p>
            <p className="hidden truncate text-xs text-zinc-500 dark:text-zinc-400 sm:block">
              {dateTimeLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <AdminThemeToggle />
          <Link href="/admin/add-business" className={adminPanel.btnPrimary}>
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Business</span>
          </Link>
          <AdminLogoutButton />
        </div>
      </div>
    </header>
  );
}

function MenuIcon({ className }: { className?: string }) {
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
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function PanelHideIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M14 10l3 2-3 2" />
    </svg>
  );
}

function PanelShowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M10 12h7" />
      <path d="M14 9l3 3-3 3" />
    </svg>
  );
}
