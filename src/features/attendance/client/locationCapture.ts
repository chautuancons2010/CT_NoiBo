import type { AttendanceCoordinates } from "@/features/attendance/types/attendanceTypes";

type LocationFailure = "denied" | "timeout" | "unavailable" | "unsupported" | "insecure";

const messages: Record<LocationFailure, string> = {
  denied: "Chưa có quyền vị trí. Bật quyền vị trí cho trang này trong trình duyệt.",
  timeout: "GPS hết thời gian chờ. Kiểm tra vị trí của thiết bị và thử lại.",
  unavailable: "Thiết bị chưa xác định được vị trí. Bật dịch vụ vị trí và thử lại.",
  unsupported: "Trình duyệt này không hỗ trợ GPS.",
  insecure: "GPS cần kết nối HTTPS."
};

export class AttendanceLocationError extends Error {
  constructor(public readonly code: LocationFailure) {
    super(messages[code]);
    this.name = "AttendanceLocationError";
  }
}

function readPosition(geolocation: Geolocation, enableHighAccuracy: boolean): Promise<AttendanceCoordinates> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition((position) => {
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || !Number.isFinite(position.timestamp) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) {
        reject(new AttendanceLocationError("unavailable"));
        return;
      }
      resolve({ latitude, longitude, accuracy, capturedAt: new Date(position.timestamp).toISOString() });
    }, (error) => {
      reject(new AttendanceLocationError(error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable"));
    }, { enableHighAccuracy, timeout: enableHighAccuracy ? 12_000 : 8_000, maximumAge: 0 });
  });
}

export async function captureAttendanceLocation(geolocation: Geolocation | undefined, secureContext: boolean): Promise<AttendanceCoordinates> {
  if (!secureContext) throw new AttendanceLocationError("insecure");
  if (!geolocation) throw new AttendanceLocationError("unsupported");
  try {
    return await readPosition(geolocation, true);
  } catch (error) {
    if (error instanceof AttendanceLocationError && error.code === "denied") throw error;
    // Wi-Fi/network positioning can still provide coordinates when GPS cannot get a fix.
    return readPosition(geolocation, false);
  }
}
