import type { FrameCategory } from "@/types/database";

export const CATEGORY_DEFAULT_SLOT_COUNT: Record<FrameCategory, number> = {
  single: 1,
  "strip-3": 3,
  "strip-4": 4,
  "photostrip-3x2": 6,
  "photostrip-4x2": 8,
};

export const CATEGORY_AVG_SLOT_ASPECT: Record<FrameCategory, number> = {
  single: 1.5,
  "strip-3": 2.35,
  "strip-4": 2.35,
  "photostrip-3x2": 1,
  "photostrip-4x2": 1,
};

export function countForCategory(cat: FrameCategory): number {
  return CATEGORY_DEFAULT_SLOT_COUNT[cat];
}
