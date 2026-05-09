import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Home
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Public routes live under this segment. Example review page:{" "}
        <Link
          href="/r/demo"
          className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
        >
          /r/demo
        </Link>
        .
      </p>
    </div>
  );
}
