import { PhotonImage, SamplingFilter, fliph, flipv, resize, rotate } from "@cf-wasm/photon";
import { imageMeta } from "image-meta";

/** Build a resized public JPEG without the original camera metadata. */
export async function createMealPhotoPreview(original: Blob): Promise<Blob> {
  if (original.size > 10 * 1024 * 1024) throw new Error("Photo is too large");
  const bytes = new Uint8Array(await original.arrayBuffer());
  return new Blob([new Uint8Array(encodePreview(bytes))], { type: "image/jpeg" });
}

function encodePreview(bytes: Uint8Array): Uint8Array {
  const { type, width, height, orientation = 1 } = imageMeta(bytes);
  if (!type || !["jpg", "png", "webp"].includes(type)) throw new Error("Unsupported photo format");
  if (width < 1 || height < 1 || width * height > 8_000_000) throw new Error("Photo is too large");

  const original = PhotonImage.new_from_byteslice(bytes);
  const scale = Math.min(1, 768 / Math.max(width, height));
  let preview: PhotonImage;
  try {
    preview = resize(original, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), SamplingFilter.Triangle);
  } finally {
    original.free();
  }

  try {
    if ([2, 5, 7].includes(orientation)) fliph(preview);
    if (orientation === 4) flipv(preview);
    const degrees = orientation === 3 ? 180 : [6, 7].includes(orientation) ? 90 : [5, 8].includes(orientation) ? 270 : 0;
    if (!degrees) return preview.get_bytes_jpeg(80);
    const upright = rotate(preview, degrees);
    try {
      return upright.get_bytes_jpeg(80);
    } finally {
      upright.free();
    }
  } finally {
    preview.free();
  }
}
