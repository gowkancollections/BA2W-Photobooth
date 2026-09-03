"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  Camera,
  CheckCircle,
  ArrowCounterClockwise,
  Sparkle,
  X,
  Upload,
  Play,
  Stop,
  Timer,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { usePhotobooth } from "@/app/_providers/photobooth-provider";
import {
  FILTER_DEFS,
  type FilterKey,
  type CapturedPhoto,
} from "@/types/photobooth";
import { captureVideoFrame } from "@/lib/utils/canvas";
import { frameImageUrl } from "@/lib/utils/r2-public";
import { HalftoneDots } from "@/app/_components/decorative/HalftoneDots";
import { BadgeStamp } from "@/app/_components/decorative/BadgeStamp";

type CameraPhase = "preview" | "countdown" | "capturing" | "review";

const PRESET_LANDSCAPE = { w: 1024, h: 768 };    // 4:3
const PRESET_PORTRAIT = { w: 1080, h: 1440 };     // 3:4

export function CameraStep() {
  const pb = usePhotobooth();
  const { selectedFrame, prevStep, setStep, clearPhotos } = pb;

  if (!selectedFrame || selectedFrame.slots.length === 0) {
    return (
      <section className="min-h-dvh bg-background p-6 flex items-center justify-center">
        <div className="retro-card p-8 max-w-sm text-center">
          <h2 className="font-heading text-heading-retro text-xl text-foreground mb-2">
            Pilih frame dulu
          </h2>
          <p className="text-sm text-muted-foreground mb-4 font-body">
            Kembali ke pilih frame untuk mulai capture.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setStep("choose-frame")}
              className="retro-btn-primary px-5 py-2.5 text-sm focus-ring"
            >
              Ke Pilih Frame
            </button>
            <button
              onClick={prevStep}
              className="retro-btn-ghost px-5 py-2 text-xs focus-ring"
            >
              Back
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <CameraFlowInternal
      onBack={() => {
        clearPhotos();
        setStep("choose-frame");
      }}
      onNext={() => setStep("editor")}
    />
  );
}

