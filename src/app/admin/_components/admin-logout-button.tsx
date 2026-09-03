"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export function AdminLogoutButton() {
  const router = useRouter();

  async function logout() {
    const sb = getSupabaseBrowser();
    await sb.auth.signOut().catch(() => {});
    router.refresh();
    window.location.href = "/admin/login";
  }

  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-destructive hover:bg-slate-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-slate-300"
    >
      <SignOut size={16} />
      Sign Out
    </button>
  );
}
