"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  CapturedPhoto,
  CameraFacing,
  CaptureMode,
  FilterKey,
  PhotoTransform,
  PlacedSticker,
  SessionState,
  Step,
  StickerRow,
} from "@/types/photobooth";
import { STEP_ORDER } from "@/types/photobooth";
import type { FrameRow, FrameSlotRow } from "@/types/database";

type FullFrame = FrameRow & { slots: FrameSlotRow[] };

interface PhotoboothContextValue extends SessionState {
  setStep: (step: Step) => void;
  nextStep: () => void;
  prevStep: () => void;
  setCameraFacing: (f: CameraFacing) => void;
  setMirror: (m: boolean) => void;
  setFilter: (f: FilterKey) => void;
  setSelectedFrame: (frame: FullFrame | null) => void;
  setStickers: (s: StickerRow[]) => void;
  setCaptureMode: (m: CaptureMode) => void;
  setCountdownSeconds: (n: number) => void;
  setRecapBackground: (c: string) => void;
  addPhoto: (slotOrder: number, dataUrl: string, filterCss: string, liveClipBlobUrl?: string | null, liveClipDurationMs?: number | null) => void;
  replacePhoto: (photoId: string, dataUrl: string, filterCss: string, liveClipBlobUrl?: string | null, liveClipDurationMs?: number | null) => void;
  removePhoto: (photoId: string) => void;
  clearPhotos: () => void;
  setPhotoTransform: (
    photoId: string,
    t: Partial<Pick<PhotoTransform, "scale" | "offsetX" | "offsetY" | "x" | "y" | "width" | "height" | "rotation">>,
  ) => void;
  addPlacedSticker: (s: Omit<PlacedSticker, "id">) => void;
  updatePlacedSticker: (id: string, patch: Partial<PlacedSticker>) => void;
  removePlacedSticker: (id: string) => void;
  resetAll: () => void;
}

const PhotoboothContext = createContext<PhotoboothContextValue | null>(null);

const EMPTY_STATE: SessionState = {
  step: "intro",
  photos: [],
  cameraFacing: "user",
  mirror: true,
  filter: "none",
  selectedFrame: null,
  photoTransforms: [],
  placedStickers: [],
  stickers: [],
  captureMode: "manual",
  countdownSeconds: 3,
  recapBackground: "#FFF8E7",
};

