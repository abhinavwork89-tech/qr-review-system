import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Home
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Public review pages use each business slug:{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          /r/your-business-slug
        </code>
        . Create a business in{" "}
        <Link
          href="/admin/businesses"
          className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
        >
          admin
        </Link>{" "}
        to get a live link.
      </p>
    </div>
  );
}
