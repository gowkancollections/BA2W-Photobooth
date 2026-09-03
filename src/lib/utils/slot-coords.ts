import type { FrameSlotRow } from "@/types/database";

export interface SlotPixels {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

function normalize(value: number, dimension: number): number {
  if (value <= 1) return value * dimension;
  if (value <= 100) return (value / 100) * dimension;
  return value;
}

export function slotToPixels(
  slot: FrameSlotRow,
  canvasWidth: number,
  canvasHeight: number,
): SlotPixels {
  return {
    x: normalize(slot.x, canvasWidth),
    y: normalize(slot.y, canvasHeight),
    width: normalize(slot.width, canvasWidth),
    height: normalize(slot.height, canvasHeight),
    rotation: slot.rotation ?? 0,
  };
}

export function pointInRotatedRect(
  px: number,
  py: number,
  rect: SlotPixels,
): boolean {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rad = (rect.rotation * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  const dx = px - cx;
  const dy = py - cy;
  const localX = dx * cos - dy * sin + rect.width / 2;
  const localY = dx * sin + dy * cos + rect.height / 2;
  return (
    localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height
  );
}
