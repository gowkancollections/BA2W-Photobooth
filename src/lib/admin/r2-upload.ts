export interface PresignedUploadResult {
  id: string;
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

export async function requestPresignedUpload(
  scope: "frame" | "sticker",
  file: File,
): Promise<PresignedUploadResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const res = await fetch("/api/presigned-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope,
      contentType: file.type || "image/png",
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
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/png" },
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
