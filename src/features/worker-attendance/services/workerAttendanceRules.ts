import type { WorkerAttendanceCounts, WorkerAttendanceEntry, WorkerAttendancePolicy } from "@/features/worker-attendance/types/workerAttendanceTypes";

export function countWorkerAttendance(entries: readonly WorkerAttendanceEntry[]): WorkerAttendanceCounts {
  const counts: WorkerAttendanceCounts = { total: entries.length, present: 0, absent: 0, leave: 0, late: 0, transferred: 0, unconfirmed: 0, unplanned: 0 };
  for (const entry of entries) {
    counts[entry.status] += 1;
    if (entry.isUnplanned) counts.unplanned += 1;
  }
  return counts;
}

export function validateSessionForSubmit(input: { entries: readonly WorkerAttendanceEntry[]; photoCount: number; workNote?: string; geofenceStatus: string }, policy: WorkerAttendancePolicy): string[] {
  const errors: string[] = [];
  if (input.entries.some((entry) => entry.status === "unconfirmed")) errors.push("Còn công nhân chưa xác nhận trạng thái.");
  if (input.photoCount < policy.minimumPhotos) errors.push(`Cần ít nhất ${policy.minimumPhotos} ảnh điểm danh.`);
  if (policy.workNoteRequired && !input.workNote?.trim()) errors.push("Cần nhập nội dung công việc.");
  if (input.geofenceStatus !== "valid" && input.geofenceStatus !== "not_required") errors.push("Vị trí điểm danh chưa hợp lệ.");
  return errors;
}

export function assignmentRangesOverlap(first: { startDate: string; endDate?: string; shiftStart: string; shiftEnd: string }, second: { startDate: string; endDate?: string; shiftStart: string; shiftEnd: string }) {
  const datesOverlap = first.startDate <= (second.endDate ?? "9999-12-31") && second.startDate <= (first.endDate ?? "9999-12-31");
  return datesOverlap && first.shiftStart < second.shiftEnd && second.shiftStart < first.shiftEnd;
}
