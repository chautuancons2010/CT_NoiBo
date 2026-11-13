import { z } from "zod";
import { AppError } from "@/lib/api/errors";
import type { AttendancePhotoStampMetadata } from "../types/attendanceTypes";

export const attendancePhotoStampSchema = z.object({
  version: z.literal(1),
  capturedByName: z.string().trim().min(1).max(255).optional(),
  capturedByUsername: z.string().trim().min(1).max(255).optional(),
  capturedAt: z.string().datetime({ offset: true }),
  address: z.string().trim().min(3).max(1000),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
}).strict();

export function storedAttendancePhotoStamp(metadata: unknown): AttendancePhotoStampMetadata | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const parsed = attendancePhotoStampSchema.safeParse((metadata as Record<string, unknown>).stamp);
  return parsed.success ? parsed.data : undefined;
}

export function validateAttendancePhotoStamp(
  value: unknown,
  photoCapturedAt: string,
  event: { capturedAtClient: string; latitude?: number; longitude?: number },
): AttendancePhotoStampMetadata {
  const parsed = attendancePhotoStampSchema.safeParse(value);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Thông tin thời gian, địa chỉ và GPS trên ảnh không hợp lệ.");
  const stamp = parsed.data;
  if (Date.parse(stamp.capturedAt) !== Date.parse(photoCapturedAt) || Date.parse(stamp.capturedAt) !== Date.parse(event.capturedAtClient)) {
    throw new AppError("VALIDATION_ERROR", "Thời gian trên ảnh không khớp lượt chấm công.");
  }
  if (stamp.latitude === undefined && stamp.longitude === undefined && event.latitude === undefined && event.longitude === undefined) return stamp;
  // One millionth of a degree accepts storage precision (<12 cm) without
  // accepting a different capture location.
  if (stamp.latitude === undefined || stamp.longitude === undefined || event.latitude === undefined || event.longitude === undefined ||
      !Number.isFinite(event.latitude) || !Number.isFinite(event.longitude) ||
      Math.abs(stamp.latitude - event.latitude) > 0.000001 || Math.abs(stamp.longitude - event.longitude) > 0.000001) {
    throw new AppError("VALIDATION_ERROR", "Vị trí trên ảnh không khớp GPS của lượt chấm công.");
  }
  return stamp;
}
