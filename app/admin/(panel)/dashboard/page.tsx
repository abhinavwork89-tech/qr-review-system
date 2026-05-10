import { DashboardAnalytics } from "@/components/admin/dashboard/dashboard-analytics";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Overview of your platform
        </p>
      </div>

      <DashboardAnalytics />
    </div>
  );
}
