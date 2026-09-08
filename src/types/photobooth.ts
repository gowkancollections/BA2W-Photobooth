import type {
  FrameCategory as _FrameCategory,
  FrameRow,
  FrameSlotRow,
  StickerRow as _StickerRow,
} from "@/types/database";

export type FrameCategory = _FrameCategory;
export type StickerRow = _StickerRow;

export type CameraFacing = "user" | "environment";
export type CaptureMode = "manual" | "auto";

export type FilterKey =
  | "none"
  | "grayscale"
  | "sepia"
  | "vintage"
  | "cool"
  | "warm"
  | "contrast"
  | "pastel";

export const FILTER_DEFS: Record<FilterKey, { label: string; css: string }> = {
  none: { label: "Original", css: "none" },
  grayscale: { label: "B&W", css: "grayscale(1)" },
  sepia: { label: "Sepia", css: "sepia(0.85)" },
  vintage: {
    label: "Vintage",
    css: "sepia(0.4) contrast(1.1) saturate(0.9) brightness(1.05)",
  },
  cool: { label: "Cool", css: "hue-rotate(-15deg) saturate(1.1) brightness(1.05)" },
  warm: {
    label: "Warm",
    css: "sepia(0.25) saturate(1.2) brightness(1.05) hue-rotate(-10deg)",
  },
  contrast: { label: "Pop", css: "contrast(1.2) saturate(1.15) brightness(1.02)" },
  pastel: { label: "Pastel", css: "saturate(0.75) brightness(1.08) contrast(0.95)" },
};

export interface CapturedPhoto {
  id: string;
  slotOrder: number;
  dataUrl: string;
  filterCss: string;
  takenAt: number;
}

export interface PhotoTransform {
  photoId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface PlacedSticker {
  id: string;
  stickerId: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export type Step = "intro" | "choose-frame" | "camera" | "editor";

export const STEP_ORDER: Step[] = ["intro", "choose-frame", "camera", "editor"];

export interface SessionState {
  step: Step;
  photos: CapturedPhoto[];
  cameraFacing: CameraFacing;
  mirror: boolean;
  filter: FilterKey;
  selectedFrame: (FrameRow & { slots: FrameSlotRow[] }) | null;
  photoTransforms: PhotoTransform[];
  placedStickers: PlacedSticker[];
  stickers: StickerRow[];
  captureMode: CaptureMode;
  countdownSeconds: number;
  recapBackground: string;
}
