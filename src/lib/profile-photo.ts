// Client-side avatar photo processing. No network, no dependency: decode -> centre-crop to a
// square -> downscale to 128x128 on a canvas -> JPEG data URL. Browser-only; only called from a
// file-input change handler, never during render/SSR.

export const PHOTO_SIZE = 128;
export const PHOTO_MAX_INPUT_BYTES = 10 * 1024 * 1024;

const ERR_TYPE = "Pilih file gambar (JPG, PNG, atau WebP).";
const ERR_SIZE = "Foto terlalu besar. Maksimal 10 MB.";
const ERR_READ = "Foto tidak bisa dibaca. Coba gambar lain.";

export function centerCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(file);
    return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode"));
      img.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function processPhoto(
  file: File,
): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
  if (!file.type.startsWith("image/")) return { ok: false, error: ERR_TYPE };
  if (file.size > PHOTO_MAX_INPUT_BYTES) return { ok: false, error: ERR_SIZE };
  try {
    const img = await decode(file);
    try {
      if (img.width <= 0 || img.height <= 0) return { ok: false, error: ERR_READ };
      const canvas = document.createElement("canvas");
      canvas.width = PHOTO_SIZE;
      canvas.height = PHOTO_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { ok: false, error: ERR_READ };
      // White backdrop so transparent PNGs become opaque (JPEG has no alpha channel).
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
      const { sx, sy, side } = centerCrop(img.width, img.height);
      ctx.drawImage(img.source, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      if (!dataUrl.startsWith("data:image/")) return { ok: false, error: ERR_READ };
      return { ok: true, dataUrl };
    } finally {
      img.release();
    }
  } catch {
    return { ok: false, error: ERR_READ };
  }
}
