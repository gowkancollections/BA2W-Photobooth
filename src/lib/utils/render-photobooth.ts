import type { CapturedPhoto, PhotoTransform, PlacedSticker } from "@/types/photobooth";
import type { FrameRow, FrameSlotRow } from "@/types/database";
import { computeCoverFit, loadImageCached } from "@/lib/utils/canvas";
import { frameImageUrl } from "@/lib/utils/r2-public";
import { slotToPixels } from "@/lib/utils/slot-coords";

// ====== WARNING: HARUS SAMA PERSIS dengan CANVAS_PADDING_X / CANVAS_PADDING_Y di editor-step.tsx.
// Ini default fallback jika outputWidth/Height tidak di passing explicit (caller lama).
const DEFAULT_PADDING_X = 150;
const DEFAULT_PADDING_Y = 150;

export interface RenderPhotoboothInput {
  frame: FrameRow & { slots: FrameSlotRow[] };
  photos: CapturedPhoto[];
  photoTransforms: PhotoTransform[];
  placedStickers: PlacedSticker[];
  outputWidth?: number;
  outputHeight?: number;
  recapBackground?: string;
}

type PhotoTransformFull = PhotoTransform;

function getTransform(
  transforms: PhotoTransform[],
  photoId: string,
): PhotoTransformFull {
  const t = transforms.find((x) => x.photoId === photoId);
  return {
    photoId,
    x: t?.x ?? 0,
    y: t?.y ?? 0,
    width: t?.width ?? 0,
    height: t?.height ?? 0,
    rotation: t?.rotation ?? 0,
    scale: t?.scale ?? 1,
    offsetX: t?.offsetX ?? 0,
    offsetY: t?.offsetY ?? 0,
  };
}

function hasNewTransform(t: PhotoTransformFull): boolean {
  return t.width > 0 && t.height > 0;
}

function drawPhotoInSlot(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slotPx: ReturnType<typeof slotToPixels>,
  transform: PhotoTransformFull,
  filterCss?: string,
) {
  const { x, y, width, height, rotation } = slotPx;
  const cx = x + width / 2;
  const cy = y + height / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.filter = filterCss && filterCss !== "none" ? filterCss : "none";

  if (hasNewTransform(transform)) {
    // transform.x / y = offset WITHIN-SLOT relatif ke origin slot (x, y). Jadi canvas coords = slotPx.coord + transform.coord
    const pcx = x + transform.x + transform.width / 2;
    const pcy = y + transform.y + transform.height / 2;
    ctx.save();
    ctx.translate(pcx, pcy);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.drawImage(
      img,
      -transform.width / 2,
      -transform.height / 2,
      transform.width,
      transform.height,
    );
    ctx.restore();
  } else {
    const fit = computeCoverFit({
      containerW: width,
      containerH: height,
      contentW: img.naturalWidth,
      contentH: img.naturalHeight,
      scale: transform.scale,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
    });
    ctx.drawImage(
      img,
      fit.sx,
      fit.sy,
      fit.sw,
      fit.sh,
      x + fit.dx,
      y + fit.dy,
      fit.dw,
      fit.dh,
    );
  }

  ctx.filter = "none";
  ctx.restore();
}

