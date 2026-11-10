"use client";

import type { AttendanceCoordinates, AttendancePhotoStampMetadata, AttendanceType } from "../types/attendanceTypes";
import { lookupAttendanceAddress } from "./attendanceAddressClient";
import { processAttendanceImage, type ProcessedAttendancePhoto } from "./imageProcessing";

export class PersonalPhotoStampError extends Error {
  constructor(readonly code: "LOCATION_REQUIRED" | "CAPTURE_EXPIRED" | "ADDRESS_REQUIRED", message: string) {
    super(message);
    this.name = "PersonalPhotoStampError";
  }
}

export async function preparePersonalAttendancePhoto(photo: ProcessedAttendancePhoto, capture: { capturedAtClient: string; intendedType: AttendanceType }, location?: AttendanceCoordinates, retryAddress = false): Promise<{ photo: ProcessedAttendancePhoto; stamp: AttendancePhotoStampMetadata }> {
  if (!location || ![location.latitude, location.longitude, location.accuracy].every(Number.isFinite) || Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
    throw new PersonalPhotoStampError("LOCATION_REQUIRED", "Chưa có GPS. Ảnh được giữ lại; bật quyền vị trí rồi bấm Thử lại và ghi nhận.");
  }
  if (!Number.isFinite(Date.parse(capture.capturedAtClient)) || !Number.isFinite(Date.parse(location.capturedAt)) || Math.abs(Date.parse(location.capturedAt) - Date.parse(capture.capturedAtClient)) > 60_000) {
    throw new PersonalPhotoStampError("CAPTURE_EXPIRED", "Vị trí không còn khớp thời điểm chụp. Chụp lại ảnh để ghi đúng thời gian và địa điểm.");
  }
  const address = await lookupAttendanceAddress(location, { retry: retryAddress, priority: true });
  if (address.status !== "resolved" || !address.address?.trim()) {
    throw new PersonalPhotoStampError("ADDRESS_REQUIRED", "Chưa lấy được địa chỉ từ GPS. Ảnh chưa được gửi; kiểm tra mạng rồi bấm Thử lại và ghi nhận.");
  }
  const stamp: AttendancePhotoStampMetadata = { version: 1, capturedAt: capture.capturedAtClient, address: address.address.trim(), latitude: location.latitude, longitude: location.longitude };
  const stamped = await processAttendanceImage(new File([photo.photo], "attendance.jpg", { type: "image/jpeg" }), { ...stamp, label: `CHÂU TUẤN · ${capture.intendedType === "check_in" ? "CHẤM VÀO" : "CHẤM RA"}` });
  return { photo: stamped, stamp };
}
