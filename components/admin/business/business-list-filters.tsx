"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { adminPanel } from "@/components/admin/admin-panel-styles";

type Props = {
  businessTypeOptions: { slug: string; name: string }[];
};

export function BusinessListFilters({ businessTypeOptions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isFilterNavPending, startFilterNav] = useTransition();

  const defaults = useMemo(
    () => ({
      status: searchParams.get("status") ?? "all",
      plan: searchParams.get("plan") ?? "all",
      businessType: searchParams.get("businessType") ?? "all",
    }),
    [searchParams],
  );

  const applyFilters = (formData: FormData) => {
    const params = new URLSearchParams(searchParams.toString());
    const status = String(formData.get("status") ?? "all").trim();
    const plan = String(formData.get("plan") ?? "all").trim();
    const businessType = String(formData.get("businessType") ?? "all").trim();

    if (status && status !== "all") params.set("status", status);
    else params.delete("status");
    if (plan && plan !== "all") params.set("plan", plan);
    else params.delete("plan");
    if (businessType && businessType !== "all") params.set("businessType", businessType);
    else params.delete("businessType");

    params.set("page", "1");
    setOpen(false);
    startFilterNav(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.delete("plan");
    params.delete("businessType");
    params.set("page", "1");
    setOpen(false);
    startFilterNav(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={adminPanel.btnSecondary}
        disabled={isFilterNavPending}
        onClick={() => setOpen((s) => !s)}
      >
        <span className="inline-flex items-center gap-2">
          Filters
          {isFilterNavPending ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : null}
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-20 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <form
            action={(formData) => {
              applyFilters(formData);
            }}
            className="space-y-3"
          >
            <label className="block text-sm text-zinc-700 dark:text-zinc-300">
              Status
              <select
                name="status"
                defaultValue={defaults.status}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-700 dark:text-zinc-300">
              Plan
              <select
                name="plan"
                defaultValue={defaults.plan}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="all">All</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="pro_plus">Pro Plus</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-700 dark:text-zinc-300">
              Business Type
              <select
                name="businessType"
                defaultValue={defaults.businessType}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="all">All</option>
                {businessTypeOptions.map((type) => (
                  <option key={type.slug} value={type.slug}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={clearFilters} className={adminPanel.btnSecondary}>
                Reset
              </button>
              <button type="submit" className={adminPanel.btnPrimary}>
                Apply
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
