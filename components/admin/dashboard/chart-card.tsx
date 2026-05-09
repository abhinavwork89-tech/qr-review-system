export type ChartCardProps = {
  title: string;
  subtitle: string;
  hasData?: boolean;
  children: React.ReactNode;
};

export function ChartCard({
  title,
  subtitle,
  hasData = true,
  children,
}: ChartCardProps) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>

      {hasData ? (
        children
      ) : (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">
          No data yet
        </div>
      )}
    </section>
  );
}
