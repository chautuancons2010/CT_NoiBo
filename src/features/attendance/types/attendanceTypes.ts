export type AttendanceType = "check_in" | "check_out";
export type AttendanceBusinessStatus = "recorded" | "rejected" | "needs_review";
export type AttendancePhotoStatus =
  | "not_required"
  | "pending_upload"
  | "uploading"
  | "uploaded"
  | "upload_failed";
export type AttendanceSyncStatus = "local_pending" | "syncing" | "synced" | "sync_failed";
export type AttendanceGeofenceStatus =
  | "valid"
  | "outside"
  | "accuracy_low"
  | "unavailable"
  | "not_required";

export interface AttendanceCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

export interface AttendanceLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: boolean;
}

export interface AttendancePolicy {
  id: string;
  name: string;
  attendanceEnabled: boolean;
  photoRequired: boolean;
  gpsRequired: boolean;
  offlineEnabled: boolean;
  allowedAccuracyThresholdMeters: number;
  earlyCheckinWindowMinutes: number;
  lateThresholdMinutes: number;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  timezone: string;
}

export interface AttendanceEvent {
  id: string;
  clientEventId: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  eventType: AttendanceType;
  attendanceDate: string;
  effectiveAt: string;
  capturedAtClient: string;
  receivedAtServer: string;
  locationId?: string;
  locationName?: string;
  accuracyMeters?: number;
  distanceMeters?: number;
  geofenceStatus: AttendanceGeofenceStatus;
  attendanceStatus: AttendanceBusinessStatus;
  photoStatus: AttendancePhotoStatus;
  syncStatus: AttendanceSyncStatus;
  photoId?: string;
  anomalyFlags: string[];
}

export interface AttendanceDashboard {
  accountId: string;
  employeeId: string;
  employeeName: string;
  policy: AttendancePolicy;
  locations: AttendanceLocation[];
  todayEvents: AttendanceEvent[];
  lastEvent?: AttendanceEvent;
  nextAction: AttendanceType | "completed";
  incompletePreviousDate?: string;
}

export interface AttendanceHistoryDay {
  date: string;
  checkIn?: AttendanceEvent;
  checkOut?: AttendanceEvent;
  status: "complete" | "missing_check_out" | "late" | "pending";
}

export interface AttendanceRecordInput {
  clientEventId: string;
  capturedAtClient: string;
  capturedOffline: boolean;
  location?: AttendanceCoordinates;
  deviceMetadata: {
    platform?: string;
    browser?: string;
    appVersion?: string;
  };
}

export interface AttendanceRecordResult {
  event: AttendanceEvent;
  idempotentReplay: boolean;
}

export interface PendingAttendanceItem extends AttendanceRecordInput {
  ownerAccountId: string;
  intendedType: AttendanceType;
  photo: Blob;
  thumbnail: Blob;
  photoWidth: number;
  photoHeight: number;
  createdAt: string;
  retryCount: number;
  lastErrorCategory?: string;
  syncState: AttendanceSyncStatus;
  serverEventId?: string;
  nextRetryAt?: string;
}
