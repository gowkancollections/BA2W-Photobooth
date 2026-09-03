import Link from "next/link";
import { Shield } from "@phosphor-icons/react/ssr";

export default function ForbiddenPage() {
  return (
    <main className="min-h-dvh w-full flex items-center justify-center p-4 bg-background">
      <div className="clay-card max-w-md w-full p-8 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-6 border-4 border-destructive/30">
          <Shield size={40} weight="fill" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Akses Ditolak
        </h1>
        <p className="text-sm text-muted-foreground mb-6 font-body">
          Akun kamu tidak terdaftar sebagai admin BA2W Photobooth. Hubungi
          superadmin untuk menambahkan kamu ke daftar admin_roles.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin/login"
            className="clay-btn-accent px-6 py-3 text-center focus-ring"
          >
            Coba Login Akun Lain
          </Link>
          <Link
            href="/"
            className="clay-btn-ghost px-6 py-3 text-center focus-ring"
          >
            Kembali ke Home
          </Link>
        </div>
      </div>
    </main>
  );
}
