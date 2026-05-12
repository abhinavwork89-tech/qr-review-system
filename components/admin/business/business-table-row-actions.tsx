"use client";

import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { DeleteBusinessButton } from "@/components/admin/business/delete-business-button";

const iconBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-200";

export function BusinessTableRowActions({ businessId }: { businessId: string }) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/business/${businessId}`}
        className={iconBtn}
        title="View"
        aria-label="View business"
      >
        <Eye className="h-4 w-4" aria-hidden />
      </Link>
      <Link
        href={`/admin/business/${businessId}?mode=edit`}
        className={iconBtn}
        title="Edit"
        aria-label="Edit business"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </Link>
      <DeleteBusinessButton businessId={businessId} variant="icon" />
    </div>
  );
}
