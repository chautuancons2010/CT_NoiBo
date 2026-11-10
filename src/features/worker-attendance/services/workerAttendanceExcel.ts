import ExcelJS from "exceljs";

import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { sanitizeSpreadsheetCell } from "@/lib/security/filePolicy";
import { workerClock, workerClockLabel } from "./workerAttendanceClock";
import { manpowerCounts } from "./workerSafetyReport";

const statusLabels: Record<string, string> = {
  present: "Có mặt",
  late: "Đi muộn",
  absent: "Vắng",
  leave: "Nghỉ",
  transferred: "Điều chuyển",
  unconfirmed: "Chưa xác nhận"
};

export async function generateWorkerAttendanceExcel(allSessions: WorkerAttendanceSession[], month: string, baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000"): Promise<Buffer> {
  const sessions = allSessions.filter(session => Boolean(session.submittedAt) || session.status === "submitted" || session.status === "locked");
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
  for (const session of sessions) {
    for (const entry of session.entries.filter(entry => entry.isSelected !== false)) {
      const clock = workerClock(entry, session);
      const item = totals.get(entry.workerId) ?? { code: entry.employeeCode, name: entry.workerName, days: new Set<string>(), minutes: 0, incomplete: 0 };
      item.days.add(session.date); item.minutes += clock.workMinutes ?? 0; if (!clock.complete) item.incomplete++;
      totals.set(entry.workerId, item);
      const mark = marks.get(entry.workerId) ?? { code: entry.employeeCode, name: entry.workerName, dates: new Map<string, number>() };
      const fraction = entry.status === "present" || entry.status === "late" ? entry.dayException === "half_day" ? .5 : 1 : 0;
      mark.dates.set(session.date, Math.max(mark.dates.get(session.date) ?? 0, fraction));
      marks.set(entry.workerId, mark);
      const workerRow = sheet.addRow([
        session.date,
        sanitizeSpreadsheetCell(session.projectName),
        sanitizeSpreadsheetCell(session.worksiteName),
        sanitizeSpreadsheetCell(entry.employeeCode),
        sanitizeSpreadsheetCell(entry.workerName),
        statusLabels[entry.status] ?? entry.status,
        sanitizeSpreadsheetCell(session.shiftName),
        session.shiftStart ?? "", session.shiftEnd ?? "",
        workerClockLabel(entry.checkedInAt), workerClockLabel(entry.checkedOutAt),
        clock.presenceMinutes ?? "", clock.breakMinutes ?? "", clock.workMinutes === undefined ? "" : Number((clock.workMinutes / 60).toFixed(2)),
        sanitizeSpreadsheetCell(session.supervisorName),
        session.photos.length,
        sanitizeSpreadsheetCell(session.photos.find(photo => photo.address)?.address ?? session.worksiteAddress ?? ""),
        session.safetyConfirmed ? "Đã xác nhận" : "Chưa xác nhận",
        clock.complete ? "Đủ giờ vào / ra" : !entry.checkedInAt ? "Thiếu giờ vào" : "Chưa chốt giờ ra",
        sanitizeSpreadsheetCell(entry.note ?? "")
      ]);
      workerRow.getCell(16).value = { text: `${session.photos.length} ảnh minh chứng`, hyperlink: new URL(`/worker-attendance/sessions/${session.id}`, baseUrl).href };
      workerRow.getCell(16).font = { color: { argb: "FF0563C1" }, underline: true };
    }
  }
  sheet.columns = Array.from({length: 20}, (_, i) => ({ width: [1,2,4,16,19].includes(i) ? 30 : [9,10].includes(i) ? 23 : 17 }));
  sheet.getRow(3).font = { bold: true };
  sheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F7F8" } };
  sheet.getColumn(14).numFmt = "0.00";
  sheet.autoFilter = { from: "A3", to: "T3" };
  const summary = workbook.addWorksheet("Tổng hợp công nhân");
  summary.addRow(["Mã NV", "Họ tên", "Số ngày điểm danh", "Phút làm việc", "Tổng giờ công", "Phiên thiếu giờ"]);
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
  const evidence = workbook.addWorksheet("Ảnh theo phiên");
  evidence.addRow(["Mã phiên", "Ngày", "Gói", "Công trường", "Giám sát", "Số công nhân", "Ảnh", "Thời gian chụp", "Địa chỉ", "GPS"]);
  for (const session of sessions) for (const [index, photo] of session.photos.entries()) {
    const row = evidence.addRow([session.id, session.date, sanitizeSpreadsheetCell(session.projectName), sanitizeSpreadsheetCell(session.worksiteName), sanitizeSpreadsheetCell(session.supervisorName), session.entries.filter(entry => entry.isSelected !== false && (entry.status === "present" || entry.status === "late")).length, index + 1, workerClockLabel(photo.capturedAt), sanitizeSpreadsheetCell(photo.address ?? ""), photo.latitude !== undefined && photo.longitude !== undefined ? `${photo.latitude}, ${photo.longitude}` : ""]);
    row.getCell(7).value = { text: photo.evidenceStatus === "expired" ? "Đã hết hạn 45 ngày" : `Xem ảnh ${index + 1}`, hyperlink: new URL(`/worker-attendance/sessions/${session.id}?photo=${encodeURIComponent(photo.id)}`, baseUrl).href };
    row.getCell(7).font = { color: { argb: "FF0563C1" }, underline: true };
  }
  evidence.columns = [36, 16, 30, 30, 28, 18, 10, 26, 60, 30].map(width => ({ width }));
  evidence.getRow(1).font = { bold: true };
  evidence.autoFilter = "A1:J1";
  const reports = workbook.addWorksheet("Báo cáo nhân lực");
  reports.addRow(["Ngày", "Nhà thầu", "Gói", "Công trường", "Tổng nhân lực", "Công nhân", "Giám sát", "Phổ biến an toàn, 5S, quy định", "Nội dung công việc", "Tình trạng sức khỏe", "Khu vực làm việc", "Xác nhận an toàn", "Người báo cáo"]);
  for (const session of sessions.filter(item => item.safetyReport)) {
    const report = session.safetyReport!;
    const counts = manpowerCounts(session);
    reports.addRow([session.date, sanitizeSpreadsheetCell(report.contractorName), sanitizeSpreadsheetCell(session.projectName), sanitizeSpreadsheetCell(session.worksiteName), counts.total, counts.workers, counts.supervisors, sanitizeSpreadsheetCell(report.briefing.map(item => item.content).join("\n")), sanitizeSpreadsheetCell(session.workNote ?? ""), sanitizeSpreadsheetCell(report.healthStatus), sanitizeSpreadsheetCell(report.workArea), session.safetyConfirmed ? "Đã xác nhận" : "Chưa xác nhận", sanitizeSpreadsheetCell(session.supervisorName)]);
  }
  reports.columns = Array.from({ length: 13 }, (_, index) => ({ width: [7,8].includes(index) ? 60 : [4,5,6].includes(index) ? 16 : 26 }));
  reports.getRow(1).font = { bold: true };
  reports.getColumn(8).alignment = { wrapText: true, vertical: "top" };
  reports.getColumn(9).alignment = { wrapText: true, vertical: "top" };
  reports.autoFilter = "A1:M1";
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
