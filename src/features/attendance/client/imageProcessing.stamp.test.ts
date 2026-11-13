import { afterEach, describe, expect, it, vi } from "vitest";
import { processAttendanceImage } from "./imageProcessing";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("JPEG evidence footer", () => {
  it("draws the original Vietnam capture time and address into full image and thumbnail before JPEG encoding", async () => {
    const contexts: Array<{ font: string; fillText: ReturnType<typeof vi.fn>; fillRect: ReturnType<typeof vi.fn> }> = [];
    const perCanvas = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
    vi.stubGlobal("Image", class {
      naturalWidth = 1600;
      naturalHeight = 1200;
      onload?: () => void;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn().mockReturnValue("blob:encoded") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      const cached = perCanvas.get(this);
      if (cached) return cached;
      const context = { font: "", drawImage: vi.fn(), fillText: vi.fn(), fillRect: vi.fn(), fillStyle: "", textBaseline: "", measureText(text: string) { return { width: text.length * (Number.parseFloat(this.font.replace(/^600 /, "")) || 10) * .5 }; } };
      contexts.push(context);
      perCanvas.set(this, context as unknown as CanvasRenderingContext2D);
      return context as unknown as CanvasRenderingContext2D;
    });
    const encoded = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback, type) {
      callback(new Blob(["jpeg-encoded-after-drawing"], { type }));
    });
    const result = await processAttendanceImage(new File(["original"], "camera.jpg", { type: "image/jpeg" }), { capturedAt: "2026-11-09T06:20:15.000Z", address: "12 Nguyễn Huệ, TP. Hồ Chí Minh", latitude: 10.7769, longitude: 106.7009, label: "CHÂU TUẤN · CHẤM VÀO", capturedByName: "Nguyễn Văn An", capturedByUsername: "NV001" });
    expect(contexts).toHaveLength(2);
    for (const context of contexts) {
      const text = context.fillText.mock.calls.map(call => call[0]).join(" ");
      expect(text).toContain("13:20:15 · 09/11/2026");
      expect(text).toContain("12 Nguyễn Huệ, TP. Hồ Chí Minh");
      expect(text).toContain("GPS 10.776900, 106.700900");
      expect(text).toContain("Người chấm: Nguyễn Văn An · @NV001");
      expect(context.fillRect).toHaveBeenCalledTimes(2);
      expect(context.fillText.mock.invocationCallOrder.at(-1)).toBeLessThan(encoded.mock.invocationCallOrder[contexts.indexOf(context)]);
    }
    expect(result.photo.type).toBe("image/jpeg");
    expect(result.thumbnail.type).toBe("image/jpeg");
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
    expect(encoded).toHaveBeenCalledTimes(2);
  });
});
