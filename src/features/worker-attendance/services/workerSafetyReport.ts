import type { WorkerAttendanceSession, WorkerSafetyReport } from "../types/workerAttendanceTypes";

export const standardSafetyBriefing = [
  "Tuân thủ quy trình an toàn khi làm việc trên các cẩu, shiploader.",
  "Tuân thủ quy trình an toàn về AT-MT-5S-PCCC trong thi công."
] as const;

export function createWorkerSafetyReport(): WorkerSafetyReport {
  return { contractorName: "Châu Tuấn", supervisorCount: 1, briefing: standardSafetyBriefing.map(content => ({ content, checked: false })), healthStatus: "Tốt", workArea: "" };
}

export function manpowerCounts(session: Pick<WorkerAttendanceSession, "entries" | "safetyReport">) {
  const workers = session.entries.filter(entry => entry.isSelected !== false && (entry.status === "present" || entry.status === "late")).length;
  const supervisors = session.safetyReport?.supervisorCount ?? 1;
  return { workers, supervisors, total: workers + supervisors };
}

export function validateWorkerSafetyReport(report: WorkerSafetyReport | undefined, workNote?: string): string[] {
  if (!report) return [];
  const errors: string[] = [];
  if (!report.briefing.length || report.briefing.some(item => !item.content.trim() || !item.checked)) errors.push("Xác nhận đầy đủ nội dung phổ biến an toàn.");
  if (!workNote?.trim()) errors.push("Nhập nội dung công việc.");
  if (!report.healthStatus.trim()) errors.push("Chọn tình trạng sức khỏe nhân viên.");
  if (!report.workArea.trim()) errors.push("Nhập khu vực làm việc.");
  return errors;
}

export function formatWorkerSafetyReport(session: Pick<WorkerAttendanceSession, "date" | "entries" | "safetyReport" | "workNote">) {
  const report = session.safetyReport;
  if (!report) return "";
  const counts = manpowerCounts(session);
  return [
    `Báo cáo nhân lực nhà thầu ${report.contractorName} ngày ${session.date.split("-").reverse().join("-")}`,
    `- Nhân lực: ${counts.total} người (${counts.workers} CN, ${counts.supervisors} GS)`,
    "- Phổ biến an toàn, 5S, quy định:",
    ...report.briefing.map(item => `+ ${item.content.trim()}`),
    `- Nội dung công việc: ${session.workNote?.trim() || "Chưa nhập"}`,
    `- Tình trạng sức khỏe nhân viên: ${report.healthStatus.trim() || "Chưa xác nhận"}`,
    `- Khu vực làm việc: ${report.workArea.trim() || "Chưa nhập"}`
  ].join("\n");
}
