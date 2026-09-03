"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, UploadSimple } from "@phosphor-icons/react";
import { uploadAssetToR2 } from "@/lib/admin/r2-upload";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  createSticker,
  fetchAllStickers,
  updateSticker,
} from "@/lib/supabase/admin-mutations";
import { stickerImageUrl } from "@/lib/utils/r2-public";
import type { StickerRow } from "@/types/database";

export function StickerManager() {
  const [stickers, setStickers] = useState<StickerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const list = await fetchAllStickers();
    setStickers(list);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(String(e.message)))
      .finally(() => setLoading(false));
  }, [load]);

  const flash = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(null), 2000);
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      setError("Nama dan file PNG wajib diisi");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error("Session admin tidak valid");

      const uploaded = await uploadAssetToR2("sticker", file);
      const sticker = await createSticker({
        id: uploaded.id,
        name: name.trim(),
        category: category.trim() || "general",
        r2_image_path: uploaded.key,
        created_by: user.id,
      });
      setStickers((prev) => [sticker, ...prev]);
      setName("");
      setCategory("general");
      setFile(null);
      flash("Sticker diupload");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (sticker: StickerRow) => {
    const next = !sticker.is_active;
    try {
      await updateSticker(sticker.id, { is_active: next });
      setStickers((prev) =>
        prev.map((s) =>
          s.id === sticker.id ? { ...s, is_active: next } : s,
        ),
      );
      flash(next ? "Sticker diaktifkan" : "Sticker dinonaktifkan");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal update");
    }
  };

  const saveMeta = async (
    id: string,
    patch: Partial<Pick<StickerRow, "name" | "category">>,
  ) => {
    try {
      await updateSticker(id, patch);
      setStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
      flash("Metadata disimpan");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal simpan");
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 text-sm">
        Memuat stickers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline text-xs">
            tutup
          </button>
        </div>
      )}
      {status && (
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {status}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <UploadSimple size={20} />
          Upload Sticker Baru
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nama
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Heart Sparkle"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Kategori
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="general, cute, text..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              PNG Sticker
            </label>
            <input
              type="file"
              accept="image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={busy || !file}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-800"
          >
            <Plus size={16} weight="bold" />
            {busy ? "Uploading..." : "Upload Sticker"}
          </button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">
            Daftar Sticker ({stickers.length})
          </h2>
        </div>

        {stickers.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Belum ada sticker. Upload PNG di atas.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {stickers.map((s) => {
              const url = stickerImageUrl(s.r2_image_path);
              return (
                <div
                  key={s.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
                    !s.is_active ? "opacity-60 bg-slate-50" : ""
                  }`}
                >
                  <div className="w-16 h-16 shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={s.name ?? "Sticker"}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">?</span>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                    <input
                      defaultValue={s.name ?? ""}
                      onBlur={(e) =>
                        saveMeta(s.id, { name: e.target.value })
                      }
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                      placeholder="Nama"
                    />
                    <input
                      defaultValue={s.category ?? ""}
                      onBlur={(e) =>
                        saveMeta(s.id, { category: e.target.value })
                      }
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                      placeholder="Kategori"
                    />
                    <p className="sm:col-span-2 text-[10px] font-mono text-slate-400 truncate">
                      {s.r2_image_path}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.is_active}
                      onChange={() => toggleActive(s)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700">
                      {s.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
