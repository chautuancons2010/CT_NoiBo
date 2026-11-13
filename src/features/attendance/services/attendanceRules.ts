import type {
  AttendanceCoordinates,
  AttendanceEvent,
  AttendanceLocation,
  AttendancePolicy,
  AttendanceType,
  PendingAttendanceItem
} from "@/features/attendance/types/attendanceTypes";
import { getBusinessDateKey } from "@/lib/time/timezone";
import { arrivalLatenessMinutes, usesWorkforceAttendancePolicy } from "@/features/timesheets/services/workforceAttendancePolicy";

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
  if (!coordinates) return { status: policy.gpsRequired ? "unavailable" : "not_required" };

  const nearest = locations
    .filter((location) => location.active)
    .map((location) => ({ location, distanceMeters: distanceInMeters(coordinates, location) }))
    .sort((first, second) => first.distanceMeters - second.distanceMeters)[0];

  // Locations identify the nearest reference point. Attendance has no radius restriction.
  // A low accuracy reading remains evidence for HR review and never blocks attendance.
  return {
    ...nearest,
    status: coordinates.accuracy > policy.allowedAccuracyThresholdMeters ? "accuracy_low" : "valid"
  };
}

type SequenceEvent = Pick<AttendanceEvent, "eventType"> & Partial<Pick<AttendanceEvent, "effectiveAt" | "attendanceStatus">>;
function orderedAttendance(events: readonly SequenceEvent[]) {
  return events.filter(event => event.attendanceStatus !== "rejected").map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.effectiveAt && b.event.effectiveAt ? a.event.effectiveAt.localeCompare(b.event.effectiveAt) || a.index - b.index : a.index - b.index).map(item => item.event);
}

export function getNextAttendanceAction(events: readonly SequenceEvent[]): AttendanceType {
  return orderedAttendance(events).at(-1)?.eventType === "check_in" ? "check_out" : "check_in";
}

export function getAttendanceSequenceWarning(events: readonly SequenceEvent[], intendedType: AttendanceType): string | undefined {
  const latest = orderedAttendance(events).at(-1);
  if (latest?.eventType === intendedType) return intendedType === "check_in" ? "Lượt gần nhất đã chấm vào. Bạn đang chấm vào thêm lần nữa." : "Lượt gần nhất đã chấm ra. Bạn đang chấm ra thêm lần nữa.";
  if (!latest && intendedType === "check_out") return "Hôm nay chưa có lượt chấm vào. Bạn đang chấm ra.";
  return undefined;
}
export function attendanceActionBlocked(events: readonly SequenceEvent[], intendedType: AttendanceType): string | undefined {
  const accepted = orderedAttendance(events);
  if (accepted.at(-1)?.eventType === intendedType) return intendedType === "check_in" ? "Cần chấm ra trước khi bắt đầu lượt tiếp theo." : "Lượt gần nhất đã chấm ra.";
  if (intendedType === "check_out" && accepted.at(-1)?.eventType !== "check_in") return "Cần chấm vào trước khi chấm ra.";
  return undefined;
}

export function summarizeAttendanceIntervals<T extends Pick<AttendanceEvent, "eventType" | "effectiveAt" | "attendanceStatus">>(events: readonly T[]) {
  const ordered = orderedAttendance(events) as T[];
  let opened: typeof ordered[number] | undefined, workMinutes = 0, intervals = 0;
  for (const event of ordered) {
    if (event.eventType === "check_in") opened ??= event;
    else if (opened) { workMinutes += Math.max(0, Math.round((Date.parse(event.effectiveAt) - Date.parse(opened.effectiveAt)) / 60_000)); opened = undefined; intervals++; }
  }
  return { firstCheckIn: ordered.find(event => event.eventType === "check_in"), lastCheckOut: [...ordered].reverse().find(event => event.eventType === "check_out"), workMinutes, intervals, hasOpenCheckIn: Boolean(opened) };
}

export function retryDelayMilliseconds(retryCount: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.min(Math.max(retryCount, 0), 6));
}

export function getAttendanceLateMinutes(effectiveAt: string, policy: Pick<AttendancePolicy, "timezone" | "shiftStart" | "lateThresholdMinutes"> & Partial<Pick<AttendancePolicy,"isWorkingDay">>, attendanceDate = getBusinessDateKey(new Date(effectiveAt))): number {
  if (policy.isWorkingDay === false) return 0;
  if (usesWorkforceAttendancePolicy(attendanceDate)) return arrivalLatenessMinutes(attendanceDate, effectiveAt, policy.shiftStart);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: policy.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date(effectiveAt));
  const parts = Object.fromEntries(time.map((part) => [part.type, part.value]));
  const [hour, minute] = policy.shiftStart.split(":").map(Number);
  const elapsedSeconds = (Number(parts.hour) * 60 + Number(parts.minute) - hour * 60 - minute) * 60 + Number(parts.second);
  return elapsedSeconds > policy.lateThresholdMinutes * 60 ? Math.ceil(elapsedSeconds / 60) : 0;
}

export function itemsOwnedBy(
  items: readonly PendingAttendanceItem[],
  accountId: string
): PendingAttendanceItem[] {
  return items.filter((item) => item.ownerAccountId === accountId);
}
