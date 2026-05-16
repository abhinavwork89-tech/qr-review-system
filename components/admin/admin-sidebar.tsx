"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: IconLayout,
  },
  {
    href: "/admin/add-business",
    label: "Add New Business",
    icon: IconPlusSquare,
  },
  {
    href: "/admin/businesses",
    label: "Business List",
    icon: IconBuilding,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: IconSettings,
  },
] as const;

export function AdminSidebar({
  open,
  onClose,
  desktopCollapsed,
}: {
  open: boolean;
  onClose: () => void;
  desktopCollapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-zinc-900/40 backdrop-blur-[2px] transition-opacity md:hidden dark:bg-black/50 ${
          open ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200/80 bg-white shadow-md transition-transform dark:border-zinc-800 dark:bg-zinc-950 md:static md:translate-x-0 md:shadow-none ${
          open
            ? "translate-x-0"
            : "-translate-x-full pointer-events-none md:pointer-events-auto"
        } ${desktopCollapsed ? "md:hidden" : "md:flex"}`}
      >
        <div className="border-b border-zinc-100 px-5 py-6 dark:border-zinc-800/80">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            One Core App
          </p>
          <p className="mt-1.5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Admin Panel
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {MENU.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-100 dark:ring-indigo-900/60"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200/80 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 dark:active:bg-zinc-800/80"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                    active
                      ? "border-indigo-200 bg-white text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                      : "border-zinc-200/80 bg-zinc-50 text-zinc-500 group-hover:border-zinc-300 group-hover:bg-white group-hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:group-hover:border-zinc-700 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function IconLayout({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function IconPlusSquare({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
