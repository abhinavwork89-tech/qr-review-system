"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("admin:sidebar:collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "admin:sidebar:collapsed",
        desktopSidebarCollapsed ? "1" : "0",
      );
    } catch {
      // ignore storage failures
    }
  }, [desktopSidebarCollapsed]);

  return (
    <div className="flex min-h-[100dvh] bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopCollapsed={desktopSidebarCollapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleDesktopSidebar={() =>
            setDesktopSidebarCollapsed((collapsed) => !collapsed)
          }
          desktopSidebarCollapsed={desktopSidebarCollapsed}
        />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
