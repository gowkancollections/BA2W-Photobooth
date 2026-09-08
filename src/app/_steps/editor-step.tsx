"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowCounterClockwise,
  Camera,
  Download,
  FilmSlate,
  Spinner,
  Sticker as StickerIcon,
  Trash,
} from "@phosphor-icons/react";
import { usePhotobooth } from "@/app/_providers/photobooth-provider";
import { Transformer } from "@/app/_components/transformer";
import { fetchActiveStickers } from "@/lib/supabase/queries";
import { downloadDataUrl } from "@/lib/utils/canvas";
import { computeCoverFit } from "@/lib/utils/canvas";
import { renderPhotoboothDataUrl } from "@/lib/utils/render-photobooth";
import { stickerImageUrl } from "@/lib/utils/r2-public";
import { slotToPixels } from "@/lib/utils/slot-coords";
import type { PlacedSticker } from "@/types/photobooth";
import { frameImageUrl } from "@/lib/utils/r2-public";
import { HalftoneDots } from "@/app/_components/decorative/HalftoneDots";
import { RibbonWave } from "@/app/_components/decorative/RibbonWave";
import { BadgeStamp } from "@/app/_components/decorative/BadgeStamp";

// ====== CONFIG PADDING AREA DI LUAR FRAME ======
// 150px padding tiap sisi (x2 = 300px lebih besar total canvas dari ukuran frame).
// Frame PNG + foto2 selalu posisi TENGAH vertikal & horizontal di area total canvas.
const CANVAS_PADDING_X = 150;
const CANVAS_PADDING_Y = 150;

