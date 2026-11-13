import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import { hasHumanResourcesReleaseAccess, hasUnrestrictedReleaseAccess } from "@/config/featureRelease";
import type { WorkerAttendancePhoto } from "../types/workerAttendanceTypes";

export const overtimeCheckpointLabels = { start: "Đầu giờ", middle: "Giữa giờ", end: "Cuối giờ" } as const;
export const overtimeStatusLabels = { recording: "Đang tăng ca", pending: "Chờ xác nhận", confirmed: "Đã xác nhận", rejected: "Không xác nhận" } as const;
export function nextOvertimeCheckpoint(photos: readonly Pick<WorkerAttendancePhoto,"checkpoint">[]) {
  return (["start","middle","end"] as const).find(checkpoint => !photos.some(photo => photo.checkpoint === checkpoint)) ?? "end";
}
export function canReviewOvertime(user: AuthenticatedUser) {
  return hasUnrestrictedReleaseAccess(user.roleCodes) || hasHumanResourcesReleaseAccess(user.roleCodes) && (can(user.permissions, "timesheet.adjust") || can(user.permissions, "attendance.manage") || can(user.permissions,"attendance.view_all"));
}
export function overtimeEvidenceComplete(photos: readonly Pick<WorkerAttendancePhoto, "checkpoint" | "capturedAt">[]) {
  const times = (checkpoint: WorkerAttendancePhoto["checkpoint"]) => photos.filter(photo => photo.checkpoint === checkpoint).map(photo => Date.parse(photo.capturedAt)).filter(Number.isFinite);
  const start = times("start"), middle = times("middle"), end = times("end");
  return Boolean(start.length && middle.length && end.length && Math.min(...start) < Math.min(...middle) && Math.min(...middle) < Math.max(...end));
}
