import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizeBusinessStatus, type BusinessStatus } from "@/lib/business/status";
import { DeleteBusinessButton } from "@/components/admin/business/delete-business-button";
import { BusinessListFilters } from "@/components/admin/business/business-list-filters";
import { BusinessStatusToggleButton } from "@/components/admin/business/business-status-toggle-button";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import {
  mergeBusinessTypeCatalogWithInUseSlugs,
  resolveBusinessTypeDisplayName,
} from "@/lib/admin/business-type-display";
import { listBusinessTypeSelectOptions } from "@/lib/data/business-types-admin";

type BusinessRecord = {
  id: string;
  slug: string | null;
  brand_name: string | null;
  name: string | null;
  mobile: string | null;
  email: string | null;
  plan_type: string | null;
  business_type: string | null;
  status: BusinessStatus;
  is_active: boolean | null;
  created_at: string | null;
};

export default async function BusinessListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = (await searchParams) ?? {};
  const statusFilterRaw = query.status;
  const statusFilter =
    statusFilterRaw === "active" || statusFilterRaw === "inactive"
      ? statusFilterRaw
      : Array.isArray(statusFilterRaw) && (statusFilterRaw.includes("active") || statusFilterRaw.includes("inactive"))
        ? (statusFilterRaw.find((v) => v === "active" || v === "inactive") as "active" | "inactive")
        : "all";
  const planRaw = query.plan;
  const planFilter = Array.isArray(planRaw) ? planRaw[0] ?? "all" : planRaw ?? "all";
  const businessTypeRaw = query.businessType;
  const businessTypeFilter = Array.isArray(businessTypeRaw)
    ? businessTypeRaw[0] ?? "all"
    : businessTypeRaw ?? "all";
  const pageRaw = Array.isArray(query.page) ? query.page[0] : query.page;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const deletedFlag = query.deleted;
  const deleted =
    deletedFlag === "1" ||
    deletedFlag === "true" ||
    (Array.isArray(deletedFlag) && deletedFlag.includes("1"));

  const supabase = createServiceRoleClient();
  const businessTypesInUsePromise = supabase
    .from("businesses")
    .select("business_type")
    .not("business_type", "is", null);
  let listQuery = supabase
    .from("businesses")
    .select(
      "id,slug,brand_name,name,mobile,email,plan_type,business_type,status,is_active,created_at",
      { count: "exact" },
    )
    .or("status.is.null,status.neq.deleted")
    .order("created_at", { ascending: false });

  if (planFilter !== "all") {
    listQuery = listQuery.eq("plan_type", planFilter);
  }
  if (businessTypeFilter !== "all") {
    listQuery = listQuery.eq("business_type", businessTypeFilter);
  }
  if (statusFilter === "active") {
    listQuery = listQuery.or("status.eq.active,and(status.is.null,is_active.eq.true)");
  } else if (statusFilter === "inactive") {
    listQuery = listQuery.or("status.eq.inactive,and(status.is.null,is_active.eq.false)");
  }
  listQuery = listQuery.range(from, to);

  const [{ data, error, count }, catalogResult, { data: businessTypesInUseData }] =
    await Promise.all([listQuery, listBusinessTypeSelectOptions(), businessTypesInUsePromise]);

  const rows: BusinessRecord[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id ?? ""),
    slug: asStringOrNull(r.slug),
    brand_name: asStringOrNull(r.brand_name),
    name: asStringOrNull(r.name),
    mobile: asStringOrNull(r.mobile),
    email: asStringOrNull(r.email),
    plan_type: asStringOrNull(r.plan_type),
    business_type: asStringOrNull(r.business_type),
    status: normalizeBusinessStatus(r),
    is_active: typeof r.is_active === "boolean" ? r.is_active : null,
    created_at: asStringOrNull(r.created_at),
  }));
  const inUseTypeSlugs = (businessTypesInUseData ?? [])
    .map((r) => {
      const o = r as Record<string, unknown>;
      return typeof o.business_type === "string" ? o.business_type.trim() : "";
    })
    .filter((v) => v.length > 0);
  const businessTypeFilterOptions = mergeBusinessTypeCatalogWithInUseSlugs(
    catalogResult.options,
    inUseTypeSlugs,
  );

  const visibleRows = rows.filter((row) => row.status !== "deleted");
  const filteredRows = visibleRows;
  const totalItems = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

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
          <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {`Showing ${filteredRows.length} of ${totalItems} businesses`}
            </div>
            <div className="relative">
              <BusinessListFilters businessTypeOptions={businessTypeFilterOptions} />
            </div>
          </div>
        </div>

        {error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            Failed to fetch businesses: {error.message}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">
            No businesses found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <table className="min-w-[1040px] w-full text-left">
                <thead className="bg-zinc-50/80 dark:bg-zinc-950/60">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Brand Name</th>
                    <th className="px-4 py-3">Owner Name</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Plan Type</th>
                    <th className="px-4 py-3">Business Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3">Review page</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                  {filteredRows.map((row, idx) => {
                    return (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                      >
                        <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                          {from + idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {row.brand_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {row.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {row.mobile ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {row.email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {formatPlan(row.plan_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          {resolveBusinessTypeDisplayName(
                            row.business_type,
                            businessTypeFilterOptions,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              row.status === "active"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {row.status === "active" ? "Active" : "Inactive"}
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
                            <BusinessStatusToggleButton businessId={row.id} status={row.status} />
                            <Link href={`/admin/business/${row.id}`} className={adminPanel.btnSecondary}>
                              View
                            </Link>
                            <Link href={`/admin/business/${row.id}?mode=edit`} className={adminPanel.btnSecondary}>
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
              <p className="text-zinc-500 dark:text-zinc-400">{`Page ${page} of ${totalPages}`}</p>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={withPage(query, page - 1)}
                    className={adminPanel.btnSecondary}
                  >
                    Previous
                  </Link>
                ) : (
                  <button type="button" disabled className={`${adminPanel.btnSecondary} opacity-60`}>
                    Previous
                  </button>
                )}
                {page < totalPages ? (
                  <Link
                    href={withPage(query, page + 1)}
                    className={adminPanel.btnSecondary}
                  >
                    Next
                  </Link>
                ) : (
                  <button type="button" disabled className={`${adminPanel.btnSecondary} opacity-60`}>
                    Next
                  </button>
                )}
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

function withPage(
  query: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    if (key === "page") continue;
    if (Array.isArray(raw)) {
      for (const value of raw) {
        if (value) params.append(key, value);
      }
      continue;
    }
    if (raw) params.set(key, raw);
  }
  params.set("page", String(page));
  return `/admin/businesses?${params.toString()}`;
}
