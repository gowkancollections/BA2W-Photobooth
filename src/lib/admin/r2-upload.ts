export interface PresignedUploadResult {
  id: string;
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

/** MIME that must match both the presigned PutObject ContentType and the PUT header. */
export function resolveImageContentType(file: File): string {
  const raw = (file.type || "").toLowerCase().trim();
  if (raw === "image/jpg" || raw === "image/pjpeg") return "image/jpeg";
  if (raw === "image/png" || raw === "image/jpeg" || raw === "image/webp") {
    return raw;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

export async function requestPresignedUpload(
  scope: "frame" | "sticker",
  file: File,
): Promise<PresignedUploadResult> {
  const contentType = resolveImageContentType(file);
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const res = await fetch("/api/presigned-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope,
      contentType,
      extension: ext,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Gagal mendapatkan presigned URL");
  }
  return json as PresignedUploadResult;
}

export async function uploadFileToR2(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const contentType = resolveImageContentType(file);
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Upload R2 gagal (${put.status})`);
  }
}

export async function uploadAssetToR2(
  scope: "frame" | "sticker",
  file: File,
): Promise<PresignedUploadResult> {
  const presigned = await requestPresignedUpload(scope, file);
  await uploadFileToR2(presigned.uploadUrl, file);
  return presigned;
}
