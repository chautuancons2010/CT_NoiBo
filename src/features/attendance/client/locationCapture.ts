import type { AttendanceCoordinates } from "@/features/attendance/types/attendanceTypes";

type LocationFailure = "denied" | "timeout" | "unavailable" | "unsupported" | "insecure" | "accuracy_low";
const messages: Record<LocationFailure, string> = {
  denied: "Chưa có quyền vị trí. Bật quyền vị trí cho trang này trong trình duyệt.",
  timeout: "Chưa lấy được GPS. Kiểm tra dịch vụ vị trí của thiết bị và thử lại.",
  unavailable: "Thiết bị chưa xác định được vị trí. Bật dịch vụ vị trí và thử lại.",
  unsupported: "Trình duyệt này không hỗ trợ GPS.",
  insecure: "GPS cần kết nối HTTPS.",
  accuracy_low: "Vị trí chưa đủ chính xác. Bật vị trí chính xác, di chuyển ra khu vực thoáng và thử lại."
};

export class AttendanceLocationError extends Error {
  constructor(public readonly code: LocationFailure) {
    super(messages[code]);
    this.name = "AttendanceLocationError";
  }
}

interface LocationCaptureOptions {
  maxWaitMs?: number;
  signal?: AbortSignal;
  targetAccuracyMeters?: number;
  onPosition?: (position: AttendanceCoordinates) => void;
}

// Start device GPS independently of Wi-Fi / navigator.onLine. A coarse fix can be
// displayed while GNSS refines it. Never substitute office or worksite coordinates.
export async function captureAttendanceLocation(geolocation: Geolocation | undefined, secureContext: boolean, options: LocationCaptureOptions = {}): Promise<AttendanceCoordinates> {
  if (!secureContext) throw new AttendanceLocationError("insecure");
  if (!geolocation) throw new AttendanceLocationError("unsupported");
  if (options.signal?.aborted) throw new DOMException("Location capture cancelled", "AbortError");

  return new Promise((resolve, reject) => {
    let best: AttendanceCoordinates | undefined;
    let finished = false;
    let watchId: number | undefined;
    const target = Math.max(1, options.targetAccuracyMeters ?? 30);
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      if (watchId !== undefined) geolocation.clearWatch(watchId);
      options.signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else if (best) resolve(best);
      else reject(new AttendanceLocationError("timeout"));
    };
    const abort = () => finish(new DOMException("Location capture cancelled", "AbortError"));
    const maximumWait = options.maxWaitMs ?? 12_000;
    const deadline = setTimeout(() => finish(), maximumWait);
    const receive = (position: GeolocationPosition) => {
      if (finished) return;
      const { latitude, longitude, accuracy } = position.coords;
      if (![latitude, longitude, accuracy, position.timestamp].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) return;
      // Some WebKit providers expose seconds or microseconds. Convert units
      // only when the reported instant is fresh; never replace it with now.
      const timestamp = [position.timestamp, position.timestamp / 1000, position.timestamp * 1000].find(value => Date.now() - value <= 15_000 && Date.now() - value >= -5_000);
      if (timestamp === undefined) return;
      if (best && Date.now() - Date.parse(best.capturedAt) <= 15_000 && accuracy >= best.accuracy) return;
      best = { latitude, longitude, accuracy, capturedAt: new Date(timestamp).toISOString() };
      options.onPosition?.(best);
      if (accuracy <= target) finish();
    };
    const failed = (error: GeolocationPositionError) => {
      // A network-positioning error must not cancel a still-starting GPS fix.
      if (error.code === 1) finish(new AttendanceLocationError("denied"));
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) { abort(); return; }
    try {
      if (typeof geolocation.watchPosition === "function") {
        watchId = geolocation.watchPosition(receive, failed, { enableHighAccuracy: true, maximumAge: 0, timeout: Math.min(10_000, maximumWait) });
        if (finished) { geolocation.clearWatch(watchId); return; }
      } else {
        geolocation.getCurrentPosition(receive, failed, { enableHighAccuracy: true, maximumAge: 0, timeout: Math.min(10_000, maximumWait) });
      }
      if (!finished && typeof geolocation.watchPosition === "function") geolocation.getCurrentPosition(receive, failed, { enableHighAccuracy: true, maximumAge: 0, timeout: Math.min(10_000, maximumWait) });
    } catch (error) {
      finish(error instanceof DOMException && error.name === "NotAllowedError" ? new AttendanceLocationError("denied") : new AttendanceLocationError("unavailable"));
    }
  });
}