function CameraFlowInternal({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const pb = usePhotobooth();
  const {
    selectedFrame,
    cameraFacing,
    mirror,
    filter,
    captureMode,
    countdownSeconds,
    recapBackground,
  } = pb;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const autoCancelledRef = useRef(false);
  const liveRecorderRef = useRef<MediaRecorder | null>(null);
  const liveChunksRef = useRef<Blob[]>([]);
  const liveStartTsRef = useRef<number>(0);

  const slotsNeeded = selectedFrame?.slots.length ?? 0;
  const [phase, setPhase] = useState<CameraPhase>("preview");
  const [slotIndex, setSlotIndex] = useState(0);
  const [countdown, setCountdown] = useState<number>(-1);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [retakePhotoId, setRetakePhotoId] = useState<string | null>(null);
  const [lastCapturedId, setLastCapturedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [autoCaptureRunning, setAutoCaptureRunning] = useState(false);

  const frameOverlayUrl = useMemo(() => {
    if (!selectedFrame) return "";
    return frameImageUrl(selectedFrame.r2_image_path);
  }, [selectedFrame]);

  const preloadImage = useCallback(
    (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        // GA PAKAI crossOrigin — hasil cuma buat preview thumbnail canvas visual,
        // tidak pernah toDataURL / getImageData. Jadi canvas "tainted" ga masalah.
        // crossOrigin="anonymous" malah bikin browser strict CORS dan gagal load
        // di Capture step doang (padahal jalan di Edit step).
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = src;
      }),
    [],
  );

  const [frameOverlayImg, setFrameOverlayImg] = useState<HTMLImageElement | null>(null);
  const [frameOverlayError, setFrameOverlayError] = useState(false);
  useEffect(() => {
    let alive = true;
    setFrameOverlayImg(null);
    setFrameOverlayError(false);
    if (frameOverlayUrl) {
      preloadImage(frameOverlayUrl)
        .then((im) => { if (alive) setFrameOverlayImg(im); })
        .catch((err) => {
          console.error("[BA2W] Frame gagal load:", {
            frameId: selectedFrame?.id,
            frameName: selectedFrame?.name,
            r2ImagePath: selectedFrame?.r2_image_path,
            fullUrl: frameOverlayUrl,
          }, err);
          if (alive) {
            setFrameOverlayImg(null);
            setFrameOverlayError(true);
          }
        });
    } else {
      setFrameOverlayImg(null);
      if (alive) setFrameOverlayError(!!(selectedFrame?.r2_image_path));
    }
    return () => { alive = false; };
  }, [frameOverlayUrl, preloadImage, selectedFrame]);

  const currentSlot = selectedFrame?.slots[slotIndex];

  const slotAspect = useMemo(() => {
    if (!currentSlot?.width || !currentSlot?.height) return 3 / 4;
    return currentSlot.width / currentSlot.height;
  }, [currentSlot]);

  const isSlotLandscape = slotAspect > 1.0;

  const containerPreset = isSlotLandscape ? PRESET_LANDSCAPE : PRESET_PORTRAIT;
  const containerMaxW = isSlotLandscape ? 1024 : 1080;
  const containerMaxH = isSlotLandscape ? 768 : 1440;
  const containerAr = containerPreset.w / containerPreset.h;

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setReady(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: cameraFacing === "environment" ? "environment" : "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
    } catch (err: any) {
      console.error("camera error:", err);
      setCameraError(
        err?.message ||
          "Gagal mengakses kamera. Pastikan browser punya izin akses kamera.",
      );
    }
  }, [cameraFacing]);

  useEffect(() => {
    let mounted = true;
    if (typeof window === "undefined" || !navigator?.mediaDevices) {
      setCameraError("Browser tidak mendukung akses kamera");
      return;
    }
    startCamera().finally(() => {
      if (!mounted) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      }
    });
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  // [FIX RACE CONDITION] StrictMode double-mount / async timing bisa bikin
  // videoRef.current masih NULL saat getUserMedia resolve di startCamera.
  // Akibatnya: srcObject tidak ke-set → video PUTIH KOSONG padahal lampu kamera nyala.
  // Effect ini RE-ATTACH srcObject + play SETELAH DOM ref sudah pasti terpasang (trigger: ready).
  useEffect(() => {
    if (!ready) return;
    const v = videoRef.current;
    const s = streamRef.current;
    if (!v || !s) return;
    v.srcObject = s;
    const p = v.play();
    if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
  }, [ready]);

  const stopCamera = useCallback(() => {
    if (liveRecorderRef.current && liveRecorderRef.current.state !== "inactive") {
      try { liveRecorderRef.current.stop(); } catch {}
    }
    liveRecorderRef.current = null;
    liveChunksRef.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startLiveClipRecording = useCallback((): boolean => {
    if (typeof (window as any).MediaRecorder !== "function") return false;
    const stream = streamRef.current;
    if (!stream) return false;
    const mimeTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = mimeTypes.find((t) => (window as any).MediaRecorder.isTypeSupported(t));
    if (!mimeType) return false;
    try {
      const recorder = new (window as any).MediaRecorder(stream, { mimeType });
      liveChunksRef.current = [];
      recorder.ondataavailable = (ev: any) => {
        if (ev.data && ev.data.size > 0) liveChunksRef.current.push(ev.data);
      };
      recorder.onerror = () => {
        // ignore, fallback to still only
      };
      recorder.start(100);
      liveRecorderRef.current = recorder;
      liveStartTsRef.current = performance.now();
      return true;
    } catch {
      liveRecorderRef.current = null;
      liveChunksRef.current = [];
      return false;
    }
  }, []);

  const stopLiveClipRecording = useCallback((): Promise<{ blobUrl: string; durationMs: number } | null> => {
    return new Promise((resolve) => {
      const recorder = liveRecorderRef.current;
      const startTs = liveStartTsRef.current;
      if (!recorder || recorder.state === "inactive") {
        liveRecorderRef.current = null;
        liveChunksRef.current = [];
        resolve(null);
        return;
      }
      try {
        const durationMs = performance.now() - startTs;
        recorder.onstop = () => {
          try {
            const chunks = liveChunksRef.current;
            if (chunks.length === 0) { resolve(null); return; }
            const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
            if (blob.size < 1024) { resolve(null); return; }
            const blobUrl = URL.createObjectURL(blob);
            resolve({ blobUrl, durationMs });
          } catch {
            resolve(null);
          } finally {
            liveRecorderRef.current = null;
            liveChunksRef.current = [];
          }
        };
        recorder.stop();
      } catch {
        liveRecorderRef.current = null;
        liveChunksRef.current = [];
        resolve(null);
      }
    });
  }, []);

  const captureStillFrame = useCallback((): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const targetW = v.videoWidth;
    const targetH = v.videoHeight;
    const dataUrl = captureVideoFrame(
      v,
      targetW,
      targetH,
      FILTER_DEFS[filter].css,
      mirror,
    );
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 150);
    return dataUrl;
  }, [filter, mirror]);

  const saveCapturedPhoto = useCallback((dataUrl: string, liveClipBlobUrl: string | null, liveClipDurationMs: number | null) => {
    if (retakePhotoId) {
      pb.replacePhoto(retakePhotoId, dataUrl, FILTER_DEFS[filter].css, liveClipBlobUrl, liveClipDurationMs);
      setLastCapturedId(retakePhotoId);
      setRetakePhotoId(null);
    } else {
      pb.addPhoto(slotIndex, dataUrl, FILTER_DEFS[filter].css, liveClipBlobUrl, liveClipDurationMs);
      setLastCapturedId(`${Date.now()}`);
    }
  }, [filter, mirror, pb, retakePhotoId, slotIndex]);

  const advanceAfterCapture = useCallback(() => {
    if (retakePhotoId) {
      setPhase("review");
    } else {
      const next = slotIndex + 1;
      if (next >= slotsNeeded) {
        setPhase("review");
        setAutoCaptureRunning(false);
        autoCancelledRef.current = false;
      } else {
        if (captureMode === "auto" && autoCaptureRunning && !autoCancelledRef.current) {
          scheduleNextAuto(next);
        } else {
          setSlotIndex(next);
          setPhase("preview");
        }
      }
    }
  }, [retakePhotoId, slotIndex, slotsNeeded, captureMode, autoCaptureRunning]);

  const scheduleNextAuto = useCallback(
    (nextSlot: number) => {
      autoTimerRef.current = window.setTimeout(() => {
        autoTimerRef.current = null;
        setSlotIndex(nextSlot);
        setPhase("preview");
      }, 1500);
    },
    [],
  );

  const runCountdown = useCallback(() => {
    if (phase !== "preview" && !retakePhotoId) return;
    const dur = Math.max(1, Math.floor(countdownSeconds || 3));
    setPhase("countdown");
    setCountdown(dur);
    let remaining = dur;
    let liveStarted = false;
    const PRE_RECORD_MS = 500;
    const POST_RECORD_MS = 1200;
    const id = window.setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        setPhase("capturing");
        setCountdown(-1);
        setTimeout(async () => {
          const startedOk = liveStarted;
          const dataUrl = captureStillFrame();
          if (!dataUrl) {
            if (startedOk) await stopLiveClipRecording();
            setTimeout(advanceAfterCapture, 300);
            return;
          }
          setTimeout(async () => {
            let liveClip: { blobUrl: string; durationMs: number } | null = null;
            if (startedOk) {
              liveClip = await stopLiveClipRecording();
            }
            saveCapturedPhoto(
              dataUrl,
              liveClip?.blobUrl ?? null,
              liveClip?.durationMs ?? null,
            );
            setTimeout(advanceAfterCapture, 50);
          }, POST_RECORD_MS);
        }, 50);
      } else if (remaining === 1) {
        const delay = Math.max(0, 1000 - PRE_RECORD_MS);
        setTimeout(() => {
          startLiveClipRecording();
          liveStarted = true;
        }, delay);
      }
    }, 1000);
  }, [phase, retakePhotoId, countdownSeconds, captureStillFrame, stopLiveClipRecording, saveCapturedPhoto, advanceAfterCapture, startLiveClipRecording]);

  const startAutoCapture = useCallback(() => {
    autoCancelledRef.current = false;
    setAutoCaptureRunning(true);
    pb.setCaptureMode("auto");
    if (phase === "preview") {
      runCountdown();
    }
  }, [pb, phase, runCountdown]);

  const stopAutoCapture = useCallback(() => {
    autoCancelledRef.current = true;
    setAutoCaptureRunning(false);
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChosen = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (filter !== "none") ctx.filter = FILTER_DEFS[filter].css;
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        URL.revokeObjectURL(objectUrl);
        setCaptureFlash(true);
        setTimeout(() => setCaptureFlash(false), 150);
        if (retakePhotoId) {
          const oldPhoto = pb.photos.find((p) => p.id === retakePhotoId);
          if (oldPhoto && oldPhoto.dataUrl && oldPhoto.dataUrl.startsWith("blob:")) {
            URL.revokeObjectURL(oldPhoto.dataUrl);
          }
          pb.replacePhoto(retakePhotoId, dataUrl, FILTER_DEFS[filter].css, null, null);
          setLastCapturedId(retakePhotoId);
          setRetakePhotoId(null);
          setPhase("review");
        } else {
          const exist = pb.photos.find((p) => p.slotOrder === slotIndex);
          if (exist && exist.dataUrl && exist.dataUrl.startsWith("blob:")) {
            URL.revokeObjectURL(exist.dataUrl);
          }
          pb.addPhoto(slotIndex, dataUrl, FILTER_DEFS[filter].css, null, null);
          setLastCapturedId(`${Date.now()}`);
          const next = slotIndex + 1;
          if (next >= slotsNeeded) {
            setPhase("review");
          } else {
            setSlotIndex(next);
            setPhase("preview");
          }
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    },
    [filter, pb, retakePhotoId, slotIndex, slotsNeeded],
  );

  const retakeSpecific = useCallback(
    (photoId: string, order: number) => {
      setRetakePhotoId(photoId);
      setSlotIndex(order);
      setPhase("preview");
    },
    [],
  );

  const removePhoto = useCallback(
    (photoId: string) => {
      pb.removePhoto(photoId);
    },
    [pb],
  );

  const allCaptured =
    pb.photos.filter((p) => p.slotOrder < slotsNeeded).length >= slotsNeeded;

  useEffect(() => {
    if (
      captureMode === "auto" &&
      autoCaptureRunning &&
      !autoCancelledRef.current &&
      phase === "preview" &&
      !allCaptured &&
      !retakePhotoId
    ) {
      const id = window.setTimeout(() => runCountdown(), 120);
      return () => clearTimeout(id);
    }
  }, [captureMode, autoCaptureRunning, phase, allCaptured, retakePhotoId, runCountdown]);

  useEffect(() => {
    return () => {
      stopAutoCapture();
    };
  }, [stopAutoCapture]);

  const goNext = () => {
    stopCamera();
    stopAutoCapture();
    onNext();
  };

  if (!selectedFrame) return null;

  return (
    <section className="min-h-dvh w-full bg-background flex flex-col safe-top safe-bottom relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-40 h-40 md:w-56 md:h-56 opacity-20">
          <HalftoneDots color="var(--color-terracotta)" opacity={0.25} spacing={12} dotSize={3} />
        </div>
        <div className="absolute bottom-0 right-0 w-48 h-48 md:w-64 md:h-64 opacity-18">
          <HalftoneDots color="var(--color-teal)" opacity={0.2} spacing={14} dotSize={3} />
        </div>
      </div>

      <header className="flex items-center justify-between px-4 py-3 md:px-6 max-w-md md:max-w-xl lg:max-w-2xl mx-auto w-full relative z-10">
        <button
          onClick={() => {
            stopCamera();
            onBack();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-foreground hover:bg-card border-[3px] border-transparent hover:border-[#3D2914] transition focus-ring retro-btn-ghost !py-1.5 !px-2.5 !text-xs !rounded-2xl !shadow-retro-sm"
          aria-label="Kembali ke pilih frame"
        >
          <ArrowLeft size={18} />
          <span className="font-heading text-xs hidden sm:inline tracking-wide text-uppercase-badge">
            BACK
          </span>
        </button>
        <div className="flex flex-col items-center relative">
          <div className="heading-bubble-pink text-sm md:text-base">
            Foto <span className="heading-bubble">{Math.min(slotIndex + 1, slotsNeeded)}</span> / {slotsNeeded}
          </div>
          <div className="text-[11px] text-muted-foreground font-body mt-0.5">
            <span className="font-accent-hand text-[14px]">{selectedFrame.name ?? "Frame"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="hidden md:block absolute -top-8 -right-4 z-20">
            <BadgeStamp bg="var(--color-mustard)" textColor="var(--color-ink)" rotate={9} size="sm">
              SMILE!
            </BadgeStamp>
          </div>
          <button
            onClick={() => {
              pb.setCameraFacing(
                cameraFacing === "user" ? "environment" : "user",
              );
            }}
            className="p-2.5 rounded-xl bg-card border-[3px] border-[#3D2914] hover:border-primary-600 transition focus-ring shadow-retro-sm"
            aria-label="Switch kamera front/back"
            title="Switch kamera"
          >
            <ArrowsLeftRight size={18} className="text-foreground" />
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 md:px-6 flex flex-col items-center relative z-10">
        <div className="w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto">
          <ProgressStripes
            count={slotsNeeded}
            capturedOrder={pb.photos
              .filter((p) => p.slotOrder < slotsNeeded)
              .map((p) => p.slotOrder)}
            currentOrder={slotIndex}
          />
        </div>

        <div className="mt-3 w-full max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
          <div
            className={`relative w-full mx-auto rounded-3xl overflow-hidden shadow-retro-lg border-[4px] border-[#3D2914]`}
            style={{
              aspectRatio: `${containerAr}`,
              maxWidth: `${containerMaxW}px`,
              maxHeight: `${containerMaxH}px`,
              width: '100%',
              height: 'auto',
              backgroundColor: recapBackground,
            }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className={`absolute inset-0 w-full h-full object-cover ${mirror ? "scale-x-[-1]" : ""}`}
              style={{ filter: FILTER_DEFS[filter].css }}
            />
            {/* LIVE FRAME OVERLAY (transparan) + highlight slot aktif, z-index tengah agar bawah countdown tapi di atas video */}
            {frameOverlayUrl && currentSlot && !retakePhotoId && (
              <LiveFrameOverlay
                frameOverlayUrl={frameOverlayUrl}
                frameWidth={selectedFrame?.canvas_width ?? 1200}
                frameHeight={selectedFrame?.canvas_height ?? 1800}
                slots={selectedFrame?.slots ?? []}
                activeSlotOrder={currentSlot?.slot_order ?? slotIndex}
                recapBackground={recapBackground}
                selectedFrame={selectedFrame}
              />
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#2A1A0D]/90 p-6 text-center z-30">
                <div>
                  <div className="text-4xl mb-3" role="img" aria-label="error">
                    📷❌
                  </div>
                  <p className="text-white/95 text-sm font-body mb-4">
                    {cameraError}
                  </p>
                  <button
                    onClick={startCamera}
                    className="retro-btn-primary px-5 py-2.5 text-sm focus-ring"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            )}
            {captureFlash && (
              <div className="absolute inset-0 bg-white pointer-events-none z-20" />
            )}
            {phase === "countdown" && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="relative">
                  <div className="absolute -inset-10 bg-white/15 rounded-full blur-2xl" />
                  <span className="relative font-heading text-heading-retro font-black text-[5.5rem] md:text-[8rem] text-white drop-shadow-[4px_4px_0_rgba(61,41,20,0.8)] leading-none">
                    {countdown}
                  </span>
                </div>
              </div>
            )}
            {phase === "capturing" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="w-24 h-24 rounded-full border-[6px] border-white animate-ping opacity-80" />
              </div>
            )}
            {isSlotLandscape && !cameraError && (
              <div className="absolute left-0 right-0 top-3 z-20 text-center pointer-events-none">
                <span className="inline-block px-3.5 py-1 rounded-full bg-secondary-500/95 text-[#3D2914] text-[11px] font-bold border-[3px] border-[#3D2914] shadow-retro-sm tracking-wide uppercase retro-badge-mustard !py-1 !px-3">
                  💡 Putar HP ke landscape buat hasil terbaik
                </span>
              </div>
            )}

            {/* Floating Capture Button — posisi beda per orientasi */}
            {!isSlotLandscape ? (
              /* PORTRAIT: center-bottom dengan margin bottom ~20px */
              <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-3 z-20 pointer-events-none pb-2">
                {autoCaptureRunning && phase !== "review" && !retakePhotoId && (
                  <button
                    onClick={stopAutoCapture}
                    className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-destructive/95 text-white font-heading text-heading-retro text-[11px] tracking-widest border-[3px] border-white/30 hover:bg-destructive transition focus-ring shadow-retro-sm"
                    aria-label="Stop auto capture"
                  >
                    <Stop size={16} weight="fill" />
                    STOP AUTO
                  </button>
                )}
                {phase === "preview" && !autoCaptureRunning && (
                  <button
                    onClick={captureMode === "auto" ? startAutoCapture : runCountdown}
                    disabled={!!cameraError || !ready}
                    className="pointer-events-auto group relative w-[68px] h-[68px] md:w-20 md:h-20 rounded-full bg-white/12 backdrop-blur border-[4px] border-white/85 hover:border-white transition focus-ring disabled:opacity-45 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                    aria-label={
                      retakePhotoId
                        ? "Retake foto"
                        : captureMode === "auto"
                          ? "Mulai auto capture"
                          : `Jepret foto ${slotIndex + 1}`
                    }
                  >
                    <span className="absolute inset-1.5 rounded-full bg-white group-active:scale-95 transition-transform shadow-inner" />
                    {captureMode === "auto" ? (
                      <Play
                        size={24}
                        weight="fill"
                        className="absolute inset-0 m-auto text-secondary-700 relative z-10"
                      />
                    ) : (
                      <Camera
                        size={24}
                        weight="fill"
                        className="absolute inset-0 m-auto text-primary-700 relative z-10"
                      />
                    )}
                  </button>
                )}
                {phase === "preview" && captureMode === "auto" && !autoCaptureRunning && !retakePhotoId && (
                  <div className="pointer-events-none px-3 py-1 rounded-full bg-secondary-500/95 text-[#3D2914] text-[10px] font-bold border-[2px] border-[#3D2914] tracking-widest uppercase shadow-retro-sm">
                    Tap ▶ Mulai Auto
                  </div>
                )}
                {phase === "countdown" && (
                  <div className="pointer-events-auto px-5 py-2 rounded-2xl bg-[#3D2914]/85 text-white/95 font-heading text-heading-retro text-[11px] tracking-widest border-[3px] border-white/30 shadow-retro-sm">
                    Get ready...
                  </div>
                )}
                {phase === "capturing" && (
                  <div className="pointer-events-auto px-5 py-2 rounded-2xl bg-primary-600/95 text-white font-heading text-heading-retro text-[11px] tracking-widest border-[3px] border-white/30 shadow-retro-sm">
                    ✨ CAPTURE...
                  </div>
                )}
                {phase === "review" && (
                  <button
                    onClick={runCountdown}
                    disabled={!!cameraError || !ready}
                    className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#3D2914]/85 text-white font-heading text-heading-retro text-[11px] tracking-widest border-[3px] border-white/30 hover:bg-[#3D2914] transition focus-ring disabled:opacity-45 shadow-retro-sm"
                  >
                    <Camera size={16} weight="fill" />
                    Ambil Foto Lain
                  </button>
                )}
              </div>
            ) : (
              /* LANDSCAPE: bottom-right dengan margin kanan & bawah wajar */
              <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex flex-col items-end gap-2.5 z-20 pointer-events-none">
                {autoCaptureRunning && phase !== "review" && !retakePhotoId && (
                  <button
                    onClick={stopAutoCapture}
                    className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-destructive/95 text-white font-heading text-heading-retro text-[10px] tracking-widest border-[3px] border-white/30 hover:bg-destructive transition focus-ring shadow-retro-sm"
                    aria-label="Stop auto capture"
                  >
                    <Stop size={14} weight="fill" />
                    STOP
                  </button>
                )}
                {phase === "preview" && !autoCaptureRunning && (
                  <button
                    onClick={captureMode === "auto" ? startAutoCapture : runCountdown}
                    disabled={!!cameraError || !ready}
                    className="pointer-events-auto group relative w-[60px] h-[60px] md:w-[68px] md:h-[68px] rounded-full bg-white/12 backdrop-blur border-[4px] border-white/85 hover:border-white transition focus-ring disabled:opacity-45 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                    aria-label={
                      retakePhotoId
                        ? "Retake foto"
                        : captureMode === "auto"
                          ? "Mulai auto capture"
                          : `Jepret foto ${slotIndex + 1}`
                    }
                  >
                    <span className="absolute inset-1.5 rounded-full bg-white group-active:scale-95 transition-transform shadow-inner" />
                    {captureMode === "auto" ? (
                      <Play
                        size={20}
                        weight="fill"
                        className="absolute inset-0 m-auto text-secondary-700 relative z-10"
                      />
                    ) : (
                      <Camera
                        size={22}
                        weight="fill"
                        className="absolute inset-0 m-auto text-primary-700 relative z-10"
                      />
                    )}
                  </button>
                )}
                {phase === "countdown" && (
                  <div className="pointer-events-auto px-4 py-1.5 rounded-2xl bg-[#3D2914]/85 text-white/95 font-heading text-heading-retro text-[10px] tracking-widest border-[3px] border-white/30 shadow-retro-sm">
                    Get ready...
                  </div>
                )}
                {phase === "capturing" && (
                  <div className="pointer-events-auto px-4 py-1.5 rounded-2xl bg-primary-600/95 text-white font-heading text-heading-retro text-[10px] tracking-widest border-[3px] border-white/30 shadow-retro-sm">
                    ✨ CAPTURE...
                  </div>
                )}
                {phase === "review" && (
                  <button
                    onClick={runCountdown}
                    disabled={!!cameraError || !ready}
                    className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#3D2914]/85 text-white font-heading text-heading-retro text-[10px] tracking-widest border-[3px] border-white/30 hover:bg-[#3D2914] transition focus-ring disabled:opacity-45 shadow-retro-sm"
                  >
                    <Camera size={14} weight="fill" />
                    Foto Lain
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <FilterRow
              selected={filter}
              onChange={(k) => pb.setFilter(k)}
              videoCss={FILTER_DEFS[filter].css}
            />
          </div>

          <div className="mt-4">
            <CapturedPreviewStrip
              photos={pb.photos}
              count={slotsNeeded}
              current={slotIndex}
              retakingId={retakePhotoId || undefined}
              lastId={lastCapturedId || undefined}
              frameOverlayImg={frameOverlayImg}
              frameWidth={selectedFrame.canvas_width ?? 1200}
              frameHeight={selectedFrame.canvas_height ?? 1800}
              slots={selectedFrame.slots}
              recapBackground={recapBackground}
              frameError={frameOverlayError}
              onRetake={retakeSpecific}
              onRemove={removePhoto}
            />
          </div>
        </div>
      </div>

      <footer className="px-4 md:px-6 py-4 border-t-[3px] border-border/60 bg-card/50 backdrop-blur mt-4">
        <div className="w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto flex flex-col gap-3">
          {/* Row 1: Mode toggle + Countdown + Upload */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {/* Capture Mode Toggle */}
            <div className="flex items-center justify-center gap-1 rounded-2xl retro-card p-1 shadow-retro-sm">
              {(["manual", "auto"] as const).map((m) => {
                const isSel = captureMode === m;
                return (
                  <button
                    key={m}
                    onClick={() => {
                      if (autoCaptureRunning) return;
                      pb.setCaptureMode(m);
                    }}
                    disabled={autoCaptureRunning}
                    className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[10px] md:text-[11px] font-heading text-heading-retro tracking-wider uppercase transition focus-ring disabled:opacity-50 ${
                      isSel
                        ? "bg-primary-600 text-white shadow-retro-sm border-[2px] border-[#3D2914]"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                    aria-pressed={isSel}
                    title={m === "manual" ? "Mode manual: klik capture per slot" : "Mode auto: otomatis countdown semua slot"}
                  >
                    {m === "manual" ? <Camera size={11} /> : <Play size={11} weight="fill" />}
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Countdown Preset Selector */}
            <div className="flex items-center justify-center gap-1 rounded-2xl retro-card p-1 shadow-retro-sm">
              <span className="flex-shrink-0 pl-1.5 pr-0.5">
                <Timer size={12} className="text-primary-600" />
              </span>
              {[3, 5, 10].map((n) => {
                const isSel = countdownSeconds === n;
                return (
                  <button
                    key={n}
                    onClick={() => pb.setCountdownSeconds(n)}
                    className={`flex-1 px-1.5 py-1.5 rounded-xl text-[10px] md:text-[11px] font-heading text-heading-retro tracking-wider transition focus-ring ${
                      isSel
                        ? "bg-secondary-500 text-[#3D2914] shadow-retro-sm border-[2px] border-[#3D2914]"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                    aria-pressed={isSel}
                    title={`Countdown ${n} detik`}
                  >
                    {n}s
                  </button>
                );
              })}
            </div>

            {/* Upload Foto */}
            <button
              onClick={triggerUpload}
              disabled={!!cameraError || phase === "countdown" || phase === "capturing"}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-2xl retro-card hover:scale-[1.02] active:scale-95 transition focus-ring disabled:opacity-40 disabled:cursor-not-allowed shadow-retro-sm text-[10px] md:text-[11px] font-heading text-heading-retro tracking-wider uppercase"
              title="Upload foto dari galeri"
            >
              <Upload size={14} weight="fill" className="text-primary-600" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>

          {/* Row 2: Mirror + Lanjut Ke Editor */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => pb.setMirror(!mirror)}
              className="flex-shrink-0 p-3 rounded-2xl retro-card hover:scale-[1.03] active:scale-95 transition focus-ring !p-2.5 !rounded-2xl"
              aria-label={mirror ? "Matikan mirror" : "Nyalakan mirror"}
              title="Mirror preview"
            >
              <ArrowCounterClockwise
                size={20}
                className={`${mirror ? "text-primary-600" : "text-muted-foreground"}`}
              />
            </button>
            <button
              onClick={goNext}
              disabled={!allCaptured}
              className="flex-1 max-w-xs retro-btn-mustard px-5 py-3 text-[11px] md:text-xs disabled:opacity-40 disabled:cursor-not-allowed focus-ring tracking-widest"
            >
              <span className="flex items-center justify-center gap-1.5">
                {allCaptured ? "LANJUT KE EDITOR" : `BUTUH ${slotsNeeded - pb.photos.filter(p => p.slotOrder < slotsNeeded).length} FOTO LAGI`}
                {allCaptured && <CheckCircle size={16} weight="fill" />}
                {allCaptured && <ArrowRight size={16} />}
              </span>
            </button>
          </div>
        </div>
        {retakePhotoId && (
          <div className="w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto mt-3">
            <button
              onClick={() => {
                setRetakePhotoId(null);
                setPhase("review");
                const maxOrder = Math.max(
                  ...pb.photos.map((p) => p.slotOrder),
                  -1,
                );
                const next = Math.min(maxOrder + 1, slotsNeeded - 1);
                setSlotIndex(next);
              }}
              className="w-full text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4 py-1 font-body"
            >
              ← Batalkan retake, kembali ke {allCaptured ? "review" : "capture"}
            </button>
          </div>
        )}
        {/* Hidden file input untuk upload foto dari galeri */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChosen}
          className="hidden"
        />
      </footer>
    </section>
  );
}

function FilterRow({
  selected,
  onChange,
  videoCss,
}: {
  selected: FilterKey;
  onChange: (k: FilterKey) => void;
  videoCss: string;
}) {
  const keys = Object.keys(FILTER_DEFS) as FilterKey[];
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-heading text-heading-retro text-muted-foreground pr-1 tracking-wide uppercase">
        <Sparkle size={14} className="text-primary-600" /> Filter
      </span>
      {keys.map((k) => {
        const isSel = k === selected;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-heading text-heading-retro tracking-wide transition focus-ring ${
              isSel
                ? "bg-primary-600 text-white border-[3px] border-[#3D2914] shadow-retro-sm"
                : "bg-card text-foreground border-[3px] border-[#3D2914] hover:border-primary-600 shadow-retro-sm"
            }`}
            style={isSel ? {} : { filter: FILTER_DEFS[k].css }}
            aria-pressed={isSel}
          >
            {FILTER_DEFS[k].label}
          </button>
        );
      })}
      <span className="sr-only" aria-live="polite">
        Filter aktif: {FILTER_DEFS[selected].label}, CSS: {videoCss}
      </span>
    </div>
  );
}

function ProgressStripes({
  count,
  capturedOrder,
  currentOrder,
}: {
  count: number;
  capturedOrder: number[];
  currentOrder: number;
}) {
  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={capturedOrder.length}
    >
      {Array.from({ length: count }).map((_, i) => {
        const captured = capturedOrder.includes(i);
        const current = i === currentOrder;
        return (
          <div
            key={i}
            className={`flex-1 h-2.5 rounded-full transition-colors border-2 border-[#3D2914] ${
              captured
                ? "bg-primary-500"
                : current
                  ? "bg-primary-200 animate-pulse"
                  : "bg-muted"
            }`}
          />
        );
      })}
    </div>
  );
}

function CapturedPreviewStrip({
  photos,
  count,
  current,
  retakingId,
  lastId,
  frameOverlayImg,
  frameWidth,
  frameHeight,
  slots,
  recapBackground,
  frameError,
  onRetake,
  onRemove,
}: {
  photos: { id: string; slotOrder: number; dataUrl: string; filterCss?: string }[];
  count: number;
  current: number;
  retakingId?: string;
  lastId?: string;
  frameOverlayImg: HTMLImageElement | null;
  frameWidth: number;
  frameHeight: number;
  slots: { slot_order: number; x: number; y: number; width: number; height: number; rotation?: number | null }[];
  recapBackground: string;
  frameError: boolean;
  onRetake: (id: string, order: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 h-64 items-stretch overflow-x-auto pb-1">
      {Array.from({ length: count }).map((_, i) => {
        const photo = photos.find((p) => p.slotOrder === i);
        const isCurrent = i === current && !photo;
        const isRetaking = photo?.id === retakingId;
        const isLast = photo?.id === lastId;
        return (
          <div
            key={i}
            className={`relative flex-shrink-0 rounded-2xl overflow-hidden border-[3px] border-[#3D2914] transition ${
              photo
                ? "shadow-retro-sm bg-card"
                : isCurrent
                  ? "border-dashed border-primary-500 bg-primary-50"
                  : "border-dashed border-[#BE7F3E] bg-muted/50"
            } ${isLast ? "ring-4 ring-primary-500/50" : ""} ${
              isRetaking ? "ring-4 ring-accent-500" : ""
            }`}
            style={{ aspectRatio: frameWidth && frameHeight ? `${frameWidth} / ${frameHeight}` : "1 / 1" }}
          >
            {photo ? (
              <div className="absolute inset-0 group/thumb">
                <FrameOverlayThumb
                  photoDataUrl={photo.dataUrl}
                  photoFilter={photo.filterCss || undefined}
                  slot={slots.find((s) => s.slot_order === i)}
                  frameOverlayImg={frameOverlayImg}
                  frameWidth={frameWidth}
                  frameHeight={frameHeight}
                  recapBackground={recapBackground}
                  frameError={frameError}
                />
                <div className="absolute top-1 right-1 flex gap-1 z-10">
                  <button
                    onClick={() => onRemove(photo.id)}
                    className="p-1 rounded-full bg-destructive text-white focus-ring shadow-retro-sm border-2 border-[#3D2914] hover:scale-110 active:scale-95 transition"
                    title="Hapus foto ini"
                    aria-label={`Hapus foto slot ${i + 1}`}
                  >
                    <X size={10} weight="bold" />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-1 flex gap-1 bg-gradient-to-t from-[#3D2914]/80 to-transparent opacity-0 md:group-hover/thumb:opacity-100 md:group-focus-within/thumb:opacity-100 md:transition-opacity !opacity-100 md:!opacity-0 md:hover:!opacity-100 md:focus-within:!opacity-100">
                  <button
                    onClick={() => onRetake(photo.id, i)}
                    className="flex-1 px-1.5 py-1 rounded-lg bg-white/95 text-[#3D2914] text-[9px] md:text-[10px] font-heading text-heading-retro tracking-wide focus-ring shadow-retro-sm"
                    title="Retake foto ini"
                  >
                    <span className="flex items-center justify-center gap-0.5">
                      <ArrowCounterClockwise size={10} /> RETAKE
                    </span>
                  </button>
                  <button
                    onClick={() => onRemove(photo.id)}
                    className="md:flex p-1.5 rounded-lg bg-destructive text-white focus-ring shadow-retro-sm border-2 border-[#3D2914] hidden"
                    title="Hapus foto ini"
                    aria-label={`Hapus foto slot ${i + 1}`}
                  >
                    <X size={11} weight="bold" />
                  </button>
                </div>
                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-heading font-bold flex items-center justify-center shadow-retro-sm border-2 border-[#3D2914]">
                  {i + 1}
                </span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[10px] font-heading text-heading-retro text-muted-foreground tracking-wide uppercase">
                <span
                  className="text-2xl mb-0.5 opacity-50"
                  aria-hidden="true"
                >
                  📸
                </span>
                Slot {i + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FrameOverlayThumb({
  photoDataUrl,
  photoFilter,
  slot,
  frameOverlayImg,
  frameWidth,
  frameHeight,
  recapBackground,
  frameError,
}: {
  photoDataUrl: string;
  photoFilter?: string;
  slot?: { x: number; y: number; width: number; height: number; rotation?: number | null };
  frameOverlayImg: HTMLImageElement | null;
  frameWidth: number;
  frameHeight: number;
  recapBackground: string;
  frameError: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    let alive = true;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = Math.max(1, w * 2);
    canvas.height = Math.max(1, h * 2);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fw = frameWidth || 1200;
    const fh = frameHeight || 1800;
    const scale = Math.min(canvas.width / fw, canvas.height / fh);
    const ox = (canvas.width - fw * scale) / 2;
    const oy = (canvas.height - fh * scale) / 2;

    const draw = (photoImg: HTMLImageElement | null) => {
      if (!alive || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 1. Background area (recap)
      ctx.fillStyle = recapBackground || "#FFF8E7";
      ctx.fillRect(ox, oy, fw * scale, fh * scale);
      // 2. (optional subtle halftone)
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#3D2914";
      const step = 4;
      for (let yy = oy; yy < oy + fh * scale; yy += step) {
        for (let xx = ox; xx < ox + fw * scale; xx += step) {
          ctx.fillRect(xx, yy, 1, 1);
        }
      }
      ctx.restore();
      // 3. Draw photo in slot position (sync if any)
      if (slot && photoImg) {
        const slotPxX = (slot.x / 100) * fw;
        const slotPxY = (slot.y / 100) * fh;
        const slotPxW = (slot.width / 100) * fw;
        const slotPxH = (slot.height / 100) * fh;
        ctx.save();
        const drawX = ox + slotPxX * scale;
        const drawY = oy + slotPxY * scale;
        const drawW = slotPxW * scale;
        const drawH = slotPxH * scale;
        if (slot.rotation) {
          const cx = drawX + drawW / 2;
          const cy = drawY + drawH / 2;
          ctx.translate(cx, cy);
          ctx.rotate(((slot.rotation || 0) * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }
        const imgAr = photoImg.naturalWidth / photoImg.naturalHeight;
        const slotAr = slotPxW / slotPxH;
        let sx = 0,
          sy = 0,
          sw = photoImg.naturalWidth,
          sh = photoImg.naturalHeight;
        if (imgAr > slotAr) {
          sw = photoImg.naturalHeight * slotAr;
          sx = (photoImg.naturalWidth - sw) / 2;
        } else {
          sh = photoImg.naturalWidth / slotAr;
          sy = (photoImg.naturalHeight - sh) / 2;
        }
        if (photoFilter) (ctx as any).filter = photoFilter;
        else (ctx as any).filter = "none";
        ctx.drawImage(photoImg, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
        (ctx as any).filter = "none";
        ctx.restore();
      }
      // 4. FRAME PNG OVERLAY (selalu draw sync)
      if (frameOverlayImg) {
        try {
          ctx.drawImage(frameOverlayImg, ox, oy, fw * scale, fh * scale);
        } catch {}
      }
    };

    draw(null);
    const pimg = new Image();
    // photoDataUrl = data URL lokal (hasil captureStillFrame), crossOrigin tidak ada efek
    pimg.onload = () => {
      if (alive) draw(pimg);
    };
    pimg.onerror = () => {
      if (alive) draw(null);
    };
    pimg.src = photoDataUrl;

    return () => {
      alive = false;
    };
  }, [photoDataUrl, slot, frameOverlayImg, frameWidth, frameHeight, photoFilter, recapBackground]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {frameError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 border-[2px] border-dashed border-destructive/70 bg-destructive/10 backdrop-blur-[0.5px]">
          <ImageIcon size={20} weight="duotone" className="text-destructive/80" aria-hidden="true" />
          <span className="text-[8px] md:text-[9px] font-heading text-heading-retro text-destructive tracking-wide uppercase text-center leading-tight px-1">
            Frame gagal
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   LiveFrameOverlay — overlay FRAME + BG transparent DI ATAS VIDEO
   (camera live preview). User lihat batas slot aktif sebelum
   motret, jadi kayak preview posisi langsung.
   ============================================================ */
function LiveFrameOverlay({
  frameOverlayUrl,
  frameWidth,
  frameHeight,
  slots,
  activeSlotOrder,
  recapBackground,
  selectedFrame,
}: {
  frameOverlayUrl: string;
  frameWidth: number;
  frameHeight: number;
  slots: { slot_order: number; x: number; y: number; width: number; height: number; rotation?: number | null }[];
  activeSlotOrder: number;
  recapBackground: string;
  selectedFrame: { id?: string | number; name?: string | null; r2_image_path?: string | null } | null;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let alive = true;
    setImgLoaded(false);
    setImgError(false);
  }, [frameOverlayUrl]);

  const ar = frameWidth && frameHeight ? frameWidth / frameHeight : 2 / 3;
  const active = slots.find((s) => s.slot_order === activeSlotOrder);

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none z-[12]"
      aria-hidden="true"
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          aspectRatio: `${ar}`,
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="relative"
          style={{
            aspectRatio: `${ar}`,
            width: "100%",
            height: "100%",
            backgroundColor:
              recapBackground && imgLoaded ? `${recapBackground}33` : "transparent",
            boxShadow: imgLoaded ? "inset 0 0 0 1px rgba(61, 41, 20, 0.15)" : "none",
          }}
        >
          {imgError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 border-[2.5px] border-dashed border-destructive/80 rounded-lg bg-destructive/5 backdrop-blur-[1px]">
              <ImageIcon size={28} weight="duotone" className="text-destructive/80" aria-hidden="true" />
              <span className="text-[10px] md:text-[11px] font-heading text-heading-retro text-destructive tracking-wide uppercase">
                Frame gagal dimuat
              </span>
            </div>
          ) : (
            <img
              key={frameOverlayUrl}
              src={frameOverlayUrl}
              alt=""
              aria-hidden="true"
              draggable={false}
              className={`absolute inset-0 w-full h-full object-fill select-none transition-opacity duration-200 ${
                imgLoaded ? "opacity-[0.78]" : "opacity-0"
              }`}
              style={{ mixBlendMode: imgLoaded ? "multiply" : "normal" }}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                console.error("[BA2W] Frame gagal load:", {
                  frameId: selectedFrame?.id,
                  frameName: selectedFrame?.name,
                  r2ImagePath: selectedFrame?.r2_image_path,
                  fullUrl: frameOverlayUrl,
                }, e);
                const t = e.currentTarget as HTMLImageElement;
                t.style.opacity = "0.9";
                t.style.mixBlendMode = "normal";
                setImgError(true);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
