"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrMsg(null);
    try {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.session) throw new Error("Session tidak tersedia");
      router.refresh();
      window.location.href = next;
    } catch (err: any) {
      setErrMsg(err?.message || "Login gagal, cek email dan password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="email"
          className="block font-display font-semibold text-sm text-foreground mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-background border-4 border-border text-foreground font-body text-sm focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary transition"
          placeholder="admin@ba2w.example"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block font-display font-semibold text-sm text-foreground mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-background border-4 border-border text-foreground font-body text-sm focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary transition"
          placeholder="••••••••"
        />
      </div>

      {errMsg && (
        <div
          role="alert"
          className="p-3 rounded-2xl bg-destructive/10 border-2 border-destructive/30 text-destructive text-sm font-medium"
        >
          {errMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full clay-btn-primary py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed focus-ring"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
