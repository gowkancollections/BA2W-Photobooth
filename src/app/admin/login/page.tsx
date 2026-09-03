import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./_components/login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: role } = await supabase
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (role) redirect("/admin");
  }

  return (
    <main className="min-h-dvh w-full bg-gradient-to-b from-background to-card flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            BA2W <span className="text-primary">Admin</span>
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Sign in untuk mengakses frame & sticker manager
          </p>
        </div>
        <div className="clay-card p-6 md:p-8">
          <LoginForm />
        </div>
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary underline underline-offset-4">
            ← Kembali ke Photobooth
          </Link>
        </div>
      </div>
    </main>
  );
}
