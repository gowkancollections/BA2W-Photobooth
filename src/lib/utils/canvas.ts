function decodeImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return decodeImageFromSrc(dataUrl);
}

/**
 * Load image for canvas draw/export via fetch + Blob URL.
 * Avoids Safari/WebKit disk-cache collision between a non-CORS <img>
 * request and a later Image() + crossOrigin request to the same URL.
 * Blob URLs are same-origin, so the canvas is never tainted.
 */
export async function loadImageForCanvas(url: string): Promise<HTMLImageElement> {
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return decodeImageFromSrc(url);
  }

  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) {
    throw new Error(`Gagal fetch gambar: ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    return await decodeImageFromSrc(blobUrl);
  } catch (err) {
    URL.revokeObjectURL(blobUrl);
    throw err;
  }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return loadImageForCanvas(url);
}

const imageCache = new Map<string, HTMLImageElement>();

export async function loadImageCached(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const img = await loadImageForCanvas(url);
  imageCache.set(url, img);
  return img;
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  width: number,
  height: number,
  filterCss: string,
  mirror: boolean,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context tidak tersedia");
  ctx.save();
  ctx.filter = filterCss === "none" ? "none" : filterCss;
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();
  return canvas.toDataURL("image/png");
}

export interface CoverFitParams {
  containerW: number;
  containerH: number;
  contentW: number;
  contentH: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface CoverFitResult {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export function computeCoverFit(params: CoverFitParams): CoverFitResult {
  const { containerW, containerH, contentW, contentH } = params;
  const scale = params.scale ?? 1;
  const offsetX = params.offsetX ?? 0;
  const offsetY = params.offsetY ?? 0;

  const containerRatio = containerW / containerH;
  const contentRatio = contentW / contentH;

  let drawW: number;
  let drawH: number;
  if (contentRatio > containerRatio) {
    drawH = containerH * scale;
    drawW = drawH * contentRatio;
  } else {
    drawW = containerW * scale;
    drawH = drawW / contentRatio;
  }

  const baseDx = (containerW - drawW) / 2;
  const baseDy = (containerH - drawH) / 2;

  const dx = baseDx + offsetX;
  const dy = baseDy + offsetY;

  return {
    dx,
    dy,
    dw: drawW,
    dh: drawH,
    sx: 0,
    sy: 0,
    sw: contentW,
    sh: contentH,
  };
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function pngNaturalSize(dataUrl: string): Promise<{ width: number; height: number }> {
  const img = await dataUrlToImage(dataUrl);
  return { width: img.naturalWidth, height: img.naturalHeight };
}
