export type WorkerEntryStatus = "unconfirmed" | "present" | "absent" | "leave" | "late" | "transferred";
export type WorkerSessionStatus = "draft" | "in_progress" | "submitted" | "locked" | "needs_review";
export type OvertimeCheckpoint = "start" | "middle" | "end";
export interface WorkerWorkEvent { id: string; batchId?: string; evidencePending?: boolean; entryId: string; eventType: "start" | "pause" | "resume" | "finish"; effectiveAt: string; reason: string; }

export interface WorkerAttendanceChecklistItem {
  id: string;
  group: string;
  content: string;
  required: boolean;
  sortOrder: number;
}

export interface WorkerAttendanceChecklistResponse {
  itemId: string;
  checked: boolean;
  note?: string;
}

export interface WorkerAttendanceEntry {
  workEvents?: WorkerWorkEvent[];
  id: string;
  sessionId: string;
  workerId: string;
  employeeCode: string;
  workerName: string;
  assignmentRole: string;
  status: WorkerEntryStatus;
  isSelected?: boolean;
  checkedInAt?: string;
  checkedOutAt?: string;
  exceptionReason?: "approved_leave" | "unapproved" | "unknown" | "other_worksite" | "other";
  dayException: "none" | "early_leave" | "transferred" | "half_day" | "overtime" | "left_worksite";
  exceptionTime?: string;
  isUnplanned: boolean;
  unplannedReason?: string;
  note?: string;
}

export interface WorkerAttendancePhoto {
  purpose?: "rain_pause";
  workBatchId?: string;
  accuracy?: number;
  checkpoint?: OvertimeCheckpoint;
  evidenceStatus?: "available" | "expired";
  address?: string;
  latitude?: number;
  longitude?: number;
  id: string;
  sessionId: string;
  capturedAt: string;
  sortOrder: number;
}

export interface WorkerAttendanceAdjustment {
  id: string;
  entryId?: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string;
}

export interface WorkerSafetyReport {
  contractorName: string;
  supervisorCount: number;
  briefing: Array<{ content: string; checked: boolean }>;
  healthStatus: string;
  workArea: string;
}

export interface WorkerAttendanceSession {
  allowedAccuracyThresholdMeters?: number;
  id: string;
  clientSessionId: string;
  projectId: string;
  projectName: string;
  worksiteId: string;
  worksiteName: string;
  worksiteAddress?: string;
  date: string;
  shiftCode: string;
  shiftName: string;
  shiftStart?: string;
  shiftEnd?: string;
  shiftBreakMinutes?: number;
  sessionType: "morning" | "end_of_day" | "overtime";
  overtimeStatus?: "recording" | "pending" | "confirmed" | "rejected";
  overtimeDayType?: "working_day" | "rest_day" | "holiday";
  overtimeConsentConfirmed?: boolean;
  overtimeReviewNote?: string;
  overtimeRecordingMode?: "time_entry";
  shiftScheduleRules?: import("@/features/timesheets/types/timesheetTypes").ShiftScheduleRules;
  supervisorEmployeeId: string;
  supervisorName: string;
  startedAt: string;
  submittedAt?: string;
  dayClosedAt?: string;
  capturedAtClient: string;
  geofenceStatus: "valid" | "outside" | "accuracy_low" | "unavailable" | "not_required";
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  accuracyMeters?: number;
  workNote?: string;
  note?: string;
  status: WorkerSessionStatus;
  syncStatus: "local_pending" | "syncing" | "synced" | "sync_failed";
  photoStatus: "not_required" | "pending_upload" | "uploading" | "uploaded" | "upload_failed";
  version: number;
  selectionMode?: boolean;
  safetyConfirmed?: boolean;
  safetyReport?: WorkerSafetyReport;
  minimumPhotos?: number;
  entries: WorkerAttendanceEntry[];
  photos: WorkerAttendancePhoto[];
  adjustments: WorkerAttendanceAdjustment[];
  checklist: WorkerAttendanceChecklistItem[];
  checklistResponses: WorkerAttendanceChecklistResponse[];
}

export interface WorkerAttendanceTask {
  isWorkingDay?: boolean;
  calendarDayType?: string;
  shiftStart?: string;
  shiftEnd?: string;
  shiftBreakMinutes?: number;
  shiftScheduleRules?: import("@/features/timesheets/types/timesheetTypes").ShiftScheduleRules;
  projectId: string;
  projectName: string;
  worksiteId: string;
  worksiteName: string;
  date: string;
  shiftCode: string;
  shiftName: string;
  expectedWorkers: number;
  gpsRequired?: boolean;
  allowedAccuracyThresholdMeters?: number;
  existingSessionId?: string;
  existingStatus?: WorkerSessionStatus;
  checklist: WorkerAttendanceChecklistItem[];
  roster: Array<{
    workerId: string;
    employeeCode: string;
    workerName: string;
    assignmentRole: string;
    approvedLeave?: { requestId: string; requestNumber: string; leaveTypeName: string; dayPart: string };
  }>;
}

export interface WorkerAttendanceCounts {
  total: number;
  present: number;
  absent: number;
  leave: number;
  late: number;
  transferred: number;
  unconfirmed: number;
  unplanned: number;
}

export interface WorkerAttendancePolicy {
  minimumPhotos: number;
  workNoteRequired: boolean;
  endOfDayRequired: boolean;
  offlineEnabled: boolean;
  editWindowMinutes: number;
}
