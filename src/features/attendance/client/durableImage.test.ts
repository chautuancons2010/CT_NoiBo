import { expect, it } from "vitest";
import { decodeDurableImage, encodeDurableImage } from "./durableImage";

it("stores image bytes without a Blob handle and restores the exact content and mime type", async () => {
  const original = new Blob([new Uint8Array([0xff,0xd8,0xff,1,2,3])], {type:"image/jpeg"});
  const encoded = await encodeDurableImage(original);
  expect(encoded).not.toBeInstanceOf(Blob);expect(encoded.bytes).toBeInstanceOf(ArrayBuffer);expect(encoded.size).toBe(6);
  const restored = decodeDurableImage(encoded);
  expect(restored.type).toBe(original.type);expect(restored.size).toBe(original.size);
  expect(await encodeDurableImage(restored)).toEqual(encoded);
});
it("still reads a legacy Blob and rejects invalid storage without deleting it", () => {
  const old = new Blob(["saved"], {type:"image/jpeg"});expect(decodeDurableImage(old)).toBe(old);
  expect(()=>decodeDurableImage({bytes:"corrupt"})).toThrow("Chưa đọc được ảnh");
});
