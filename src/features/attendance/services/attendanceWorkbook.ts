import ExcelJS from "exceljs";
import type { AttendanceEvent } from "../types/attendanceTypes";
import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { sanitizeSpreadsheetCell } from "@/lib/security/filePolicy";
import { formatBusinessDate } from "@/lib/time/timezone";
import { addAttendanceOverview, finishPlainAttendanceSheet, type AttendanceExportEmployee } from "./attendanceWorkbookOverview";

export interface AttendanceCalculatedRow {
  periodName: string; employeeCode: string; employeeName: string; workDate: string;
  checkIn?: string; checkOut?: string; workMinutes: number; workFraction: number;
  status: string; note?: string; overtimeMinutes?: number; pendingOvertimeMinutes?: number; rainPauseMinutes?: number; arrivalLateMinutes?: number;
  lateMinutes?: number; earlyLeaveMinutes?: number; periodId?: string; periodStatus?: string; computedAt?: string;
}
export interface AttendanceAdjustmentRow {
  periodName: string; employeeCode: string; employeeName: string; workDate: string;
  type: string; effectiveTime?: string; workFraction?: number; reason: string; createdAt: string;
}
const text = (value?: string) => sanitizeSpreadsheetCell(value ?? "");
const timestamp = (value?: string) => value ? new Intl.DateTimeFormat("vi-VN", {timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(new Date(value)) : "";
export async function generateAttendanceWorkbook(input: {month:string; baseUrl:string; events:AttendanceEvent[]; sessions:WorkerAttendanceSession[]; calculated:AttendanceCalculatedRow[]; adjustments:AttendanceAdjustmentRow[]; employees?: AttendanceExportEmployee[]}): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  addAttendanceOverview(book, input);
  const adjustments=book.addWorksheet("Lịch sử điều chỉnh");
  adjustments.addRow(["Kỳ công","Ngày công","Mã NV","Họ tên","Loại điều chỉnh","Giờ bổ sung","Số công điều chỉnh","Lý do","Thời gian ghi nhận"]);
  const adjustmentLabels:Record<string,string>={add_missing_check_in:"Bổ sung giờ vào",add_missing_check_out:"Bổ sung giờ ra",adjust_effective_time:"Sửa giờ hiệu lực",mark_leave:"Ghi nhận nghỉ phép",mark_business_trip:"Ghi nhận công tác",correct_status:"Sửa trạng thái",correct_work_fraction:"Điều chỉnh công",note_only:"Ghi chú",other:"Khác"};
  for(const item of input.adjustments.filter(row=>row.workDate.startsWith(`${input.month}-`))) adjustments.addRow([text(item.periodName),formatBusinessDate(item.workDate),text(item.employeeCode),text(item.employeeName),adjustmentLabels[item.type]??text(item.type),timestamp(item.effectiveTime),item.workFraction??"",text(item.reason),timestamp(item.createdAt)]);
  adjustments.columns=[28,16,20,30,24,26,20,60,26].map(width=>({width}));
  finishPlainAttendanceSheet(adjustments);
  return Buffer.from(await book.xlsx.writeBuffer());
}
