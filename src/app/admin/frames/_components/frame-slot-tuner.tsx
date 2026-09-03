"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowCounterClockwise,
  Plus,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import type { FrameCategory, FrameRow, FrameSlotRow } from "@/types/database";
import { uploadAssetToR2 } from "@/lib/admin/r2-upload";
import { pngNaturalSize } from "@/lib/utils/canvas";
import { frameImageUrl } from "@/lib/utils/r2-public";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  createFrame,
  deleteAllFrameSlots,
  deleteFrameSlot,
  fetchAllFrames,
  fetchFrameSlots,
  newSlotDefaults,
  updateFrame,
  upsertFrameSlot,
} from "@/lib/supabase/admin-mutations";

const CATEGORIES: { value: FrameCategory; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "strip-3", label: "Strip 3" },
  { value: "strip-4", label: "Strip 4" },
  { value: "photostrip-3x2", label: "3×2 Grid" },
  { value: "photostrip-4x2", label: "4×2 Grid" },
];

type DragMode =
  | "move"
  | "resize-se"
  | "resize-sw"
  | "resize-ne"
  | "resize-nw"
  | "rotate"
  | null;

type LocalSlot = FrameSlotRow;

export function FrameSlotTuner() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    mode: DragMode;
    slotId: string;
    startX: number;
    startY: number;
    orig: LocalSlot;
  } | null>(null);

  const [frames, setFrames] = useState<FrameRow[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [slots, setSlots] = useState<LocalSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<FrameCategory>("strip-4");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const selectedFrame = frames.find((f) => f.id === selectedFrameId) ?? null;
  const cw = selectedFrame?.canvas_width ?? 1;
  const ch = selectedFrame?.canvas_height ?? 1;
  const aspect = cw / ch;

  const loadFrames = useCallback(async () => {
    const list = await fetchAllFrames();
    setFrames(list);
    return list;
  }, []);

  const loadSlots = useCallback(async (frameId: string) => {
    const list = await fetchFrameSlots(frameId);
    setSlots(list);
    setSelectedSlotId(list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    loadFrames()
      .then((list) => {
        if (list[0]) setSelectedFrameId(list[0].id);
      })
      .catch((e) => setError(String(e.message)))
      .finally(() => setLoading(false));
  }, [loadFrames]);

  useEffect(() => {
    if (!selectedFrameId) {
      setSlots([]);
      return;
    }
    loadSlots(selectedFrameId).catch((e) => setError(String(e.message)));
  }, [selectedFrameId, loadSlots]);

  const flashStatus = useCallback((msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(null), 2000);
  }, [setStatus]);

  const persistSlot = async (slot: LocalSlot) => {
    await upsertFrameSlot(slot);
    flashStatus("Slot tersimpan");
  };

  const handleUploadFrame = async () => {
    if (!uploadFile || !uploadName.trim()) {
      setError("Nama frame dan file PNG wajib diisi");
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

      const { width, height } = await pngNaturalSize(
        URL.createObjectURL(uploadFile),
      );
      const uploaded = await uploadAssetToR2("frame", uploadFile);
      const frame = await createFrame({
        id: uploaded.id,
        name: uploadName.trim(),
        category: uploadCategory,
        r2_image_path: uploaded.key,
        canvas_width: width,
        canvas_height: height,
        created_by: user.id,
      });
      await loadFrames();
      setSelectedFrameId(frame.id);
      setUploadFile(null);
      setUploadName("");
      flashStatus("Frame baru diupload");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setBusy(false);
    }
  };

  const addSlot = async () => {
    if (!selectedFrameId) return;
    setBusy(true);
    try {
      const order =
        slots.length === 0
          ? 0
          : Math.max(...slots.map((s) => s.slot_order)) + 1;
      const slot = newSlotDefaults(selectedFrameId, order);
      const saved = await upsertFrameSlot(slot);
      setSlots((prev) => [...prev, saved]);
      setSelectedSlotId(saved.id);
      flashStatus("Slot ditambah");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal tambah slot");
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!selectedFrameId || !confirm("Hapus semua slot frame ini?")) return;
    setBusy(true);
    try {
      await deleteAllFrameSlots(selectedFrameId);
      setSlots([]);
      setSelectedSlotId(null);
      flashStatus("Semua slot dihapus");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal hapus slot");
    } finally {
      setBusy(false);
    }
  };

  const removeSlot = useCallback(async (slotId: string) => {
    setBusy(true);
    try {
      await deleteFrameSlot(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      setSelectedSlotId((curr) => (curr === slotId ? null : curr));
      flashStatus("Slot dihapus");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal hapus slot");
    } finally {
      setBusy(false);
    }
  }, [setBusy, setSlots, setSelectedSlotId, flashStatus, setError]);

  const duplicateSlot = async (slot: LocalSlot) => {
    if (!selectedFrameId) return;
    const order = Math.max(...slots.map((s) => s.slot_order)) + 1;
    const copy: LocalSlot = {
      ...slot,
      id: uuidv4(),
      slot_order: order,
      x: Math.min(95, slot.x + 3),
      y: Math.min(95, slot.y + 3),
    };
    setBusy(true);
    try {
      const saved = await upsertFrameSlot(copy);
      setSlots((prev) => [...prev, saved]);
      setSelectedSlotId(saved.id);
      flashStatus("Slot diduplikasi");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal duplikasi");
    } finally {
      setBusy(false);
    }
  };

  const toPercent = (clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const onSlotPointerDown = (
    e: ReactPointerEvent,
    slot: LocalSlot,
    mode: DragMode,
  ) => {
    e.stopPropagation();
    setSelectedSlotId(slot.id);
    const { x, y } = toPercent(e.clientX, e.clientY);
    dragRef.current = {
      mode,
      slotId: slot.id,
      startX: x,
      startY: y,
      orig: { ...slot },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onCanvasPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = toPercent(e.clientX, e.clientY);
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const o = drag.orig;

    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== drag.slotId) return s;
        if (drag.mode === "move") {
          return {
            ...s,
            x: clamp(o.x + dx, 0, 100 - o.width),
            y: clamp(o.y + dy, 0, 100 - o.height),
          };
        }
        if (drag.mode === "resize-se") {
          return {
            ...s,
            width: clamp(o.width + dx, 5, 100 - o.x),
            height: clamp(o.height + dy, 5, 100 - o.y),
          };
        }
        if (drag.mode === "resize-sw") {
          const newW = clamp(o.width - dx, 5, o.x + o.width);
          const newX = o.x + (o.width - newW);
          return {
            ...s,
            x: clamp(newX, 0, 100 - newW),
            width: newW,
            height: clamp(o.height + dy, 5, 100 - o.y),
          };
        }
        if (drag.mode === "resize-ne") {
          const newH = clamp(o.height - dy, 5, o.y + o.height);
          const newY = o.y + (o.height - newH);
          return {
            ...s,
            y: clamp(newY, 0, 100 - newH),
            width: clamp(o.width + dx, 5, 100 - o.x),
            height: newH,
          };
        }
        if (drag.mode === "resize-nw") {
          const newW = clamp(o.width - dx, 5, o.x + o.width);
          const newH = clamp(o.height - dy, 5, o.y + o.height);
          return {
            ...s,
            x: clamp(o.x + (o.width - newW), 0, 100 - newW),
            y: clamp(o.y + (o.height - newH), 0, 100 - newH),
            width: newW,
            height: newH,
          };
        }
        if (drag.mode === "rotate") {
          const cx = o.x + o.width / 2;
          const cy = o.y + o.height / 2;
          const angle =
            (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
          return { ...s, rotation: Math.round(angle) };
        }
        return s;
      }),
    );
  };

  const onCanvasPointerUp = async () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const slot = slots.find((s) => s.id === drag.slotId);
    if (slot) {
      try {
        await persistSlot(slot);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Gagal simpan slot");
      }
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedSlotId &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        removeSlot(selectedSlotId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSlotId, removeSlot]);

  const updateFrameMeta = async (
    patch: Partial<Pick<FrameRow, "name" | "category" | "is_active">>,
  ) => {
    if (!selectedFrameId) return;
    setBusy(true);
    try {
      await updateFrame(selectedFrameId, patch);
      setFrames((prev) =>
        prev.map((f) => (f.id === selectedFrameId ? { ...f, ...patch } : f)),
      );
      flashStatus("Metadata frame diupdate");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal update frame");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 text-sm">
        Memuat frames...
      </div>
    );
  }

  const frameUrl = selectedFrame
    ? frameImageUrl(selectedFrame.r2_image_path)
    : "";

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 underline text-xs"
          >
            tutup
          </button>
        </div>
      )}
      {status && (
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {status}
        </div>
      )}

      {/* Upload frame baru */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <UploadSimple size={20} />
          Upload Frame Baru
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nama
            </label>
            <input
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Summer Strip 2026"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Kategori
            </label>
            <select
              value={uploadCategory}
              onChange={(e) =>
                setUploadCategory(e.target.value as FrameCategory)
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              PNG Frame
            </label>
            <input
              type="file"
              accept="image/png"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
          <button
            onClick={handleUploadFrame}
            disabled={busy || !uploadFile}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-800"
          >
            {busy ? "Uploading..." : "Upload & Buat Frame"}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        {/* Canvas area */}
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="text-sm font-medium text-slate-700">
              Frame:
            </label>
            <select
              value={selectedFrameId ?? ""}
              onChange={(e) => setSelectedFrameId(e.target.value || null)}
              className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">— Pilih frame —</option>
              {frames.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name ?? f.id.slice(0, 8)} ({f.category})
                </option>
              ))}
            </select>
            <button
              onClick={addSlot}
              disabled={!selectedFrameId || busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              <Plus size={16} weight="bold" />
              Tambah Slot
            </button>
            <button
              onClick={clearAll}
              disabled={!selectedFrameId || slots.length === 0 || busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 disabled:opacity-50"
            >
              <Trash size={16} />
              Clear All
            </button>
          </div>

          {!selectedFrame ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Pilih atau upload frame untuk mulai tuning slot
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-3">
                Drag slot = pindah · pojok = resize · lingkaran atas = rotate ·
                double-click = duplicate · Del = hapus
              </p>
              <div
                ref={canvasRef}
                className="relative mx-auto max-w-2xl w-full bg-slate-100 border border-slate-300 rounded-lg overflow-hidden select-none touch-none"
                style={{ aspectRatio: `${aspect}` }}
                onPointerMove={onCanvasPointerMove}
                onPointerUp={onCanvasPointerUp}
                onPointerLeave={onCanvasPointerUp}
              >
                {frameUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={frameUrl}
                    alt="Frame preview"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                    Preview tidak tersedia
                  </div>
                )}

                {slots.map((slot) => {
                  const selected = slot.id === selectedSlotId;
                  return (
                    <div
                      key={slot.id}
                      className={`absolute border-2 ${
                        selected
                          ? "border-orange-500 bg-orange-500/20"
                          : "border-blue-500/80 bg-blue-500/10"
                      }`}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        width: `${slot.width}%`,
                        height: `${slot.height}%`,
                        transform: `rotate(${slot.rotation ?? 0}deg)`,
                        transformOrigin: "center center",
                      }}
                      onPointerDown={(e) => onSlotPointerDown(e, slot, "move")}
                      onDoubleClick={() => duplicateSlot(slot)}
                    >
                      <span className="absolute -top-5 left-0 text-[10px] font-bold bg-slate-900 text-white px-1 rounded">
                        #{slot.slot_order + 1}
                      </span>
                      {/* Rotate handle */}
                      <div
                        className="absolute left-1/2 -top-4 -translate-x-1/2 w-3 h-3 rounded-full bg-orange-500 border-2 border-white cursor-grab shadow"
                        onPointerDown={(e) =>
                          onSlotPointerDown(e, slot, "rotate")
                        }
                      />
                      {/* Corner handles */}
                      {(
                        [
                          ["resize-nw", "left-0 top-0 -translate-x-1/2 -translate-y-1/2"],
                          ["resize-ne", "right-0 top-0 translate-x-1/2 -translate-y-1/2"],
                          ["resize-sw", "left-0 bottom-0 -translate-x-1/2 translate-y-1/2"],
                          ["resize-se", "right-0 bottom-0 translate-x-1/2 translate-y-1/2"],
                        ] as const
                      ).map(([mode, pos]) => (
                        <div
                          key={mode}
                          className={`absolute ${pos} w-2.5 h-2.5 bg-white border-2 border-blue-600 cursor-nwse-resize`}
                          onPointerDown={(e) =>
                            onSlotPointerDown(e, slot, mode)
                          }
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Metadata panel */}
        <aside className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 h-fit">
          <h3 className="font-semibold text-slate-900 text-sm">
            Metadata Frame
          </h3>
          {selectedFrame ? (
            <>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nama</label>
                <input
                  value={selectedFrame.name ?? ""}
                  onChange={(e) =>
                    setFrames((prev) =>
                      prev.map((f) =>
                        f.id === selectedFrame.id
                          ? { ...f, name: e.target.value }
                          : f,
                      ),
                    )
                  }
                  onBlur={(e) => updateFrameMeta({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Kategori
                </label>
                <select
                  value={selectedFrame.category}
                  onChange={(e) =>
                    updateFrameMeta({
                      category: e.target.value as FrameCategory,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Aktif</span>
                <input
                  type="checkbox"
                  checked={selectedFrame.is_active}
                  onChange={(e) =>
                    updateFrameMeta({ is_active: e.target.checked })
                  }
                  className="w-4 h-4"
                />
              </div>
              <dl className="text-xs space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Jumlah slot</dt>
                  <dd className="font-mono text-slate-800">{slots.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Natural size</dt>
                  <dd className="font-mono text-slate-800">
                    {cw}×{ch}px
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Aspect ratio</dt>
                  <dd className="font-mono text-slate-800">
                    {(cw / ch).toFixed(3)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Image path</dt>
                  <dd className="font-mono text-[10px] text-slate-700 break-all">
                    {selectedFrame.r2_image_path}
                  </dd>
                </div>
              </dl>

              {selectedSlotId && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-700 mb-2">
                    Slot terpilih
                  </p>
                  {(() => {
                    const s = slots.find((x) => x.id === selectedSlotId);
                    if (!s) return null;
                    return (
                      <dl className="text-[10px] font-mono space-y-1 text-slate-600">
                        <div>x: {s.x.toFixed(1)}%</div>
                        <div>y: {s.y.toFixed(1)}%</div>
                        <div>w: {s.width.toFixed(1)}%</div>
                        <div>h: {s.height.toFixed(1)}%</div>
                        <div>rot: {s.rotation}°</div>
                      </dl>
                    );
                  })()}
                  <button
                    onClick={() => removeSlot(selectedSlotId)}
                    className="mt-2 w-full text-xs py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Hapus slot ini
                  </button>
                </div>
              )}

              <button
                onClick={() =>
                  selectedFrameId && loadSlots(selectedFrameId)
                }
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                <ArrowCounterClockwise size={14} />
                Reload slots
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-500">Belum ada frame dipilih</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
