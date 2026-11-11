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
  accuracy?: number;
  label?: string;
}

function stampCanvas(canvas: HTMLCanvasElement, stamp?: AttendancePhotoStamp) {
  if (!stamp) return;
  if (!Number.isFinite(Date.parse(stamp.capturedAt)) || !stamp.address.trim()) throw new Error("Thiếu thời gian hoặc địa chỉ để ghi lên ảnh.");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể ghi thông tin lên ảnh.");
  const scale = canvas.width / 1000;
  const size = Math.max(10, Math.round(28 * scale));
  const timeSize = Math.max(15, Math.round(42 * scale));
  const labelSize = Math.max(9, Math.round(16 * scale));
  const padding = Math.max(8, 22 * scale);
  context.font = `600 ${size}px sans-serif`;
  const words = stamp.address.split(/\s+/);
  const lines: string[] = []; let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width > canvas.width - padding * 2 && current) { lines.push(current); current = word; } else current = next;
  }
  if (current) lines.push(current);
  if (lines.length > 2) lines.splice(1, lines.length - 1, `${lines.slice(1).join(" ").slice(0, Math.max(20, lines[0].length - 2))}…`);
  const time = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(stamp.capturedAt));
  const date = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(stamp.capturedAt));
  const content = [
    { text: `${time} · ${date}`, size: timeSize },
    { text: (stamp.label || "CHÂU TUẤN · ĐIỂM DANH").slice(0, 70), size: labelSize },
    ...lines.map(text => ({ text, size }))
  ];
  if (stamp.latitude !== undefined && stamp.longitude !== undefined) content.push({ text: `GPS ${stamp.latitude.toFixed(6)}, ${stamp.longitude.toFixed(6)}${stamp.accuracy !== undefined ? ` · ±${Math.round(stamp.accuracy)} m` : ""}`, size: labelSize });
  const height = Math.min(canvas.height, content.reduce((total, line) => total + line.size * 1.4, 0) + padding * 2);
  context.fillStyle = "rgba(13,31,23,.72)";
  context.fillRect(0, canvas.height - height, canvas.width, height);
  context.fillStyle = "#39d99a";
  context.fillRect(0, canvas.height - height, canvas.width, Math.max(2, 3 * scale));
  context.fillStyle = "#fff"; context.textBaseline = "top";
  let y = canvas.height - height + padding;
  for (const line of content) {
    context.font = `${line.size === timeSize ? 700 : 500} ${line.size}px sans-serif`;
    context.fillText(line.text, padding, y, canvas.width - padding * 2);
    y += line.size * 1.4;
  }
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
  const fullCanvas = drawVideo(video, 1920);
  const thumbnailCanvas = drawVideo(video, 320);
  const [photo, thumbnail] = await Promise.all([
    boundedPhotoBlob(fullCanvas),
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
    const fullCanvas = draw(1920);
    const thumbnailCanvas = draw(320);
    const [photo, thumbnail] = await Promise.all([boundedPhotoBlob(fullCanvas), canvasBlob(thumbnailCanvas, 0.8)]);
    return { photo, thumbnail, width: fullCanvas.width, height: fullCanvas.height, previewUrl: URL.createObjectURL(photo) };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function boundedPhotoBlob(canvas: HTMLCanvasElement) {
  for (const quality of [0.9, 0.84, 0.76, 0.64, 0.5]) {
    const blob = await canvasBlob(canvas, quality);
    if (blob.size <= 2 * 1024 * 1024) return blob;
  }
  throw new Error("Ảnh quá lớn. Vui lòng chụp lại.");
}
