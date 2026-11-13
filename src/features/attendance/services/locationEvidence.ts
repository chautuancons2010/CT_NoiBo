export const MAX_ATTENDANCE_ACCURACY_METERS = 100;

export function attendanceAccuracyLimit(configured?: number) {
  return Number.isFinite(configured) ? Math.max(1, Math.min(MAX_ATTENDANCE_ACCURACY_METERS, configured!)) : MAX_ATTENDANCE_ACCURACY_METERS;
}

export function hasAccurateLocation(value: { latitude?: number; longitude?: number; accuracy?: number } | undefined, maximum = MAX_ATTENDANCE_ACCURACY_METERS): value is { latitude: number; longitude: number; accuracy: number } {
  return Boolean(value && typeof value.latitude === "number" && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
    && typeof value.longitude === "number" && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180
    && typeof value.accuracy === "number" && Number.isFinite(value.accuracy) && value.accuracy >= 0 && value.accuracy <= attendanceAccuracyLimit(maximum));
}
