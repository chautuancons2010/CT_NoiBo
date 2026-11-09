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

export async function generateWorkerAttendanceExcel(sessions: WorkerAttendanceSession[], month: string): Promise<Buffer> {
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
  for (const session of sessions) {
    for (const entry of session.entries.filter(entry => entry.isSelected !== false)) {
      const clock = workerClock(entry, session);
      const item = totals.get(entry.workerId) ?? { code: entry.employeeCode, name: entry.workerName, days: new Set<string>(), minutes: 0, incomplete: 0 };
      item.days.add(session.date); item.minutes += clock.workMinutes ?? 0; if (!clock.complete) item.incomplete++;
      totals.set(entry.workerId, item);
      sheet.addRow([
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
