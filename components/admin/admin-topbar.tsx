"use client";

import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/auth/admin-logout-button";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { AdminThemeToggle } from "@/components/admin/admin-theme-toggle";

export function AdminTopbar({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void;
}) {
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
          <p className="truncate text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Welcome back
          </p>
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
