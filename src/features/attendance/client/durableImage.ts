// Store bytes instead of file-backed Blob handles: WebKit can reject those
// handles during IndexedDB writes, even after canvas processing has succeeded.
export interface DurableImage { bytes: ArrayBuffer; type: string; size: number }

export async function encodeDurableImage(blob: Blob): Promise<DurableImage> {
  const bytes = typeof blob.arrayBuffer === "function" ? await blob.arrayBuffer() : await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(blob);
  });
  return { bytes, type: blob.type, size: bytes.byteLength };
}

export function decodeDurableImage(value: unknown): Blob {
  if (value instanceof Blob) return value; // Read captures saved by older versions.
  const stored = value as Partial<DurableImage> | undefined;
  if (stored?.bytes instanceof ArrayBuffer) return new Blob([stored.bytes], { type: stored.type || "image/jpeg" });
  throw new Error("Chưa đọc được ảnh đã lưu trên thiết bị.");
}
