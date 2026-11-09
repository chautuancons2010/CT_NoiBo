"use client";

export interface ProcessedAttendancePhoto {
  photo: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

export interface AttendancePhotoStamp {
  capturedAt: string;
  address: string;
  latitude?: number;
  longitude?: number;
  label?: string;
}

function stampCanvas(canvas: HTMLCanvasElement, stamp?: AttendancePhotoStamp) {
  if (!stamp) return;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể ghi thông tin lên ảnh.");
  const scale = canvas.width / 1000;
  const size = Math.max(10, Math.round(23 * scale));
  const padding = Math.max(10, 22 * scale);
  context.font = `600 ${size}px sans-serif`;
  const words = stamp.address.split(/\s+/);
  const lines: string[] = []; let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width > canvas.width - padding * 2 && current) { lines.push(current); current = word; } else current = next;
  }
  if (current) lines.push(current);
  const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(stamp.capturedAt));
  const content = [stamp.label || "CHÂU TUẤN · ĐIỂM DANH", time, ...lines];
  if (stamp.latitude !== undefined && stamp.longitude !== undefined) content.push(`GPS ${stamp.latitude.toFixed(6)}, ${stamp.longitude.toFixed(6)}`);
  const lineHeight = size * 1.5;
  const height = Math.min(canvas.height, content.length * lineHeight + padding * 2);
  context.fillStyle = "rgba(0,0,0,.72)";
  context.fillRect(0, canvas.height - height, canvas.width, height);
  context.fillStyle = "#fff"; context.textBaseline = "top";
  content.forEach((line, index) => context.fillText(line, padding, canvas.height - height + padding + index * lineHeight, canvas.width - padding * 2));
}

function targetDimensions(width: number, height: number, longestEdge: number) {
  const ratio = Math.min(1, longestEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Không thể xử lý ảnh.")),
      "image/jpeg",
      quality
    );
  });
}

function drawVideo(video: HTMLVideoElement, longestEdge: number): HTMLCanvasElement {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) throw new Error("Camera chưa sẵn sàng.");
  const size = targetDimensions(sourceWidth, sourceHeight, longestEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Thiết bị không thể xử lý ảnh.");
  context.drawImage(video, 0, 0, size.width, size.height);
  return canvas;
}

export async function captureAttendancePhoto(video: HTMLVideoElement): Promise<ProcessedAttendancePhoto> {
  const fullCanvas = drawVideo(video, 1600);
  const thumbnailCanvas = drawVideo(video, 320);
  const [photo, thumbnail] = await Promise.all([
    canvasBlob(fullCanvas, 0.82),
    canvasBlob(thumbnailCanvas, 0.76)
  ]);
  return {
    photo,
    thumbnail,
    width: fullCanvas.width,
    height: fullCanvas.height,
    previewUrl: URL.createObjectURL(photo)
  };
}

export async function processAttendanceImage(file: File, stamp?: AttendancePhotoStamp): Promise<ProcessedAttendancePhoto> {
  const image = new Image();
  const sourceUrl = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Không thể đọc ảnh."));
      image.src = sourceUrl;
    });
    const draw = (longestEdge: number) => {
      const size = targetDimensions(image.naturalWidth, image.naturalHeight, longestEdge);
      const canvas = document.createElement("canvas");
      canvas.width = size.width; canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Thiết bị không thể xử lý ảnh.");
      context.drawImage(image, 0, 0, size.width, size.height);
      stampCanvas(canvas, stamp);
      return canvas;
    };
    const fullCanvas = draw(1600);
    const thumbnailCanvas = draw(320);
    const [photo, thumbnail] = await Promise.all([canvasBlob(fullCanvas, 0.82), canvasBlob(thumbnailCanvas, 0.76)]);
    return { photo, thumbnail, width: fullCanvas.width, height: fullCanvas.height, previewUrl: URL.createObjectURL(photo) };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
