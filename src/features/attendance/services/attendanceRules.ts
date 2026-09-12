import type {
  AttendanceCoordinates,
  AttendanceEvent,
  AttendanceLocation,
  AttendancePolicy,
  AttendanceType,
  PendingAttendanceItem
} from "@/features/attendance/types/attendanceTypes";

const EARTH_RADIUS_METERS = 6_371_000;

function radians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceInMeters(
  first: Pick<AttendanceCoordinates, "latitude" | "longitude">,
  second: Pick<AttendanceLocation, "latitude" | "longitude">
): number {
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const latitudeA = radians(first.latitude);
  const latitudeB = radians(second.latitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export interface LocationMatch {
  location?: AttendanceLocation;
  distanceMeters?: number;
  status: "valid" | "outside" | "accuracy_low" | "unavailable" | "not_required";
}

export function matchAttendanceLocation(
  coordinates: AttendanceCoordinates | undefined,
  locations: readonly AttendanceLocation[],
  policy: AttendancePolicy
): LocationMatch {
  if (!policy.gpsRequired) return { status: "not_required" };
  if (!coordinates) return { status: "unavailable" };
  if (coordinates.accuracy > policy.allowedAccuracyThresholdMeters) {
    return { status: "accuracy_low" };
  }

  const nearest = locations
    .filter((location) => location.active)
    .map((location) => ({ location, distanceMeters: distanceInMeters(coordinates, location) }))
    .sort((first, second) => first.distanceMeters - second.distanceMeters)[0];

  if (!nearest) return { status: "outside" };
  return {
    ...nearest,
    status: nearest.distanceMeters <= nearest.location.radiusMeters ? "valid" : "outside"
  };
}

export function getNextAttendanceAction(events: readonly Pick<AttendanceEvent, "eventType">[]): AttendanceType | "completed" {
  const hasCheckIn = events.some((event) => event.eventType === "check_in");
  const hasCheckOut = events.some((event) => event.eventType === "check_out");
  if (!hasCheckIn) return "check_in";
  if (!hasCheckOut) return "check_out";
  return "completed";
}

export function retryDelayMilliseconds(retryCount: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.min(Math.max(retryCount, 0), 6));
}

export function itemsOwnedBy(
  items: readonly PendingAttendanceItem[],
  accountId: string
): PendingAttendanceItem[] {
  return items.filter((item) => item.ownerAccountId === accountId);
}