export async function renderPhotoboothCanvas(
  input: RenderPhotoboothInput,
): Promise<HTMLCanvasElement> {
  const { frame, photos, photoTransforms, placedStickers } = input;

  // ====== [1] HITUNG UKURAN TOTAL CANVAS & POSISI FRAME DITENGAH ======
  // a. Frame size ASLI dari DB (tempat foto2 + PNG frame).
  const frameW = frame.canvas_width ?? 1200;
  const frameH = frame.canvas_height ?? 1800;
  // b. Total canvas size: JIKA outputWidth/Height di-pass (dari editor-step = frame + 2*padding) -> pakai itu.
  //    Jika tidak: fallback default frame size + DEFAULT_PADDING per sisi (mirip dengan editor default).
  const totalCw = input.outputWidth ?? (frameW + DEFAULT_PADDING_X * 2);
  const totalCh = input.outputHeight ?? (frameH + DEFAULT_PADDING_Y * 2);
  // c. OFFSET X/Y agar FRAME (area foto + PNG frame) posisi DITENGAH vertikal & horizontal TOTAL CANVAS.
  //    Ketika editor passing outputWidth/Height: padX/padY hasilnya tepat = CANVAS_PADDING_X/Y (cocok 1:1 preview).
  const padX = Math.max(0, Math.round((totalCw - frameW) / 2));
  const padY = Math.max(0, Math.round((totalCh - frameH) / 2));

  const canvas = document.createElement("canvas");
  canvas.width = totalCw;
  canvas.height = totalCh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia");

  // ====== [2] FILL BACKGROUND SELURUH TOTAL CANVAS (TERMASUK AREA PADDING LUAR FRAME) ======
  const bgStr = input.recapBackground || "#FFF8E7";
  if (bgStr.trim().startsWith("linear-gradient")) {
    const m = bgStr.match(/linear-gradient\((\d+)deg,\s*([^,]+)\s+(\d+)%,\s*([^)]+)\s+(\d+)%\)/);
    if (m) {
      const angleDeg = Number(m[1]) || 180;
      const c1 = m[2].trim();
      const p1 = Number(m[3]);
      const c2 = m[4].trim();
      const rad = (angleDeg * Math.PI) / 180;
      const cx = totalCw / 2, cy = totalCh / 2;
      const length = (Math.abs(totalCw * Math.cos(rad)) + Math.abs(totalCh * Math.sin(rad))) / 2;
      const x1 = cx - Math.cos(rad) * length;
      const y1 = cy - Math.sin(rad) * length;
      const x2 = cx + Math.cos(rad) * length;
      const y2 = cy + Math.sin(rad) * length;
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(Math.max(0, Math.min(1, p1 / 100)), c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = "#FFF8E7";
    }
  } else {
    ctx.fillStyle = bgStr;
  }
  // Isi SELURUH total canvas (bukan cuma area frame) dengan warna / gradient recapBackground.
  ctx.fillRect(0, 0, totalCw, totalCh);

  const sortedSlots = [...frame.slots].sort(
    (a, b) => a.slot_order - b.slot_order,
  );

  const photoLoads = sortedSlots.map(async (slot) => {
    const photo = photos.find((p) => p.slotOrder === slot.slot_order);
    if (!photo) return null;
    const img = await loadImageCached(photo.dataUrl);
    return { slot, photo, img };
  });

  const loadedPhotos = (await Promise.all(photoLoads)).filter(Boolean) as {
    slot: FrameSlotRow;
    photo: CapturedPhoto;
    img: HTMLImageElement;
  }[];

  // ====== [3] DRAW FOTO DI SETIAP SLOT: KOORDINAT SLOT RELATIF KE FRAME, OFFSET +padX/padY ======
  for (const { slot, photo, img } of loadedPhotos) {
    // Hitung posisi slot dalam AREA FRAME (frameW x frameH).
    const slotPxFrame = slotToPixels(slot, frameW, frameH);
    // Tambah OFFSET ke tengah total canvas (sama persis dengan display di editor-step).
    const slotPx = {
      ...slotPxFrame,
      x: slotPxFrame.x + padX,
      y: slotPxFrame.y + padY,
    };
    const transform = getTransform(photoTransforms, photo.id);
    drawPhotoInSlot(ctx, img, slotPx, transform, photo.filterCss);
  }

  // ====== [4] DRAW FRAME PNG OVERLAY POSISI DITENGAH TOTAL CANVAS (padX/padY) ======
  // Sebelumnya draw di (0,0) menutupi size TOTAL CANVAS (salah).
  // Sekarang tepat ditengah: x=padX y=padY w=frameW h=frameH (sinkron display editor).
  if (frame.r2_image_path) {
    const frameUrl = frameImageUrl(frame.r2_image_path);
    if (frameUrl) {
      try {
        const frameImg = await loadImageCached(frameUrl).catch(async () => {
          // Fallback kalo loadImageCached (yang crossOrigin) gagal total CORS.
          // Coba load tanpa crossOrigin (canvas jadi tainted (toDataURL error nanti,
          // tapi minimal gambar frame setidaknya muncul kalo di canvas context bisa (contoh preload image object tanpa CORS).
          console.warn("[render] crossOrigin frame gagal (CORS?), coba tanpa CORS fallback");
          return await new Promise<HTMLImageElement>((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = frameUrl;
          });
        });
        ctx.drawImage(frameImg, padX, padY, frameW, frameH);
      } catch (err) {
        console.warn("[BA2W render] Frame PNG overlay TIDAK bisa dimuat (export tidak ada frame overlay):", err);
      }
    }
  }

  // ====== [5] DRAW STICKER: KOORDINAT STICKER RELATIF KE FRAME, OFFSET +padX/padY ======
  for (const sticker of placedStickers) {
    const src = sticker.imageUrl;
    if (!src) continue;
    try {
      const img = await loadImageCached(src);
      // Posisi center sticker relatif ke FRAME + OFFSET ke tengah total canvas (sinkron preview editor).
      const cx = sticker.x + sticker.width / 2 + padX;
      const cy = sticker.y + sticker.height / 2 + padY;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((sticker.rotation * Math.PI) / 180);
      ctx.drawImage(
        img,
        -sticker.width / 2,
        -sticker.height / 2,
        sticker.width,
        sticker.height,
      );
      ctx.restore();
    } catch {
      // skip broken sticker
    }
  }

  return canvas;
}

export async function renderPhotoboothDataUrl(
  input: RenderPhotoboothInput,
): Promise<string> {
  const canvas = await renderPhotoboothCanvas(input);
  return canvas.toDataURL("image/png");
}