export function EditorStep() {
  const pb = usePhotobooth();
  const {
    selectedFrame,
    photos,
    photoTransforms,
    placedStickers,
    stickers,
    setStickers,
    setPhotoTransform,
    addPlacedSticker,
    updatePlacedSticker,
    removePlacedSticker,
    prevStep,
    setStep,
    resetAll,
    recapBackground,
    setRecapBackground,
  } = pb;

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [stickersLoading, setStickersLoading] = useState(true);
  const [selectedSlotOrder, setSelectedSlotOrder] = useState<number | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const [frameVisualLoaded, setFrameVisualLoaded] = useState(false);

  // ===== [TOGGLE OPSI USER: PADDING BACKGROUND AREA] =====
  // - TRUE  (ON) : CANVAS MELEBAR — ada area padding warna background LUAR frame,
  //                150px tiap sisi (total 300px per dimensi). Default sesuai brief awal.
  // - FALSE (OFF): FIT WITH FRAME — padding = 0, total canvas persis = ukuran asli frame.
  //                Tidak ada ruang warna background di luar frame PNG.
  const [paddingEnabled, setPaddingEnabled] = useState(true);

  // Ukuran ASLI FRAME dari DB (canvas_width / canvas_height) = area di mana foto + frame PNG berada.
  const cw = selectedFrame?.canvas_width ?? 1200;
  const ch = selectedFrame?.canvas_height ?? 1800;
  // PADDING ACTUAL (dipakai SEMUA kalkulasi: display, posisi, export HD, dll)
  const actualPadX = paddingEnabled ? CANVAS_PADDING_X : 0;
  const actualPadY = paddingEnabled ? CANVAS_PADDING_Y : 0;
  // Ukuran TOTAL CANVAS (seluruh area export HD) = frame area + padding actual (luar frame).
  const totalCw = cw + actualPadX * 2;
  const totalCh = ch + actualPadY * 2;
  const frameOverlayUrl = useMemo(
    () => (selectedFrame ? frameImageUrl(selectedFrame.r2_image_path) : ""),
    [selectedFrame],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStickersLoading(true);
      try {
        const rows = await fetchActiveStickers();
        if (!cancelled) setStickers(rows);
      } catch {
        // sticker panel kosong jika gagal fetch
      } finally {
        if (!cancelled) setStickersLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [setStickers]);

  useEffect(() => {
    setFrameVisualLoaded(false);
  }, [frameOverlayUrl]);

  // Inisialisasi PhotoTransform untuk foto yang belum punya (x,y,w,h,rot)
  // Dipanggil sekali pada mount & ketika foto berubah
  useEffect(() => {
    if (!selectedFrame) return;
    for (const photo of photos) {
      const t = photoTransforms.find((tr) => tr.photoId === photo.id);
      if (t && t.width > 0 && t.height > 0) continue;
      const slot = selectedFrame.slots.find(
        (s) => s.slot_order === photo.slotOrder,
      );
      if (!slot) continue;
      const slotPx = slotToPixels(slot, cw, ch);
      // Load image untuk dapat natural size via dataUrl
      const img = new Image();
      img.onload = () => {
        const fit = computeCoverFit({
          containerW: slotPx.width,
          containerH: slotPx.height,
          contentW: img.naturalWidth,
          contentH: img.naturalHeight,
          scale: 1.02,
          offsetX: 0,
          offsetY: 0,
        });
        // x, y = posisi foto relatif terhadap SLOT origin (bukan canvas)
        setPhotoTransform(photo.id, {
          x: fit.dx, // within-slot offset
          y: fit.dy,
          width: fit.dw,
          height: fit.dh,
          rotation: 0,
        });
      };
      img.src = photo.dataUrl;
    }
  }, [photos, selectedFrame, cw, ch, photoTransforms, setPhotoTransform]);

  const displayScaleRef = useRef(1);
  const [displayScaleTick, setDisplayScaleTick] = useState(0);
  // Display scale berdasarkan TOTAL CANVAS (bukan frame saja) —
  // karena container sekarang sudah beraspect ratio totalCw/totalCh.
  // Recompute ketika padding ON/OFF berubah (totalCw berubah -> aspect ratio berubah).
  const recomputeScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    displayScaleRef.current = rect.width / totalCw;
    setDisplayScaleTick((x) => x + 1);
  }, [totalCw]);

  // Recompute display scale SETIAP KALI toggle paddingEnabled berubah (karena totalCw/totalCh berubah).
  useEffect(() => {
    recomputeScale();
    // reset visual state fade in ulang kapan pun total canvas / gambare berubah.
    setFrameVisualLoaded(false);
  }, [paddingEnabled, recomputeScale, frameOverlayUrl]);

  useEffect(() => {
    recomputeScale();
    const el = containerRef.current;
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => recomputeScale());
      ro.observe(el);
    }
    const onResize = () => recomputeScale();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
    };
  }, [recomputeScale, selectedFrame]);

  const toDisplayPx = (canvasPx: number) =>
    canvasPx * displayScaleRef.current;

  const addStickerFromPanel = (stickerId: string, imagePath: string | null) => {
    const url = stickerImageUrl(imagePath);
    if (!url) return;
    const size = cw * 0.15;
    // Sticker koordinat state SELALU relatif ke AREA FRAME (cw x ch) — BUKAN total canvas.
    // Jadi posisi default = TENGAH FRAME. Nanti di display & export final baru ditambah
    // OFFSET CANVAS_PADDING_X/Y agar posisi sticker tepat di tengah area frame di canvas yang lebih besar.
    addPlacedSticker({
      stickerId,
      imageUrl: url,
      x: cw / 2 - size / 2,
      y: ch / 2 - size / 2,
      width: size,
      height: size,
      rotation: 0,
    });
  };

  const handleDownload = async () => {
    if (!selectedFrame) return;
    setDownloading(true);
    try {
      const url = await renderPhotoboothDataUrl({
        frame: selectedFrame,
        photos,
        photoTransforms,
        placedStickers,
        outputWidth: totalCw,
        outputHeight: totalCh,
        recapBackground,
      });
      const name =
        selectedFrame?.name?.replace(/\s+/g, "-").toLowerCase() ?? "photobooth";
      downloadDataUrl(url, `ba2w-${name}-${Date.now()}.png`);
      setDownloaded(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert("Gagal export photobooth. Coba lagi.\n\n" + message);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedStickerId
      ) {
        removePlacedSticker(selectedStickerId);
        setSelectedStickerId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedStickerId, removePlacedSticker]);

  const onContainerPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-sticker], [data-photo-slot]"))
      return;
    setSelectedSlotOrder(null);
    setSelectedStickerId(null);
  };

  if (!selectedFrame) {
    return (
      <section className="min-h-dvh bg-background p-6 flex items-center justify-center">
        <div className="retro-card p-8 max-w-sm text-center">
          <p className="text-sm text-muted-foreground mb-4 font-body">
            Pilih frame terlebih dahulu.
          </p>
          <button
            onClick={() => setStep("choose-frame")}
            className="retro-btn-primary px-5 py-2.5 text-sm focus-ring"
          >
            Ke Pilih Frame
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-dvh w-full bg-background flex flex-col safe-top safe-bottom relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 opacity-20">
          <HalftoneDots color="var(--color-lavender)" opacity={0.25} spacing={13} dotSize={3} />
        </div>
        <div className="absolute bottom-0 left-0 w-40 h-40 md:w-56 md:h-56 opacity-18">
          <HalftoneDots color="var(--color-pink)" opacity={0.22} spacing={12} dotSize={3} />
        </div>
      </div>

      <header className="flex items-center justify-between px-4 py-3 md:px-6 border-b-[3px] border-border/50 bg-card/40 backdrop-blur relative z-10">
        <button
          onClick={prevStep}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-card border-[3px] border-transparent hover:border-[#3D2914] transition focus-ring retro-btn-ghost !py-1.5 !px-2.5 !text-xs !rounded-2xl !shadow-retro-sm"
        >
          <ArrowLeft size={18} />
          <span className="font-heading text-xs hidden sm:inline tracking-wide text-uppercase-badge">
            BACK
          </span>
        </button>
        <div className="text-center relative">
          <div className="absolute -bottom-2 left-0 right-0 -z-0 opacity-75">
            <RibbonWave colorFrom="var(--color-teal)" colorTo="var(--color-mustard)" />
          </div>
          <h2 className="relative z-10 inline-flex items-baseline gap-1.5 md:gap-2 flex-wrap justify-center">
            <span className="heading-bubble text-base md:text-lg">EDIT</span>
            <span className="text-[10px] md:text-xs text-foreground">·</span>
            <span className="heading-bubble-pink text-base md:text-lg">STICKER</span>
            <span className="text-[10px] md:text-xs text-foreground">&amp;</span>
            <span className="heading-bubble-mustard text-base md:text-lg">DL</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="hidden lg:block absolute -top-10 left-1/2 -translate-x-1/2">
            <BadgeStamp bg="var(--color-pink)" rotate={-6} size="sm">
              FINAL! ✦
            </BadgeStamp>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="retro-btn-primary px-3.5 py-2 text-[11px] md:text-xs focus-ring flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide text-uppercase-badge"
          >
            <Download size={14} weight="fill" />
            {downloading ? "RENDER..." : downloaded ? "LAGI" : "DL"}
          </button>
        </div>
      </header>

      <div className="flex-1 w-full overflow-hidden relative z-10">
        <div className="w-full max-w-5xl mx-auto h-full flex flex-col lg:flex-row">
          <div
            onPointerDown={onContainerPointerDown}
            className="lg:flex-[1.4] p-4 md:p-6 flex flex-col items-center justify-center min-h-0 relative"
          >
            <p className="text-[11px] md:text-xs text-muted-foreground mb-3 text-center font-body z-10 relative">
              <span className="font-accent-hand text-[15px] mr-1">Tap</span> foto → drag / resize / rotate · Tap sticker → transform · Del =
              hapus sticker
            </p>
            <div
              ref={containerRef}
              className="relative w-full max-w-[720px] mx-auto shadow-retro-lg rounded-3xl border-[4px] border-[#3D2914] overflow-hidden"
              style={{
                // ASPECT RATIO = TOTAL CANVAS (frame + padding semua sisi).
                // Jadi keliatan jelas ada ruang padding warna recapBackground di LUAR frame PNG,
                // frame posisi TENGAH vertikal & horizontal.
                aspectRatio: `${totalCw} / ${totalCh}`,
                ...(recapBackground && recapBackground.trim().startsWith("linear-gradient")
                  ? { backgroundImage: recapBackground }
                  : { backgroundColor: recapBackground || "#FFF8E7" }),
              }}
            >
            {/* Layer 1: Canvas untuk selected outline & debug */}
            <canvas
              className="absolute inset-0 w-full h-full block pointer-events-none opacity-0"
              aria-hidden="true"
            />

            {/* Layer 2: Photos per slot (dengan wrapper overflow + Transformer) */}
            {selectedFrame.slots
              .sort((a, b) => a.slot_order - b.slot_order)
              .map((slot) => {
                const photo = photos.find(
                  (p) => p.slotOrder === slot.slot_order,
                );
                const t = photo
                  ? photoTransforms.find((tr) => tr.photoId === photo.id)
                  : undefined;
                const slotPx = slotToPixels(slot, cw, ch);
                const isSelected = selectedSlotOrder === slot.slot_order;
                const minSizeSlot = Math.min(slotPx.width, slotPx.height);
                const photoReady = photo && t && t.width > 0 && t.height > 0;
                return (
                  <div
                    key={slot.slot_order}
                    data-photo-slot
                    className="absolute"
                    style={{
                      // Slot state SLOT relatif ke FRAME -> tambah OFFSET padding agar masuk ditengah total canvas.
                      left: `${toDisplayPx(slotPx.x + actualPadX)}px`,
                      top: `${toDisplayPx(slotPx.y + actualPadY)}px`,
                      width: `${toDisplayPx(slotPx.width)}px`,
                      height: `${toDisplayPx(slotPx.height)}px`,
                      transform: `rotate(${slotPx.rotation}deg)`,
                      transformOrigin: "center center",
                      overflow: "hidden",
                      borderRadius: 4,
                      backgroundColor: photo ? "#ffffff" : "#F7EBD0",
                      outline: isSelected
                        ? `3px solid #E63946`
                        : "none",
                      outlineOffset: isSelected ? "2px" : 0,
                      boxShadow: isSelected
                        ? "0 0 0 6px rgba(230, 57, 70, 0.18)"
                        : "none",
                      zIndex: isSelected ? 5 : 1,
                    }}
                  >
                    {!photo && (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-heading text-heading-retro text-muted-foreground/70">
                        Slot {slot.slot_order + 1}
                      </div>
                    )}
                    {photoReady && (
                      <Transformer
                        selected={isSelected}
                        x={t!.x}
                        y={t!.y}
                        width={t!.width}
                        height={t!.height}
                        rotation={t!.rotation}
                        minSize={minSizeSlot}
                        scale={displayScaleRef.current}
                        accentColor="#E63946"
                        onSelect={() => {
                          setSelectedSlotOrder(slot.slot_order);
                          setSelectedStickerId(null);
                        }}
                        onUpdate={(patch) => {
                          const canvasPatch: Partial<{
                            x: number;
                            y: number;
                            width: number;
                            height: number;
                            rotation: number;
                          }> = {};
                          if (patch.x !== undefined) canvasPatch.x = patch.x;
                          if (patch.y !== undefined) canvasPatch.y = patch.y;
                          if (patch.width !== undefined)
                            canvasPatch.width = patch.width;
                          if (patch.height !== undefined)
                            canvasPatch.height = patch.height;
                          if (patch.rotation !== undefined)
                            canvasPatch.rotation = patch.rotation;
                          setPhotoTransform(photo.id, canvasPatch);
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.dataUrl}
                          alt={`Foto slot ${slot.slot_order + 1}`}
                          draggable={false}
                          className="w-full h-full object-cover select-none pointer-events-none block"
                          style={{
                            userSelect: "none",
                            filter:
                              photo.filterCss && photo.filterCss !== "none"
                                ? photo.filterCss
                                : "none",
                          }}
                        />
                      </Transformer>
                    )}
                    {photo && !photoReady && (
                      <div className="w-full h-full flex items-center justify-center bg-muted/50">
                        <Spinner
                          size={20}
                          className="text-primary-600 animate-spin"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Layer 3: Frame PNG overlay (visual only — no crossOrigin) */}
            {frameOverlayUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={frameOverlayUrl}
                key={frameOverlayUrl + "-" + String(paddingEnabled)}
                alt=""
                aria-hidden="true"
                draggable={false}
                className={`absolute block pointer-events-none select-none transition-opacity duration-200 ${
                  frameVisualLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  userSelect: "none",
                  zIndex: 10,
                  left: `${toDisplayPx(actualPadX)}px`,
                  top: `${toDisplayPx(actualPadY)}px`,
                  width: `${toDisplayPx(cw)}px`,
                  height: `${toDisplayPx(ch)}px`,
                }}
                onLoad={() => setFrameVisualLoaded(true)}
                onError={(e) => {
                  console.error("[BA2W VISUAL] Frame DOM <img> gagal load (periksa URL / 404):", frameOverlayUrl, e);
                  setFrameVisualLoaded(false);
                }}
              />
            )}

            {/* Layer 4: Stickers — frame-space coords; Transformer owns position */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${toDisplayPx(actualPadX)}px`,
                top: `${toDisplayPx(actualPadY)}px`,
                width: `${toDisplayPx(cw)}px`,
                height: `${toDisplayPx(ch)}px`,
                zIndex: 20,
              }}
            >
              {placedStickers.map((s) => {
                const selected = s.id === selectedStickerId;
                return (
                  <StickerOnCanvas
                    key={s.id}
                    sticker={s}
                    selected={selected}
                    scale={displayScaleRef.current}
                    onSelect={() => {
                      setSelectedStickerId(s.id);
                      setSelectedSlotOrder(null);
                    }}
                    onUpdate={(patch) => {
                      const canvasPatch: Partial<PlacedSticker> = {};
                      if (patch.x !== undefined) canvasPatch.x = patch.x;
                      if (patch.y !== undefined) canvasPatch.y = patch.y;
                      if (patch.width !== undefined) canvasPatch.width = patch.width;
                      if (patch.height !== undefined) canvasPatch.height = patch.height;
                      if (patch.rotation !== undefined)
                        canvasPatch.rotation = patch.rotation;
                      updatePlacedSticker(s.id, canvasPatch);
                    }}
                    onDelete={() => {
                      removePlacedSticker(s.id);
                      if (selectedStickerId === s.id) setSelectedStickerId(null);
                    }}
                  />
                );
              })}
            </div>

            {/* Loading state */}
            {!displayScaleTick && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/40 rounded-2xl z-40 pointer-events-none">
                <Spinner size={24} className="text-primary-600 animate-spin" />
              </div>
            )}

            {downloading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#3D2914]/55 rounded-2xl z-50">
                <div className="bg-white rounded-2xl px-6 py-4 shadow-retro flex items-center gap-3 border-[3px] border-[#3D2914]">
                  <Spinner
                    size={22}
                    className="text-primary-600 animate-spin"
                  />
                  <span className="font-heading text-heading-retro text-foreground text-xs tracking-wide">
                    MERENDER HD...
                  </span>
                </div>
              </div>
            )}
          </div>

          {selectedStickerId && (
            <button
              onClick={() => {
                removePlacedSticker(selectedStickerId);
                setSelectedStickerId(null);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-[11px] md:text-xs font-heading text-heading-retro focus-ring tracking-wide uppercase retro-btn-primary !py-2 !px-4 !text-xs"
            >
              <Trash size={14} weight="fill" />
              HAPUS STICKER
            </button>
          )}

          <div className="w-full max-w-md mt-4 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => {
                resetAll();
                setStep("intro");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border-[3px] border-[#3D2914] hover:border-primary-600 text-foreground text-[11px] font-heading text-heading-retro focus-ring tracking-wide uppercase shadow-retro-sm"
            >
              <ArrowCounterClockwise size={13} />
              MULAI ULANG
            </button>
            <button
              onClick={() => {
                resetAll();
                setStep("choose-frame");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border-[3px] border-[#3D2914] hover:border-secondary-600 text-foreground text-[11px] font-heading text-heading-retro focus-ring tracking-wide uppercase shadow-retro-sm"
            >
              <Camera size={13} />
              PHOTOBOOTH LAGI
            </button>
          </div>
        </div>

        <aside
          className={`lg:flex-1 min-w-0 border-t lg:border-t-0 lg:border-l-[3px] border-border/50 bg-card/50 flex flex-col ${
            panelOpen ? "max-h-48 lg:max-h-none" : "max-h-12"
          }`}
        >
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="flex items-center justify-between px-4 py-3 lg:hidden focus-ring"
          >
            <span className="font-heading text-heading-retro text-xs flex items-center gap-2 tracking-wide uppercase">
              <StickerIcon size={16} className="text-secondary-600" />
              STICKERS
            </span>
            <span className="text-[10px] text-muted-foreground font-heading tracking-wide uppercase">
              {panelOpen ? "TUTUP" : "BUKA"}
            </span>
          </button>
          <div
            className={`px-4 pb-4 overflow-y-auto flex-1 ${
              panelOpen ? "block" : "hidden lg:block"
            }`}
          >
            <div className="pt-3 pb-3">
              <BackgroundPickerRow
                selected={recapBackground}
                onChange={(c) => setRecapBackground(c)}
                paddingEnabled={paddingEnabled}
                onTogglePadding={() => setPaddingEnabled((p) => !p)}
              />
            </div>
            <p className="hidden lg:block font-heading text-heading-retro text-xs mb-3 flex items-center gap-2 tracking-wide uppercase">
              <StickerIcon size={16} className="text-secondary-600" />
              STICKERS
            </p>
            {stickersLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size={22} className="text-primary-600 animate-spin" />
              </div>
            ) : stickers.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-6 font-body">
                Belum ada sticker aktif
              </p>
            ) : (
              <div className="grid grid-cols-4 lg:grid-cols-3 gap-2">
                {stickers.map((s) => {
                  const url = stickerImageUrl(s.r2_image_path);
                  return (
                    <button
                      key={s.id}
                      onClick={() =>
                        addStickerFromPanel(s.id, s.r2_image_path)
                      }
                      className="aspect-square rounded-xl bg-white border-[3px] border-[#3D2914] hover:border-secondary-600 p-1 transition focus-ring shadow-retro-sm animate-sticker-pop"
                      title={s.name ?? "Sticker"}
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={s.name ?? "Sticker"}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-heading tracking-wide uppercase">
                          ?
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
        </div>
      </div>
    </section>
  );
}

const BG_PRESETS: { label: string; value: string; swatch: ReactNode }[] = [
  {
    label: "Krem",
    value: "#FFF8E7",
    swatch: <span className="block w-5 h-5 rounded-full border-[2px] border-[#3D2914]" style={{ background: "#FFF8E7" }} />,
  },
  {
    label: "Putih",
    value: "#FFFFFF",
    swatch: <span className="block w-5 h-5 rounded-full border-[2px] border-[#3D2914]" style={{ background: "#FFFFFF" }} />,
  },
  {
    label: "Kuning",
    value: "#FFD977",
    swatch: <span className="block w-5 h-5 rounded-full border-[2px] border-[#3D2914]" style={{ background: "#FFD977" }} />,
  },
  {
    label: "Merah",
    value: "#F8C8C2",
    swatch: <span className="block w-5 h-5 rounded-full border-[2px] border-[#3D2914]" style={{ background: "#F8C8C2" }} />,
  },
  {
    label: "Hijau",
    value: "#C8E2C8",
    swatch: <span className="block w-5 h-5 rounded-full border-[2px] border-[#3D2914]" style={{ background: "#C8E2C8" }} />,
  },
  {
    label: "Biru",
    value: "#C5DDF5",
    swatch: <span className="block w-5 h-5 rounded-full border-[2px] border-[#3D2914]" style={{ background: "#C5DDF5" }} />,
  },
  {
    label: "Coklat",
    value: "#E8D6B7",
    swatch: <span className="block w-5 h-5 rounded-full border-[2px] border-[#3D2914]" style={{ background: "#E8D6B7" }} />,
  },
  {
    label: "Retro",
    value: "linear-gradient(180deg,#FFE5B4 0%, #F8C8C2 100%)",
    swatch: (
      <span
        className="block w-5 h-5 rounded-full border-[2px] border-[#3D2914]"
        style={{ backgroundImage: "linear-gradient(180deg,#FFE5B4 0%, #F8C8C2 100%)" }}
      />
    ),
  },
];

function BackgroundPickerRow({
  selected,
  onChange,
  paddingEnabled,
  onTogglePadding,
}: {
  selected: string;
  onChange: (c: string) => void;
  paddingEnabled: boolean;
  onTogglePadding: () => void;
}) {
  const isGrad = (c: string) => c.includes("gradient");
  const hexBg = (c: string) => (isGrad(c) ? undefined : c);
  const gradBg = (c: string) => (isGrad(c) ? c : undefined);

  return (
    <div className="flex flex-col gap-2">
      {/* Baris 1: Label Background + TOGGLE padding area (wrap 1 baris, ga bikin scroll baru) */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <span className="flex items-center gap-1.5 text-[11px] font-heading text-heading-retro text-muted-foreground tracking-wide uppercase">
          <FilmSlate size={13} className="text-secondary-600" weight="fill" />
          Background
        </span>
        {/* Toggle ON/OFF padding area luar frame */}
        <button
          type="button"
          onClick={onTogglePadding}
          title={paddingEnabled
            ? "Background area ON (canvas luas + warna wrap luar frame)"
            : "Background area OFF (fit frame, tidak ada padding luar)"
          }
          aria-pressed={paddingEnabled}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-heading text-heading-retro transition focus-ring border-[3px] ${paddingEnabled
              ? "bg-secondary-500 text-[#3D2914] border-[#3D2914] shadow-retro-sm"
              : "bg-card text-muted-foreground/90 border-border/60 hover:border-[#3D2914]"
            }`}
        >
          <span
            className={`w-7 h-3.5 rounded-full relative transition-colors ${paddingEnabled ? "bg-[#3D2914]/90" : "bg-border/60"
              }`}
            aria-hidden="true"
          >
            <span
              className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm transition-all bg-white ${paddingEnabled ? "left-[calc(100%-10px-2px)]" : "left-0.5"
                }`}
            />
          </span>
          <span>{paddingEnabled ? "WRAP BG ON" : "FIT FRAME"}</span>
        </button>
      </div>
      {/* Baris 2: preset warna background (overflow-x-auto sendiri, ga ganggu toggle di atas) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {BG_PRESETS.map((p) => {
          const isSel = selected === p.value;
          return (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-heading text-heading-retro transition focus-ring border-[3px] ${
                isSel
                  ? "bg-secondary-500 text-[#3D2914] border-[#3D2914] shadow-retro-sm"
                  : "bg-card text-foreground border-[#3D2914]/80 hover:border-primary-600"
              }`}
              title={`Background: ${p.label}${isSel ? " (aktif)" : ""}`}
              aria-pressed={isSel}
              style={{
                backgroundColor: isSel ? undefined : hexBg(p.value),
                backgroundImage: isSel ? undefined : gradBg(p.value),
              }}
            >
              {isSel ? (
                <span
                  className="w-4 h-4 rounded-full border-[2px] border-[#3D2914]"
                  style={{
                    backgroundColor: hexBg(p.value),
                    backgroundImage: gradBg(p.value),
                  }}
                />
              ) : (
                p.swatch
              )}
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StickerOnCanvas({
  sticker,
  selected,
  scale,
  onSelect,
  onUpdate,
  onDelete,
}: {
  sticker: PlacedSticker;
  selected: boolean;
  scale: number;
  onSelect: () => void;
  onUpdate: (patch: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  }) => void;
  onDelete: () => void;
}) {
  return (
    <div
      data-sticker
      className="absolute inset-0"
      style={{
        zIndex: selected ? 30 : 20,
        pointerEvents: "none",
      }}
    >
      <Transformer
        selected={selected}
        x={sticker.x}
        y={sticker.y}
        width={sticker.width}
        height={sticker.height}
        rotation={sticker.rotation ?? 0}
        scale={scale}
        onSelect={onSelect}
        onUpdate={onUpdate}
        accentColor="#EC4899"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sticker.imageUrl}
          alt="sticker"
          draggable={false}
          className="w-full h-full object-contain select-none pointer-events-none block sticker-shadow"
          style={{ userSelect: "none" }}
        />
        {selected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-2 -right-2 z-40 w-8 h-8 md:w-9 md:h-9 rounded-full bg-destructive text-white flex items-center justify-center shadow-retro-sm border-[3px] border-[#3D2914] hover:scale-110 active:scale-95 transition-transform focus-ring"
            style={{ pointerEvents: "auto" }}
            title="Hapus sticker ini"
            aria-label="Hapus sticker"
          >
            <Trash size={14} weight="fill" />
          </button>
        )}
      </Transformer>
    </div>
  );
}
