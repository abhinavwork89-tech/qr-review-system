"use client";

import { beginAppNavigation } from "@/lib/navigation/app-navigation-loader";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { ADMIN_SESSION_LOCALSTORAGE_KEY } from "@/lib/admin-auth";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      try {
        localStorage.removeItem(ADMIN_SESSION_LOCALSTORAGE_KEY);
      } catch {
        // ignore storage failures
      }
      beginAppNavigation();
      router.replace("/admin/login");
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`${adminPanel.btnSecondary} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
