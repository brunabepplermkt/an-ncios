export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ALLOWED_VIDEO_MIME = ["video/mp4", "video/quicktime"];

export function classifyCreativeMime(mimeType: string): "IMAGE" | "VIDEO" | null {
  if (ALLOWED_IMAGE_MIME.includes(mimeType)) return "IMAGE";
  if (ALLOWED_VIDEO_MIME.includes(mimeType)) return "VIDEO";
  return null;
}
