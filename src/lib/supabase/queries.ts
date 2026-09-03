import { getSupabaseBrowser } from "@/lib/supabase/client";
import type {
  FrameCategory,
  FrameRow,
  FrameSlotRow,
  StickerRow,
} from "@/types/database";

export type FrameWithSlots = FrameRow & { slots: FrameSlotRow[] };

export async function fetchFramesByCategory(
  category: FrameCategory,
): Promise<FrameWithSlots[]> {
  const supabase = getSupabaseBrowser();

  const { data: frames, error } = await supabase
    .from("frames")
    .select("*")
    .eq("category", category)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const frameRows = (frames ?? []) as FrameRow[];
  if (!frameRows.length) return [];

  const frameIds = frameRows.map((f) => f.id);
  const { data: slots, error: slotsErr } = await supabase
    .from("frame_slots")
    .select("*")
    .in("frame_id", frameIds)
    .order("slot_order", { ascending: true });

  if (slotsErr) throw slotsErr;

  const slotRows = (slots ?? []) as FrameSlotRow[];
  const slotsByFrame = new Map<string, FrameSlotRow[]>();
  for (const slot of slotRows) {
    const list = slotsByFrame.get(slot.frame_id) ?? [];
    list.push(slot);
    slotsByFrame.set(slot.frame_id, list);
  }

  return frameRows.map((frame) => ({
    ...frame,
    slots: slotsByFrame.get(frame.id) ?? [],
  }));
}

export async function fetchAllActiveFramesWithSlots(): Promise<FrameWithSlots[]> {
  const supabase = getSupabaseBrowser();

  const { data: frames, error } = await supabase
    .from("frames")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const frameRows = (frames ?? []) as FrameRow[];
  if (!frameRows.length) return [];

  const frameIds = frameRows.map((f) => f.id);
  const { data: slots, error: slotsErr } = await supabase
    .from("frame_slots")
    .select("*")
    .in("frame_id", frameIds)
    .order("slot_order", { ascending: true });

  if (slotsErr) throw slotsErr;

  const slotRows = (slots ?? []) as FrameSlotRow[];
  const slotsByFrame = new Map<string, FrameSlotRow[]>();
  for (const slot of slotRows) {
    const list = slotsByFrame.get(slot.frame_id) ?? [];
    list.push(slot);
    slotsByFrame.set(slot.frame_id, list);
  }

  return frameRows.map((frame) => ({
    ...frame,
    slots: slotsByFrame.get(frame.id) ?? [],
  }));
}

export async function fetchActiveStickers(): Promise<StickerRow[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("stickers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StickerRow[];
}
