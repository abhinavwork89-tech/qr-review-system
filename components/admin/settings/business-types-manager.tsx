"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { normalizeBusinessTypeSlug } from "@/lib/business/business-type-slug";
import type { BusinessTypeOption } from "@/lib/data/business-types-admin";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { sanitizePlainText } from "@/lib/security/input-sanitize";

type Props = {
  initialTypes: BusinessTypeOption[];
  loadError: string | null;
};

export function BusinessTypesManager({ initialTypes, loadError }: Props) {
  const router = useRouter();
  const [types, setTypes] = useState(initialTypes);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [working, setWorking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BusinessTypeOption | null>(null);

  useEffect(() => {
    setTypes(initialTypes);
  }, [initialTypes]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const refetchTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/business-types", { cache: "no-store" });
      if (!res.ok) return;
      const body: unknown = await res.json().catch(() => null);
      if (
        body &&
        typeof body === "object" &&
        "types" in body &&
        Array.isArray((body as { types: unknown }).types)
      ) {
        setTypes((body as { types: BusinessTypeOption[] }).types);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleAdd = useCallback(async () => {
    if (working) return;
    setFormError(null);
    const slug = normalizeBusinessTypeSlug(newSlug || newName);
    const name = sanitizePlainText(newName, 120);
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (!slug) {
      setFormError("Enter a valid slug or name.");
      return;
    }

    setWorking(true);
    try {
      const res = await fetch("/api/admin/business-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Could not add type";
        setFormError(msg);
        return;
      }
      setNewSlug("");
      setNewName("");
      await refetchTypes();
      refresh();
    } finally {
      setWorking(false);
    }
  }, [newName, newSlug, refetchTypes, refresh]);

  const startEdit = useCallback((t: BusinessTypeOption) => {
    setEditingId(t.id);
    setEditSlug(t.slug);
    setEditName(t.name);
    setFormError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setFormError(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (working) return;
    if (!editingId) return;
    setFormError(null);
    const name = sanitizePlainText(editName, 120);
    const slug = normalizeBusinessTypeSlug(editSlug);
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setFormError("Slug must be lowercase letters, numbers, and hyphens.");
      return;
    }

    setWorking(true);
    try {
      const res = await fetch(`/api/admin/business-types/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Could not update";
        setFormError(msg);
        return;
      }
      setEditingId(null);
      await refetchTypes();
      refresh();
    } finally {
      setWorking(false);
    }
  }, [editName, editSlug, editingId, refetchTypes, refresh]);

  const confirmDelete = useCallback(async () => {
    if (working) return;
    if (!deleteTarget) return;
    if (deleteTarget.usageCount > 0) return;

    setWorking(true);
    try {
      const res = await fetch(`/api/admin/business-types/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Could not delete";
        setFormError(msg);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      await refetchTypes();
      refresh();
    } finally {
      setWorking(false);
    }
  }, [deleteTarget, refetchTypes, refresh]);

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
      <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Business types
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Used on Add Business and business list filters. Stored as a slug on each business.
        </p>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Could not load business types: {loadError}. Apply the database migration if this table is
          missing.
        </div>
      ) : null}

      <div className="mt-6 space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Add type</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Display name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="e.g. Hospitality"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Slug (optional — derived from name if empty)
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="e.g. hospitality"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={working || !!loadError}
              onClick={() => void handleAdd()}
              className={`${adminPanel.btnPrimary} w-full sm:w-auto`}
            >
              Add type
            </button>
          </div>
        </div>
        {formError && !editingId ? (
          <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
        ) : null}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="py-3 pr-3">Name</th>
              <th className="py-3 pr-3">Slug</th>
              <th className="py-3 pr-3">Usage</th>
              <th className="py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No business types yet. Add one above.
                </td>
              </tr>
            ) : (
              types.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/80"
                >
                  {editingId === t.id ? (
                    <>
                      <td className="py-3 pr-3 align-top">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <input
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </td>
                      <td className="py-3 pr-3 align-middle text-zinc-600 dark:text-zinc-400">
                        {t.usageCount}
                      </td>
                      <td className="py-3 align-top text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={working}
                            onClick={() => void saveEdit()}
                            className={adminPanel.btnPrimary}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className={adminPanel.btnSecondary}
                          >
                            Cancel
                          </button>
                        </div>
                        {formError ? (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{formError}</p>
                        ) : null}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 pr-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {t.name}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {t.slug}
                      </td>
                      <td className="py-3 pr-3 text-zinc-600 dark:text-zinc-400">
                        {t.usageCount}{" "}
                        {t.usageCount === 1 ? "business" : "businesses"}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(t)}
                          className={`${adminPanel.btnSecondary} mr-2`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(null);
                            setDeleteTarget(t);
                          }}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget ? (
        <DeleteTypeModal
          target={deleteTarget}
          working={working}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </section>
  );
}

function DeleteTypeModal({
  target,
  working,
  onClose,
  onConfirm,
}: {
  target: BusinessTypeOption;
  working: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const blocked = target.usageCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 px-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-type-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-type-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Delete business type
        </h3>
        {blocked ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{target.name}</span> is
            used by{" "}
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              {target.usageCount}
            </span>{" "}
            {target.usageCount === 1 ? "business" : "businesses"}. Reassign or remove those
            businesses before deleting this type.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            Delete <span className="font-medium text-zinc-900 dark:text-zinc-100">{target.name}</span>{" "}
            (<span className="font-mono text-xs">{target.slug}</span>)? This cannot be undone.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={adminPanel.btnSecondary}>
            {blocked ? "Close" : "Cancel"}
          </button>
          {!blocked ? (
            <button
              type="button"
              disabled={working}
              onClick={onConfirm}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {working ? "Deleting…" : "Delete"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
