import { describe, expect, it } from "vitest";

import { PHOTO_MAX_INPUT_BYTES, centerCrop, processPhoto } from "@/lib/profile-photo";

// jsdom has no canvas and no createImageBitmap, so the real decode -> centre-crop -> 128x128 JPEG
// export cannot run here. Only the pure crop maths and the early validation paths are covered;
// the real pipeline is a manual browser test (see sidebar-profile-verification.md).
describe("centerCrop", () => {
  it("crops landscape images to a centred square", () => {
    expect(centerCrop(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 });
  });
  it("crops portrait images to a centred square", () => {
    expect(centerCrop(200, 400)).toEqual({ sx: 0, sy: 100, side: 200 });
  });
  it("leaves square images untouched", () => {
    expect(centerCrop(300, 300)).toEqual({ sx: 0, sy: 0, side: 300 });
  });
});

describe("processPhoto validation", () => {
  it("rejects non-image files with an Indonesian message", async () => {
    const res = await processPhoto(new File(["hello"], "a.txt", { type: "text/plain" }));
    expect(res).toEqual({ ok: false, error: "Pilih file gambar (JPG, PNG, atau WebP)." });
  });

  it("rejects oversized images", async () => {
    const f = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(f, "size", { value: PHOTO_MAX_INPUT_BYTES + 1 });
    const res = await processPhoto(f);
    expect(res).toEqual({ ok: false, error: "Foto terlalu besar. Maksimal 10 MB." });
  });
});
