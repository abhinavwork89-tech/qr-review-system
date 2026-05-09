import { AdminLoginThemeSlot } from "@/components/admin/admin-login-theme-slot";
import { AdminLoginForm } from "@/components/admin/auth/admin-login-form";

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950 sm:px-6">
      <AdminLoginThemeSlot />
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-md dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
          Admin Login
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Sign in to One Core App admin panel.
        </p>

        <AdminLoginForm />
      </div>
    </div>
  );
}