export function PhotoboothProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(EMPTY_STATE);

  const setStep = useCallback((step: Step) => {
    setState((s) => ({ ...s, step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((s) => {
      const idx = STEP_ORDER.indexOf(s.step);
      if (idx < 0 || idx >= STEP_ORDER.length - 1) return s;
      return { ...s, step: STEP_ORDER[idx + 1] };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((s) => {
      const idx = STEP_ORDER.indexOf(s.step);
      if (idx <= 0) return s;
      return { ...s, step: STEP_ORDER[idx - 1] };
    });
  }, []);

  const setMirror = useCallback((m: boolean) => {
    setState((s) => ({ ...s, mirror: m }));
  }, []);

  const setCameraFacing = useCallback((f: CameraFacing) => {
    setState((s) => ({ ...s, cameraFacing: f }));
  }, []);

  const setFilter = useCallback((f: FilterKey) => {
    setState((s) => ({ ...s, filter: f }));
  }, []);

  const setSelectedFrame = useCallback((frame: FullFrame | null) => {
    setState((s) => ({
      ...s,
      selectedFrame: frame,
      photoTransforms: frame
        ? s.photos.map((p) => ({
            photoId: p.id,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rotation: 0,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
          }))
        : [],
    }));
  }, []);

  const setStickers = useCallback((stickers: StickerRow[]) => {
    setState((s) => ({ ...s, stickers }));
  }, []);

  const setCaptureMode = useCallback((captureMode: CaptureMode) => {
    setState((s) => ({ ...s, captureMode }));
  }, []);

  const setCountdownSeconds = useCallback((countdownSeconds: number) => {
    setState((s) => ({ ...s, countdownSeconds }));
  }, []);

  const setRecapBackground = useCallback((recapBackground: string) => {
    setState((s) => ({ ...s, recapBackground }));
  }, []);

  const addPhoto = useCallback(
    (slotOrder: number, dataUrl: string, filterCss: string, liveClipBlobUrl?: string | null, liveClipDurationMs?: number | null) => {
      const id = uuidv4();
      const photo: CapturedPhoto = {
        id,
        slotOrder,
        dataUrl,
        filterCss,
        takenAt: Date.now(),
        liveClipBlobUrl: liveClipBlobUrl ?? null,
        liveClipDurationMs: liveClipDurationMs ?? null,
      };
      setState((s) => {
        const existing = s.photos.find((p) => p.slotOrder === slotOrder);
        if (existing?.liveClipBlobUrl) {
          URL.revokeObjectURL(existing.liveClipBlobUrl);
        }
        return {
          ...s,
          photos: [...s.photos.filter((p) => p.slotOrder !== slotOrder), photo],
        };
      });
    },
    [],
  );

  const replacePhoto = useCallback(
    (photoId: string, dataUrl: string, filterCss: string, liveClipBlobUrl?: string | null, liveClipDurationMs?: number | null) => {
      setState((s) => ({
        ...s,
        photos: s.photos.map((p) => {
          if (p.id === photoId) {
            if (p.liveClipBlobUrl && p.liveClipBlobUrl !== liveClipBlobUrl) {
              URL.revokeObjectURL(p.liveClipBlobUrl);
            }
            return {
              ...p,
              dataUrl,
              filterCss,
              takenAt: Date.now(),
              liveClipBlobUrl: liveClipBlobUrl !== undefined ? liveClipBlobUrl : p.liveClipBlobUrl,
              liveClipDurationMs: liveClipDurationMs !== undefined ? liveClipDurationMs : p.liveClipDurationMs,
            };
          }
          return p;
        }),
      }));
    },
    [],
  );

  const removePhoto = useCallback((photoId: string) => {
    setState((s) => {
      const target = s.photos.find((p) => p.id === photoId);
      if (target?.liveClipBlobUrl) {
        URL.revokeObjectURL(target.liveClipBlobUrl);
      }
      return {
        ...s,
        photos: s.photos.filter((p) => p.id !== photoId),
        photoTransforms: s.photoTransforms.filter((t) => t.photoId !== photoId),
      };
    });
  }, []);

  const clearPhotos = useCallback(() => {
    setState((s) => {
      s.photos.forEach((p) => {
        if (p.liveClipBlobUrl) URL.revokeObjectURL(p.liveClipBlobUrl);
      });
      return { ...s, photos: [] };
    });
  }, []);

  const setPhotoTransform = useCallback(
    (
      photoId: string,
      t: Partial<Pick<PhotoTransform, "scale" | "offsetX" | "offsetY" | "x" | "y" | "width" | "height" | "rotation">>,
    ) => {
      setState((s) => {
        const existing = s.photoTransforms.find((x) => x.photoId === photoId);
        const updated: PhotoTransform = {
          photoId,
          x: t.x ?? existing?.x ?? 0,
          y: t.y ?? existing?.y ?? 0,
          width: t.width ?? existing?.width ?? 0,
          height: t.height ?? existing?.height ?? 0,
          rotation: t.rotation ?? existing?.rotation ?? 0,
          scale: t.scale ?? existing?.scale ?? 1,
          offsetX: t.offsetX ?? existing?.offsetX ?? 0,
          offsetY: t.offsetY ?? existing?.offsetY ?? 0,
        };
        return {
          ...s,
          photoTransforms: [
            ...s.photoTransforms.filter((x) => x.photoId !== photoId),
            updated,
          ],
        };
      });
    },
    [],
  );

  const addPlacedSticker = useCallback(
    (s: Omit<PlacedSticker, "id">) => {
      const placed: PlacedSticker = { id: uuidv4(), ...s };
      setState((st) => ({ ...st, placedStickers: [...st.placedStickers, placed] }));
    },
    [],
  );

  const updatePlacedSticker = useCallback(
    (id: string, patch: Partial<PlacedSticker>) => {
      setState((st) => ({
        ...st,
        placedStickers: st.placedStickers.map((p) =>
          p.id === id ? { ...p, ...patch } : p,
        ),
      }));
    },
    [],
  );

  const removePlacedSticker = useCallback((id: string) => {
    setState((st) => ({
      ...st,
      placedStickers: st.placedStickers.filter((p) => p.id !== id),
    }));
  }, []);

  const resetAll = useCallback(() => {
    setState((s) => {
      s.photos.forEach((p) => {
        if (p.liveClipBlobUrl) URL.revokeObjectURL(p.liveClipBlobUrl);
      });
      return EMPTY_STATE;
    });
  }, []);

  const value = useMemo<PhotoboothContextValue>(
    () => ({
      ...state,
      setStep,
      nextStep,
      prevStep,
      setCameraFacing,
      setMirror,
      setFilter,
      setSelectedFrame,
      setStickers,
      setCaptureMode,
      setCountdownSeconds,
      setRecapBackground,
      addPhoto,
      replacePhoto,
      removePhoto,
      clearPhotos,
      setPhotoTransform,
      addPlacedSticker,
      updatePlacedSticker,
      removePlacedSticker,
      resetAll,
    }),
    [
      state,
      setStep,
      nextStep,
      prevStep,
      setCameraFacing,
      setMirror,
      setFilter,
      setSelectedFrame,
      setStickers,
      setCaptureMode,
      setCountdownSeconds,
      setRecapBackground,
      addPhoto,
      replacePhoto,
      removePhoto,
      clearPhotos,
      setPhotoTransform,
      addPlacedSticker,
      updatePlacedSticker,
      removePlacedSticker,
      resetAll,
    ],
  );

  return (
    <PhotoboothContext.Provider value={value}>
      {children}
    </PhotoboothContext.Provider>
  );
}

export function usePhotobooth() {
  const ctx = useContext(PhotoboothContext);
  if (!ctx) {
    throw new Error("usePhotobooth harus di dalam <PhotoboothProvider>");
  }
  return ctx;
}
