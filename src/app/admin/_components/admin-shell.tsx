import Link from "next/link";
import { AdminLogoutButton } from "./admin-logout-button";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/frames", label: "Frame Slot Tuner" },
  { href: "/admin/stickers", label: "Sticker Manager" },
];

export function AdminShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href="/admin"
              className="font-bold text-slate-900 whitespace-nowrap shrink-0"
            >
              BA2W Admin
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 hidden md:inline"
            >
              Public site ↗
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
        {title && (
          <div className="max-w-7xl mx-auto px-4 md:px-6 pb-3">
            <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
          </div>
        )}
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
