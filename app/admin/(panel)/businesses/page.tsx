import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DeleteBusinessButton } from "@/components/admin/business/delete-business-button";
import { adminPanel } from "@/components/admin/admin-panel-styles";

type BusinessRecord = {
  id: string;
  slug: string | null;
  brand_name: string | null;
  name: string | null;
  email: string | null;
  plan_type: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

export default async function BusinessListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = (await searchParams) ?? {};
  const deletedFlag = query.deleted;
  const deleted =
    deletedFlag === "1" ||
    deletedFlag === "true" ||
    (Array.isArray(deletedFlag) && deletedFlag.includes("1"));

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });

  const rows: BusinessRecord[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id ?? ""),
    slug: asStringOrNull(r.slug),
    brand_name: asStringOrNull(r.brand_name),
    name: asStringOrNull(r.name),
    email: asStringOrNull(r.email),
    plan_type: asStringOrNull(r.plan_type),
    is_active: typeof r.is_active === "boolean" ? r.is_active : null,
    created_at: asStringOrNull(r.created_at),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
            Businesses
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage client accounts and plans.
          </p>
        </div>
        <Link href="/admin/add-business" className={adminPanel.btnPrimary}>
          Add Business
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
        {deleted ? (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            Business deleted successfully.
          </div>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">Search businesses</span>
            <input
              type="search"
              placeholder="Search businesses..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-400/25"
            />
          </label>
        </div>

        {error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            Failed to fetch businesses: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">
            No businesses found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <table className="min-w-[1040px] w-full text-left">
                <thead className="bg-zinc-50/80 dark:bg-zinc-950/60">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="px-4 py-3">Brand Name</th>
                    <th className="px-4 py-3">Owner Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Plan Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3">Review page</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                  {rows.map((row) => {
                    const isActive = row.is_active ?? false;
                    return (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {row.brand_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {row.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {row.email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {formatPlan(row.plan_type)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {row.slug ? (
                            <Link
                              href={`/r/${encodeURIComponent(row.slug)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${adminPanel.btnSecondary} inline-flex`}
                            >
                              Open Link 
                            </Link>
                          ) : (
                            <span className="text-sm text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/business/${row.id}`} className={adminPanel.btnSecondary}>
                              View
                            </Link>
                            <Link href={`/admin/business/${row.id}`} className={adminPanel.btnSecondary}>
                              Edit
                            </Link>
                            <DeleteBusinessButton businessId={row.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/40">
              <p className="text-zinc-500 dark:text-zinc-400">Page 1 of 1</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled className={`${adminPanel.btnSecondary} opacity-60`}>
                  Previous
                </button>
                <button type="button" disabled className={`${adminPanel.btnSecondary} opacity-60`}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function formatPlan(plan: string | null): string {
  if (!plan) return "—";
  return plan
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
