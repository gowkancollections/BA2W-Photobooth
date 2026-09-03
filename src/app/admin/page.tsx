import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Image as ImageIcon, Square } from "@phosphor-icons/react/ssr";
import { AdminLogoutButton } from "./_components/admin-logout-button";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  type AdminRoleRow = { role: "admin" | "superadmin" } | null;
  const roleRes = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRes.error || !roleRes.data) redirect("/admin/forbidden");
  const roleValue = (roleRes.data as AdminRoleRow)!.role;

  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-slate-900">
              BA2W Photobooth · Admin
            </h1>
            <p className="text-xs text-slate-500">
              {user.email} ·{" "}
              <span className="font-semibold uppercase">{roleValue}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Public Site ↗
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/frames"
            className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-primary/50 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Square size={24} weight="fill" />
              </div>
              <span className="text-xs font-medium text-slate-400 group-hover:text-slate-600">
                Buka →
              </span>
            </div>
            <h2 className="mt-4 font-semibold text-slate-900">Frame Slot Tuner</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload frame PNG, atur posisi/ukuran/rotasi slot secara visual,
              simpan ke database.
            </p>
          </Link>

          <Link
            href="/admin/stickers"
            className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-primary/50 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon size={24} weight="fill" aria-hidden="true" />
              </div>
              <span className="text-xs font-medium text-slate-400 group-hover:text-slate-600">
                Buka →
              </span>
            </div>
            <h2 className="mt-4 font-semibold text-slate-900">Sticker Manager</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload sticker PNG, kelola kategori, toggle is_active.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
