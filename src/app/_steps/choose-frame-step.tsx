"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Sparkle, Spinner, Image as ImageIcon, Star } from "@phosphor-icons/react";
import { usePhotobooth } from "@/app/_providers/photobooth-provider";
import {
  fetchAllActiveFramesWithSlots,
  type FrameWithSlots,
} from "@/lib/supabase/queries";
import { frameImageUrl, frameThumbnailUrl } from "@/lib/utils/r2-public";
import type { FrameCategory } from "@/types/database";
import { HalftoneDots } from "@/app/_components/decorative/HalftoneDots";
import { RibbonWave } from "@/app/_components/decorative/RibbonWave";
import { BadgeStamp } from "@/app/_components/decorative/BadgeStamp";

const CATEGORY_LABELS: Record<FrameCategory | "all", string> = {
  all: "Semua",
  single: "Single",
  "strip-3": "Strip 3",
  "strip-4": "Strip 4",
  "photostrip-3x2": "Photo Strip 3×2",
  "photostrip-4x2": "Photo Strip 4×2",
};

export function ChooseFrameStep() {
  const { setSelectedFrame, prevStep, setStep, clearPhotos } = usePhotobooth();
  const [frames, setFrames] = useState<FrameWithSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<FrameCategory | "all">("all");
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const all = await fetchAllActiveFramesWithSlots();
        if (!cancelled) setFrames(all);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat frame dari server",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo<(FrameCategory | "all")[]>(() => {
    const seen = new Set<FrameCategory | "all">(["all"]);
    for (const f of frames) if (f.category) seen.add(f.category);
    return Array.from(seen);
  }, [frames]);

  const filtered = useMemo(
    () =>
      activeCat === "all"
        ? frames
        : frames.filter((f) => f.category === activeCat),
    [frames, activeCat],
  );

  const handleSelect = useCallback(
    (frameId: string) => {
      const frame = frames.find((f) => f.id === frameId);
      if (!frame) return;
      setPickingId(frameId);
      clearPhotos();
      setSelectedFrame(frame);
      setTimeout(() => setStep("camera"), 120);
    },
    [frames, setSelectedFrame, clearPhotos, setStep],
  );

  return (
    <section className="min-h-dvh w-full bg-background px-4 py-6 md:py-10 safe-top safe-bottom relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 inset-0 overflow-hidden">
        <div className="absolute -top-2 -right-2 w-48 h-48 md:w-64 md:h-64 opacity-25">
          <HalftoneDots color="var(--color-pink)" opacity={0.2} spacing={13} dotSize={3} />
        </div>
        <div className="absolute bottom-4 -left-6 w-56 h-56 md:w-72 md:h-72 opacity-20">
          <HalftoneDots color="var(--color-mustard)" opacity={0.25} spacing={14} dotSize={3.5} />
        </div>

        <div className="retro-sticker-dot absolute top-24 right-[6%] w-10 h-10 md:w-12 md:h-12 rotate-[8deg] bg-secondary-200" style={{borderColor: '#D97706', boxShadow: '2px 2px 0 0 #D97706'}}>
          <Star size={16} weight="fill" className="text-secondary-700" />
        </div>
        <div className="retro-sticker-dot absolute bottom-24 left-[5%] w-9 h-9 md:w-11 md:h-11 rotate-[-10deg] bg-primary-100" style={{borderColor: '#9B0A14', boxShadow: '2px 2px 0 0 #9B0A14'}}>
          <span className="text-[9px] md:text-[10px] font-bold text-primary-700 leading-none text-center">COOL!<br/>✦</span>
        </div>
      </div>

      <div className="w-full max-w-xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto relative z-10 px-0 md:px-2">
        <header className="flex items-center justify-between mb-6 md:mb-8 relative gap-2">
          <button
            onClick={prevStep}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-foreground hover:bg-card border-[3px] border-transparent hover:border-[#3D2914] transition focus-ring retro-btn-ghost !py-1.5 !px-2.5 !text-xs !rounded-2xl !shadow-retro-sm flex-shrink-0"
            aria-label="Kembali ke intro"
          >
            <ArrowLeft size={18} />
            <span className="font-heading text-xs hidden sm:inline tracking-wide text-uppercase-badge">
              BACK
            </span>
          </button>
          <div className="text-center relative flex-1">
            <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 -z-0 opacity-80 w-56 md:w-80 lg:w-96 max-w-full">
              <RibbonWave colorFrom="var(--color-lavender)" colorTo="var(--color-pink)" />
            </div>
            <h2 className="heading-bubble-mustard text-xl md:text-3xl xl:text-4xl relative z-10 inline-flex items-center justify-center gap-2 md:gap-3">
              PILIH <span className="heading-bubble">FRAME</span>
              <Sparkle
                size={18}
                className="text-secondary-600"
                weight="fill"
                aria-hidden="true"
              />
            </h2>
            <p className="text-[11px] md:text-sm text-muted-foreground mt-1 md:mt-2 font-body">
              <span className="font-accent-hand text-base md:text-lg">Semua</span> frame aktif · <span className="font-bold">{frames.length}</span> tersedia
            </p>
          </div>
          <div className="w-16 md:w-24 relative hidden sm:block flex-shrink-0" aria-hidden="true">
            <div className="absolute -top-6 right-0 md:-top-8">
              <BadgeStamp bg="var(--color-teal)" rotate={7} size="sm">
                PICK ME!
              </BadgeStamp>
            </div>
          </div>
        </header>

        {categories.length > 1 && (
          <div className="mb-5 -mx-4 px-4 overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              {categories.map((cat) => {
                const active = cat === activeCat;
                const count =
                  cat === "all"
                    ? frames.length
                    : frames.filter((f) => f.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCat(cat)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-[3px] font-heading text-heading-retro text-[11px] md:text-xs whitespace-nowrap transition focus-ring tracking-wide ${
                      active
                        ? "bg-primary-600 text-white border-[#3D2914] shadow-retro-sm"
                        : "bg-card text-foreground border-[#3D2914] hover:border-primary-600 shadow-retro-sm"
                    }`}
                    aria-pressed={active}
                  >
                    {CATEGORY_LABELS[cat]}
                    <span
                      className={`inline-flex items-center justify-center min-w-5 h-5 text-[10px] rounded-full px-1.5 border-2 ${
                        active
                          ? "bg-white/25 text-white border-white/40"
                          : "bg-muted text-muted-foreground border-[#3D2914]/30"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size={32} className="text-primary-600 animate-spin" />
            <p className="text-xs text-muted-foreground font-body">
              Memuat frame...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="retro-card-pink p-8 text-center max-w-md mx-auto">
            <p className="text-sm text-destructive mb-4 font-body">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="retro-btn-primary px-5 py-2.5 text-sm focus-ring"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="retro-card-mustard p-8 text-center max-w-md mx-auto">
            <p className="font-heading text-heading-retro text-foreground mb-2">
              Belum ada frame
            </p>
            <p className="text-xs text-muted-foreground font-body mb-4">
              Kategori ini belum punya frame aktif.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {filtered.map((frame, idx) => {
              const thumb =
                frameThumbnailUrl(frame.id, frame.r2_image_path) ||
                frameImageUrl(frame.r2_image_path);
              const isPicking = pickingId === frame.id;
              const thumbFailed = failedThumbs.has(frame.id);
              const showImg = thumb && !thumbFailed;
              const slightRotate = (idx % 5 - 2) * 0.8;
              return (
                <button
                  key={frame.id}
                  onClick={() => handleSelect(frame.id)}
                  disabled={isPicking}
                  className={`group retro-card p-2 text-left hover:scale-[1.03] active:scale-[0.98] transition-transform focus-ring overflow-hidden ${
                    isPicking ? "ring-4 ring-primary-500/60" : ""
                  }`}
                  style={{ transform: `rotate(${slightRotate}deg)` }}
                >
                  <div
                    className="relative rounded-2xl overflow-hidden bg-muted border-[3px] border-[#3D2914]"
                    style={{
                      aspectRatio: `${frame.canvas_width || 3} / ${frame.canvas_height || 4}`,
                    }}
                  >
                    {showImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={frame.name ?? "Frame"}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={() => {
                          console.error("[BA2W] Frame gagal load:", {
                            frameId: frame.id,
                            frameName: frame.name,
                            r2ImagePath: frame.r2_image_path,
                            fullUrl: thumb,
                          });
                          setFailedThumbs((prev) => {
                            const n = new Set(prev);
                            n.add(frame.id);
                            return n;
                          });
                        }}
                      />
                    ) : thumbFailed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-destructive bg-gradient-to-br from-destructive/10 to-card/70 border-[2.5px] border-dashed border-destructive/70 rounded-lg m-0.5">
                        <ImageIcon size={26} weight="duotone" className="text-destructive/80" aria-hidden="true" />
                        <span className="text-[10px] font-heading text-heading-retro text-destructive tracking-wide uppercase">
                          Frame gagal dimuat
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground bg-gradient-to-br from-muted to-card/70">
                        <ImageIcon size={26} weight="duotone" className="opacity-60" aria-hidden="true" />
                        <span className="text-[10px] font-heading text-heading-retro opacity-70 tracking-wide uppercase">
                          No preview
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/10 transition-colors" />
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3D2914]/85 text-white text-[10px] font-heading text-heading-retro backdrop-blur-sm border-2 border-white/30 tracking-wide uppercase">
                      {frame.slots.length} SLOT
                    </span>
                  </div>
                  <div className="px-1 pt-2.5 pb-1">
                    <p className="font-heading text-heading-retro text-sm text-foreground truncate tracking-wide">
                      {frame.name ?? "Untitled"}
                    </p>
                    {frame.description && (
                      <p className="text-[10px] text-muted-foreground truncate font-body mt-0.5">
                        {frame.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
