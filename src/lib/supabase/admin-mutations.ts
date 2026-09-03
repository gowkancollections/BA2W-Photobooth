import { getSupabaseBrowser } from "@/lib/supabase/client";
import type {
  FrameCategory,
  FrameRow,
  FrameSlotRow,
  StickerRow,
  Database,
} from "@/types/database";
import { v4 as uuidv4 } from "uuid";

type FramesInsert = Database["public"]["Tables"]["frames"]["Insert"];
type FramesUpdate = Database["public"]["Tables"]["frames"]["Update"];
type FrameSlotsInsert = Database["public"]["Tables"]["frame_slots"]["Insert"];
type StickersInsert = Database["public"]["Tables"]["stickers"]["Insert"];
type StickersUpdate = Database["public"]["Tables"]["stickers"]["Update"];

export async function fetchAllFrames(): Promise<FrameRow[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("frames")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FrameRow[];
}

export async function fetchFrameSlots(frameId: string): Promise<FrameSlotRow[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("frame_slots")
    .select("*")
    .eq("frame_id", frameId)
    .order("slot_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FrameSlotRow[];
}

export interface CreateFrameInput {
  id: string;
  name: string;
  description?: string;
  category: FrameCategory;
  r2_image_path: string;
  canvas_width: number;
  canvas_height: number;
  created_by: string;
}

export async function createFrame(input: CreateFrameInput): Promise<FrameRow> {
  const sb = getSupabaseBrowser();
  const payload: FramesInsert = {
    id: input.id,
    name: input.name,
    description: input.description ?? null,
    category: input.category,
    r2_image_path: input.r2_image_path,
    canvas_width: input.canvas_width,
    canvas_height: input.canvas_height,
    is_active: true,
    created_by: input.created_by,
  };
  const { data, error } = await (sb.from("frames") as any)
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as FrameRow;
}

export async function updateFrame(
  id: string,
  patch: Partial<
    Pick<FrameRow, "name" | "description" | "category" | "is_active">
  >,
): Promise<void> {
  const sb = getSupabaseBrowser();
  const payload: FramesUpdate = {
    ...patch,
    updated_at: new Date().toISOString(),
  } as FramesUpdate;
  const { error } = await (sb.from("frames") as any)
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function upsertFrameSlot(
  slot: Omit<FrameSlotRow, "created_at">,
): Promise<FrameSlotRow> {
  const sb = getSupabaseBrowser();
  const payload: FrameSlotsInsert = {
    id: slot.id,
    frame_id: slot.frame_id,
    slot_order: slot.slot_order,
    x: slot.x,
    y: slot.y,
    width: slot.width,
    height: slot.height,
    rotation: slot.rotation ?? 0,
  };
  const { data, error } = await (sb.from("frame_slots") as any)
    .upsert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as FrameSlotRow;
}

export async function deleteFrameSlot(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("frame_slots").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllFrameSlots(frameId: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb
    .from("frame_slots")
    .delete()
    .eq("frame_id", frameId);
  if (error) throw error;
}

export function newSlotDefaults(
  frameId: string,
  slotOrder: number,
): Omit<FrameSlotRow, "created_at"> {
  return {
    id: uuidv4(),
    frame_id: frameId,
    slot_order: slotOrder,
    x: 10,
    y: 10 + slotOrder * 5,
    width: 35,
    height: 25,
    rotation: 0,
  };
}

export async function fetchAllStickers(): Promise<StickerRow[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("stickers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StickerRow[];
}

export interface CreateStickerInput {
  id: string;
  name: string;
  category: string;
  r2_image_path: string;
  created_by: string;
}

export async function createSticker(
  input: CreateStickerInput,
): Promise<StickerRow> {
  const sb = getSupabaseBrowser();
  const payload: StickersInsert = {
    id: input.id,
    name: input.name,
    category: input.category,
    r2_image_path: input.r2_image_path,
    is_active: true,
    created_by: input.created_by,
  };
  const { data, error } = await (sb.from("stickers") as any)
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as StickerRow;
}

export async function updateSticker(
  id: string,
  patch: Partial<Pick<StickerRow, "name" | "category" | "is_active">>,
): Promise<void> {
  const sb = getSupabaseBrowser();
  const payload: StickersUpdate = patch as StickersUpdate;
  const { error } = await (sb.from("stickers") as any)
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}
