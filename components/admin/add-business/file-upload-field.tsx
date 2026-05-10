"use client";

import { useState } from "react";

export function FileUploadField({
  id,
  label,
  required,
  error,
  hint,
  accept,
  multiple,
  fileNames,
  previewUrls,
  uploading,
  maxFiles,
  hideUploadWhenFilled,
  onRemoveAt,
  onClearAll,
  onFilesChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  accept: string;
  multiple?: boolean;
  fileNames: string[];
  previewUrls?: string[];
  uploading?: boolean;
  maxFiles?: number;
  hideUploadWhenFilled?: boolean;
  onRemoveAt?: (index: number) => void;
  onClearAll?: () => void;
  onFilesChange: (files: FileList | null) => void;
}) {
  const hasError = Boolean(error);
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const hasFiles = fileNames.length > 0;
  const canShowUploadArea = !(hideUploadWhenFilled && hasFiles);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-red-500 dark:text-red-400" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {canShowUploadArea ? (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/20 ${
            hasError
              ? `border-red-400 bg-red-50/30 dark:border-red-500/60 dark:bg-red-950/20`
              : "border-zinc-200 bg-zinc-50/30 dark:border-zinc-700 dark:bg-zinc-950/40"
          }`}
        >
          <input
            id={id}
            type="file"
            accept={accept}
            multiple={multiple}
            className="sr-only"
            onClick={(e) => {
              // Allow selecting the same file again.
              e.currentTarget.value = "";
            }}
            onChange={(e) => onFilesChange(e.target.files)}
          />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Click to upload or drag files here
          </span>
          <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {hint ?? (multiple ? "You can select multiple files." : "Single file.")}
          </span>
          {typeof maxFiles === "number" ? (
            <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Max {maxFiles} file{maxFiles > 1 ? "s" : ""}
            </span>
          ) : null}
        </label>
      ) : null}
      {uploading ? (
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Uploading files...</p>
      ) : null}
      {fileNames.length > 0 ? (
        <div className="space-y-2 pt-1">
          {onClearAll ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove all
              </button>
            </div>
          ) : null}
          <ul className="flex flex-wrap gap-2">
            {fileNames.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <span className="max-w-[180px] truncate">{name}</span>
                {onRemoveAt ? (
                  <button
                    type="button"
                    onClick={() => onRemoveAt(index)}
                    className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                    aria-label={`Remove ${name}`}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {previewUrls && previewUrls.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
          {previewUrls.map((src, idx) => (
            <button
              key={`${id}-preview-btn-${idx}`}
              type="button"
              onClick={() => setModalSrc(src)}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${label} preview ${idx + 1}`}
                className="h-26 object-content"
              />
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {modalSrc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModalSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${label} preview`}
        >
          <button
            type="button"
            onClick={() => setModalSrc(null)}
            className="absolute right-4 top-4 rounded-md bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={modalSrc}
            alt={`${label} full preview`}
            className="max-h-[90vh] max-w-[90vw] rounded-xl border border-zinc-200 bg-white object-contain dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      ) : null}
    </div>
  );
}
