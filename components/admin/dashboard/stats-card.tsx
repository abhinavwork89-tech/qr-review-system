import { type LucideIcon } from "lucide-react";

export type StatsCardProps = {
  title: string;
  value: string;
  growth: string;
  icon: LucideIcon;
};

export function StatsCard({ title, value, growth, icon: Icon }: StatsCardProps) {
  return (
    <article className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {value}
          </p>
          <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {growth} vs last month
          </p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-900/70">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </article>
  );
}
