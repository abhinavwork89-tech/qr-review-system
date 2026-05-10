import { AddBusinessForm } from "@/components/admin/add-business/add-business-form";
import { listBusinessTypeSelectOptions } from "@/lib/data/business-types-admin";

export const dynamic = "force-dynamic";

export default async function AddBusinessRoutePage() {
  const { options, error } = await listBusinessTypeSelectOptions();

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Business types could not be loaded ({error}). Add types in Settings after applying
          migrations.
        </div>
      ) : null}
      <AddBusinessForm businessTypeOptions={options} />
    </div>
  );
}
