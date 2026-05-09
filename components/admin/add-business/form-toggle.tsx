"use client";

export function FormToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="min-w-0">
        <p
          id={`${id}-label`}
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          {label}
        </p>
        {description ? (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-11 shrink-0 rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
          checked
            ? "border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500"
            : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <span
          className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
