"use client";

import { beginAppNavigation } from "@/lib/navigation/app-navigation-loader";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { ADMIN_SESSION_LOCALSTORAGE_KEY } from "@/lib/admin-auth";

function parseLoginJsonBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

export function AdminLoginForm() {
  const router = useRouter();
  const submitInFlight = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (submitInFlight.current) return;

    submitInFlight.current = true;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      const result = parseLoginJsonBody(text);

      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof (result as { error?: unknown }).error === "string"
            ? (result as { error: string }).error
            : "Login failed";
        setError(message);
        return;
      }

      try {
        localStorage.setItem(ADMIN_SESSION_LOCALSTORAGE_KEY, "1");
      } catch {
        // ignore storage failures
      }

      beginAppNavigation();
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (err) {
      const isNetwork =
        err instanceof TypeError ||
        (err instanceof Error &&
          (err.message === "Failed to fetch" || err.name === "AbortError"));
      setError(
        isNetwork
          ? "Network error. Please try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      submitInFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          type="email"
          placeholder="Enter Your Email Id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none ring-offset-2 transition placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-600 dark:focus:bg-zinc-950 dark:focus:ring-indigo-400/25"
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </label>
        <input
          type="password"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none ring-offset-2 transition placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-600 dark:focus:bg-zinc-950 dark:focus:ring-indigo-400/25"
          autoComplete="current-password"
          required
        />
      </div>

      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className={`${adminPanel.btnPrimary} w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {loading ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
