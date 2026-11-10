import ExcelJS from "exceljs";

import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { sanitizeSpreadsheetCell } from "@/lib/security/filePolicy";
import { workerClockLabel } from "./workerAttendanceClock";
import { aggregateWorkerDay } from "./workerAttendanceDay";

const statusLabels: Record<string, string> = {
  present: "Có mặt",
  late: "Đi muộn",
  absent: "Vắng",
  leave: "Nghỉ",
  transferred: "Điều chuyển",
  unconfirmed: "Chưa xác nhận"
};

export function buildWorkerAttendanceWorkbook(allSessions: WorkerAttendanceSession[], month: string, baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000"): ExcelJS.Workbook {
  const sessions = allSessions.filter(session => session.date.startsWith(`${month}-`) && (Boolean(session.submittedAt) || session.status === "submitted" || session.status === "locked"));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Châu Tuấn ERP";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Chấm công công trường", { views: [{ state: "frozen", ySplit: 3 }] });
  sheet.mergeCells("A1:T1");
  sheet.getCell("A1").value = `BẢNG CHẤM CÔNG CÔNG TRƯỜNG ${month}`;
  sheet.getCell("A1").font = { bold: true, size: 15 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.addRow([]);
  sheet.addRow(["Ngày", "Gói", "Công trường", "Mã NV", "Họ tên", "Trạng thái", "Ca", "Ca bắt đầu", "Ca kết thúc", "Giờ vào", "Giờ ra", "Hiện diện (phút)", "Nghỉ theo ca (phút)", "Giờ công", "Giám sát", "Ảnh", "Địa chỉ ảnh", "An toàn", "Trạng thái giờ", "Ghi chú"]);
  const totals = new Map<string, { code: string; name: string; days: Set<string>; minutes: number; incomplete: number }>();
  const marks = new Map<string, { code: string; name: string; dates: Map<string, number> }>();
  type Observation = WorkerAttendanceSession["entries"][number] & { session: WorkerAttendanceSession; date: string; breakMinutes: number; observedAt: string };
  const rounds = new Map<string, Observation[]>();
  for (const session of sessions) for (const entry of session.entries.filter(entry => entry.isSelected !== false)) {
    const key = `${entry.workerId}:${session.date}`;
    rounds.set(key, [...(rounds.get(key) ?? []), { ...entry, sessionId: session.id, session, date: session.date, breakMinutes: session.shiftBreakMinutes ?? 0, observedAt: session.startedAt }]);
  }
  const join = (values: Array<string | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))].join(" · ");
  for (const observations of [...rounds.values()].sort((a,b) => a[0].date.localeCompare(b[0].date) || a[0].employeeCode.localeCompare(b[0].employeeCode))) {
    const daily = aggregateWorkerDay(observations)!;
    const group = [...new Map(observations.map(item => [item.session.id, item.session])).values()];
    const photos = [...new Map(group.flatMap(session => session.photos).map(photo => [photo.id, photo])).values()];
    const item = totals.get(daily.workerId) ?? { code: daily.employeeCode, name: daily.workerName, days: new Set<string>(), minutes: 0, incomplete: 0 };
    if (daily.workFraction > 0) { item.days.add(daily.date); if (!daily.complete) item.incomplete++; }
    item.minutes += daily.workMinutes;
    totals.set(daily.workerId, item);
    const mark = marks.get(daily.workerId) ?? { code: daily.employeeCode, name: daily.workerName, dates: new Map<string, number>() };
    mark.dates.set(daily.date, daily.workFraction);
    marks.set(daily.workerId, mark);
    const row = sheet.addRow([
      daily.date, sanitizeSpreadsheetCell(join(group.map(session => session.projectName))),
      sanitizeSpreadsheetCell(join(group.map(session => session.worksiteName))),
      sanitizeSpreadsheetCell(daily.employeeCode), sanitizeSpreadsheetCell(daily.workerName), statusLabels[daily.status] ?? daily.status,
      sanitizeSpreadsheetCell(join(group.map(session => session.shiftName))), join(group.map(session => session.shiftStart)), join(group.map(session => session.shiftEnd)),
      workerClockLabel(daily.checkedInAt), workerClockLabel(daily.checkedOutAt), daily.presenceMinutes, daily.breakMinutes,
      daily.complete || daily.presenceMinutes > 0 ? Number((daily.workMinutes / 60).toFixed(2)) : "",
      sanitizeSpreadsheetCell(join(group.map(session => session.supervisorName))), photos.length,
      sanitizeSpreadsheetCell(join(photos.map(photo => photo.address).concat(group.map(session => session.worksiteAddress)))),
      group.every(session => session.safetyConfirmed) ? "Đã xác nhận" : "Chưa xác nhận",
      daily.complete ? "Đủ giờ vào / ra" : !daily.checkedInAt ? "Thiếu giờ vào" : "Chưa đủ giờ vào / ra",
      sanitizeSpreadsheetCell(join(observations.map(item => item.note)))
    ]);
    row.getCell(16).value = { text: `${photos.length} ảnh · ${group.length} lượt`, hyperlink: new URL(`/worker-attendance/sessions/${daily.session.id}`, baseUrl).href };
    row.getCell(16).font = { color: { argb: "FF0563C1" }, underline: true };
  }
  sheet.columns = Array.from({length: 20}, (_, i) => ({ width: [1,2,4,16,19].includes(i) ? 30 : [9,10].includes(i) ? 23 : 17 }));
  sheet.getRow(3).font = { bold: true };
  sheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F7F8" } };
  sheet.getColumn(14).numFmt = "0.00";
  sheet.autoFilter = { from: "A3", to: "T3" };
  const summary = workbook.addWorksheet("Tổng hợp công nhân");
  summary.addRow(["Mã NV", "Họ tên", "Số ngày điểm danh", "Phút làm việc", "Tổng giờ công", "Ngày thiếu giờ"]);
  for (const item of totals.values()) summary.addRow([sanitizeSpreadsheetCell(item.code), sanitizeSpreadsheetCell(item.name), item.days.size, item.minutes, Number((item.minutes / 60).toFixed(2)), item.incomplete]);
  summary.columns = [{width:18},{width:30},{width:22},{width:22},{width:22},{width:22}];
  summary.getRow(1).font = { bold: true };
  summary.autoFilter = "A1:F1";
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const matrix = workbook.addWorksheet("Bảng dấu công", { views: [{ state: "frozen", xSplit: 2, ySplit: 2 }] });
  matrix.addRow([`BẢNG DẤU CÔNG ${month} · X: Có mặt · ½: Nửa ngày · —: Chưa ghi công`]);
  matrix.addRow(["Mã NV", "Họ tên", ...Array.from({ length: days }, (_, day) => day + 1), "Tổng công"]);
  for (const item of marks.values()) {
    const fractions = Array.from({ length: days }, (_, day) => item.dates.get(`${month}-${String(day + 1).padStart(2, "0")}`) ?? 0);
    matrix.addRow([sanitizeSpreadsheetCell(item.code), sanitizeSpreadsheetCell(item.name), ...fractions.map(value => value === 1 ? "X" : value === .5 ? "½" : "—"), fractions.reduce((total, value) => total + value, 0)]);
  }
  matrix.columns = [{ width: 18 }, { width: 30 }, ...Array.from({ length: days }, () => ({ width: 5 })), { width: 14 }];
  matrix.getRow(2).font = { bold: true };
  matrix.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: days + 3 } };
  const evidence = workbook.addWorksheet("Ảnh theo ngày");
  evidence.addRow(["Mã lượt", "Ngày", "Gói", "Công trường", "Giám sát", "Số công nhân", "Ảnh", "Thời gian chụp", "Địa chỉ", "GPS", "Công nhân và giờ theo lượt"]);
  for (const session of sessions) for (const [index, photo] of (session.photos.length ? session.photos : [undefined]).entries()) {
    const selected = session.entries.filter(entry => entry.isSelected !== false && (entry.status === "present" || entry.status === "late"));
    const row = evidence.addRow([session.id, session.date, sanitizeSpreadsheetCell(session.projectName), sanitizeSpreadsheetCell(session.worksiteName), sanitizeSpreadsheetCell(session.supervisorName), selected.length, photo ? index + 1 : "Không có ảnh", workerClockLabel(photo?.capturedAt), sanitizeSpreadsheetCell(photo?.address ?? ""), photo?.latitude !== undefined && photo.longitude !== undefined ? `${photo.latitude}, ${photo.longitude}` : "", sanitizeSpreadsheetCell(selected.map(entry => `${entry.employeeCode} · ${entry.workerName} · ${workerClockLabel(entry.checkedInAt) || "—"} → ${workerClockLabel(entry.checkedOutAt) || "—"}`).join("\n"))]);
    if (photo) row.getCell(7).value = { text: photo.evidenceStatus === "expired" ? "Đã hết hạn 45 ngày" : `Xem ảnh ${index + 1}`, hyperlink: new URL(`/worker-attendance/sessions/${session.id}?photo=${encodeURIComponent(photo.id)}`, baseUrl).href };
    row.getCell(7).font = { color: { argb: "FF0563C1" }, underline: true };
  }
  evidence.columns = [36, 16, 30, 30, 28, 18, 10, 26, 60, 30, 80].map(width => ({ width }));
  evidence.getColumn(11).alignment = { wrapText: true, vertical: "top" };
  evidence.getRow(1).font = { bold: true };
  evidence.autoFilter = "A1:K1";
  const reports = workbook.addWorksheet("Báo cáo nhân lực");
  reports.addRow(["Ngày", "Nhà thầu", "Gói", "Công trường", "Tổng nhân lực", "Công nhân", "Giám sát", "Phổ biến an toàn, 5S, quy định", "Nội dung công việc", "Tình trạng sức khỏe", "Khu vực làm việc", "Xác nhận an toàn", "Người báo cáo"]);
  const manpowerDays = new Map<string, WorkerAttendanceSession[]>();
  for (const session of sessions.filter(item => item.safetyReport)) { const key = `${session.date}:${session.projectId}:${session.worksiteId}`; manpowerDays.set(key, [...(manpowerDays.get(key) ?? []), session]); }
  for (const group of manpowerDays.values()) {
    group.sort((a,b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""));
    const session = group.at(-1)!, report = session.safetyReport!;
    const workers = new Set(group.flatMap(round => round.entries.filter(entry => entry.isSelected !== false && ["present", "late"].includes(entry.status)).map(entry => entry.workerId))).size;
    const supervisors = Math.max(new Set(group.map(round => round.supervisorEmployeeId)).size, ...group.map(round => round.safetyReport?.supervisorCount ?? 0));
    reports.addRow([session.date, sanitizeSpreadsheetCell(join(group.map(round => round.safetyReport?.contractorName))), sanitizeSpreadsheetCell(session.projectName), sanitizeSpreadsheetCell(session.worksiteName), workers + supervisors, workers, supervisors, sanitizeSpreadsheetCell(report.briefing.map(item => item.content).join("\n")), sanitizeSpreadsheetCell(join(group.map(round => round.workNote))), sanitizeSpreadsheetCell(join(group.map(round => round.safetyReport?.healthStatus))), sanitizeSpreadsheetCell(join(group.map(round => round.safetyReport?.workArea))), group.every(round => round.safetyConfirmed) ? "Đã xác nhận" : "Chưa xác nhận", sanitizeSpreadsheetCell(join(group.map(round => round.supervisorName)))]);
  }
  reports.columns = Array.from({ length: 13 }, (_, index) => ({ width: [7,8].includes(index) ? 60 : [4,5,6].includes(index) ? 16 : 26 }));
  reports.getRow(1).font = { bold: true };
  reports.getColumn(8).alignment = { wrapText: true, vertical: "top" };
  reports.getColumn(9).alignment = { wrapText: true, vertical: "top" };
  reports.autoFilter = "A1:M1";
  return workbook;
}

export async function generateWorkerAttendanceExcel(allSessions: WorkerAttendanceSession[], month: string, baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000"): Promise<Buffer> {
  return Buffer.from(await buildWorkerAttendanceWorkbook(allSessions, month, baseUrl).xlsx.writeBuffer());
}
