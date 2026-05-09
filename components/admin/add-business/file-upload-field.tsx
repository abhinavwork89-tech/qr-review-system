"use client";

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
  onFilesChange: (files: FileList | null) => void;
}) {
  const hasError = Boolean(error);

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
      </label>
      {fileNames.length > 0 ? (
        <ul className="flex flex-wrap gap-2 pt-1">
          {fileNames.map((name) => (
            <li
              key={name}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
      {previewUrls && previewUrls.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
          {previewUrls.map((src, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${id}-preview-${idx}`}
              src={src}
              alt={`${label} preview ${idx + 1}`}
              className="h-26  rounded-lg border border-zinc-200 bg-white object-content dark:border-zinc-700 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
