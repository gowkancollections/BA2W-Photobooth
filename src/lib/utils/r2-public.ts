export function r2PublicUrlFor(path: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base || !path) return "";
  const clean = path.replace(/^\//, "");
  return `${base.replace(/\/$/, "")}/${clean}`;
}

export function frameThumbnailUrl(
  frameId: string,
  r2ImagePath: string | null,
): string {
  return frameImageUrl(r2ImagePath);
}

export function frameImageUrl(r2ImagePath: string | null): string {
  if (!r2ImagePath) return "";
  return r2PublicUrlFor(r2ImagePath);
}

export function stickerImageUrl(r2ImagePath: string | null): string {
  if (!r2ImagePath) return "";
  return r2PublicUrlFor(r2ImagePath);
}
