import assert from "node:assert/strict";
import { test } from "node:test";
import { PhotonImage } from "@cf-wasm/photon";
import { imageMeta } from "image-meta";
import { createMealPhotoPreview } from "../server/utils/meal-photo.ts";

function photo(width = 64, height = 32, orientation = 1) {
  const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]];
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = colors[(y >= height / 2 ? 2 : 0) + (x >= width / 2 ? 1 : 0)]!;
      pixels.set([...color, 255], (y * width + x) * 4);
    }
  }
  const image = new PhotonImage(pixels, width, height);
  try {
    const jpeg = image.get_bytes_jpeg(95);
    // A real EXIF orientation tag followed by a private JPEG comment.
    const exif = Buffer.from([
      0x45, 0x78, 0x69, 0x66, 0, 0, 0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8,
      0, 1, 1, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0,
    ]);
    const comment = Buffer.from("private-camera-location");
    return Buffer.concat([
      jpeg.slice(0, 2), Buffer.from([0xff, 0xe1, 0, exif.length + 2]), exif,
      Buffer.from([0xff, 0xfe, 0, comment.length + 2]), comment, jpeg.slice(2),
    ]);
  } finally {
    image.free();
  }
}

test("public meal previews resize photos and discard embedded camera metadata", async () => {
  const original = photo(1200, 900, 6);
  assert.equal(imageMeta(original).orientation, 6);
  const result = await createMealPhotoPreview(new Blob([new Uint8Array(original)]));
  assert.equal(result.type, "image/jpeg");
  const preview = new Uint8Array(await result.arrayBuffer());
  assert.deepEqual(imageMeta(preview), { type: "jpg", width: 576, height: 768 });
  assert.ok(preview.byteLength < original.byteLength);
  assert.ok(!Buffer.from(preview).includes(Buffer.from("Exif")));
  assert.ok(!Buffer.from(preview).includes(Buffer.from("private-camera-location")));
});

test("public meal previews preserve camera orientation, including mirrored photos", async () => {
  const expected = [
    ["red", "green", "blue", "yellow"], ["green", "red", "yellow", "blue"],
    ["yellow", "blue", "green", "red"], ["blue", "yellow", "red", "green"],
    ["red", "blue", "green", "yellow"], ["blue", "red", "yellow", "green"],
    ["yellow", "green", "blue", "red"], ["green", "yellow", "red", "blue"],
  ];
  for (let orientation = 1; orientation <= 8; orientation++) {
    const preview = await createMealPhotoPreview(new Blob([new Uint8Array(photo(64, 32, orientation))]));
    const image = PhotonImage.new_from_byteslice(new Uint8Array(await preview.arrayBuffer()));
    try {
      const width = image.get_width();
      const height = image.get_height();
      assert.equal(width, orientation >= 5 ? 32 : 64);
      assert.equal(height, orientation >= 5 ? 64 : 32);
      const pixels = image.get_raw_pixels();
      const corners = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].map(([x, y]) => {
        const offset = (Math.floor(y! * height) * width + Math.floor(x! * width)) * 4;
        const [red, green, blue] = pixels.slice(offset, offset + 3);
        return red! > 200 ? (green! > 200 ? "yellow" : "red") : blue! > 200 ? "blue" : "green";
      });
      assert.deepEqual(corners, expected[orientation - 1], `EXIF orientation ${orientation}`);
    } finally {
      image.free();
    }
  }
});

test("public meal previews reject active content, oversized images, and invalid bytes", async () => {
  await assert.rejects(createMealPhotoPreview(new Blob(['<svg width="10" height="10"></svg>'])));
  await assert.rejects(createMealPhotoPreview(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)])), /too large/);
  await assert.rejects(createMealPhotoPreview(new Blob(["not an image"])));
  const oversized = photo();
  // A JPEG SOF marker supplies dimensions before its pixel data is decoded.
  const marker = oversized.indexOf(Buffer.from([0xff, 0xc0]));
  assert.ok(marker > 0);
  oversized.writeUInt16BE(10_000, marker + 5);
  oversized.writeUInt16BE(10_000, marker + 7);
  await assert.rejects(createMealPhotoPreview(new Blob([new Uint8Array(oversized)])), /too large/);
});
