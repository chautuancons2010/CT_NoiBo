import type ExcelJS from "exceljs";
import type { AttendanceEvent } from "../types/attendanceTypes";
import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { buildWorkerAttendanceWorkbook } from "@/features/worker-attendance/services/workerAttendanceExcel";
import { sanitizeSpreadsheetCell } from "@/lib/security/filePolicy";
import { formatBusinessDate } from "@/lib/time/timezone";

export interface AttendanceCalculatedRow {
  periodName: string; employeeCode: string; employeeName: string; workDate: string;
  checkIn?: string; checkOut?: string; workMinutes: number; workFraction: number;
  status: string; note?: string;
}
export interface AttendanceAdjustmentRow {
  periodName: string; employeeCode: string; employeeName: string; workDate: string;
  type: string; effectiveTime?: string; workFraction?: number; reason: string; createdAt: string;
}
const text = (value?: string) => sanitizeSpreadsheetCell(value ?? "");
const timestamp = (value?: string) => value ? new Intl.DateTimeFormat("vi-VN", {timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(new Date(value)) : "";
const statuses: Record<string,string> = {full_work:"Đủ công",late:"Đi muộn",early_leave:"Về sớm",missing_check_in:"Thiếu giờ vào",missing_check_out:"Thiếu giờ ra",annual_leave:"Nghỉ phép",unpaid_leave:"Nghỉ không lương",absent:"Vắng",business_trip:"Công tác",holiday:"Ngày lễ",rest_day:"Ngày nghỉ",worker_site:"Công trường",needs_review:"Cần rà soát"};

export async function generateAttendanceWorkbook(input: {month:string; baseUrl:string; events:AttendanceEvent[]; sessions:WorkerAttendanceSession[]; calculated:AttendanceCalculatedRow[]; adjustments:AttendanceAdjustmentRow[]}): Promise<Buffer> {
  const book = buildWorkerAttendanceWorkbook(input.sessions, input.month, input.baseUrl);
  const personal = book.addWorksheet("Công cá nhân");
  personal.addRow(["Ngày","Mã NV","Họ tên","Lượt chấm","Thời gian","Trạng thái","Ảnh","Địa chỉ ảnh","GPS","Đồng bộ"]);
  for (const event of input.events.filter(event=>event.attendanceDate.startsWith(`${input.month}-`))) {
    const row = personal.addRow([formatBusinessDate(event.attendanceDate),text(event.employeeCode),text(event.employeeName),event.eventType==="check_in"?"Chấm vào":"Chấm ra",timestamp(event.effectiveAt),event.attendanceStatus==="rejected"?"Từ chối":event.attendanceStatus==="needs_review"?"Cần rà soát":"Đã ghi nhận","",text(event.photoStamp?.address),event.latitude!==undefined&&event.longitude!==undefined?`${event.latitude}, ${event.longitude}`:"",event.syncStatus==="synced"?"Đã đồng bộ":"Chờ đồng bộ"]);
    if(event.photoId&&event.photoStatus==="uploaded") row.getCell(7).value={text:"Xem ảnh",hyperlink:new URL(`/attendance/records/${encodeURIComponent(event.id)}`,input.baseUrl).href};
    else row.getCell(7).value=event.photoStatus==="not_required"?"Không có ảnh":"Chờ ảnh";
  }
  personal.columns=[16,20,30,16,26,20,18,60,30,20].map(width=>({width}));
  const calculated = book.addWorksheet("Công sau điều chỉnh");
  calculated.addRow(["Kỳ công","Ngày","Mã NV","Họ tên","Giờ vào hiệu lực","Giờ ra hiệu lực","Giờ công","Số công","Trạng thái","Ghi chú nhân sự"]);
  for(const item of input.calculated.filter(row=>row.workDate.startsWith(`${input.month}-`))) calculated.addRow([text(item.periodName),formatBusinessDate(item.workDate),text(item.employeeCode),text(item.employeeName),timestamp(item.checkIn),timestamp(item.checkOut),Number((item.workMinutes/60).toFixed(2)),item.workFraction,statuses[item.status]??text(item.status),text(item.note)]);
  calculated.columns=[28,16,20,30,26,26,14,14,22,50].map(width=>({width}));
  calculated.getColumn(7).numFmt="0.00";
  const adjustments=book.addWorksheet("Lịch sử điều chỉnh");
  adjustments.addRow(["Kỳ công","Ngày công","Mã NV","Họ tên","Loại điều chỉnh","Giờ bổ sung","Số công điều chỉnh","Lý do","Thời gian ghi nhận"]);
  const adjustmentLabels:Record<string,string>={add_missing_check_in:"Bổ sung giờ vào",add_missing_check_out:"Bổ sung giờ ra",adjust_effective_time:"Sửa giờ hiệu lực",mark_leave:"Ghi nhận nghỉ phép",mark_business_trip:"Ghi nhận công tác",correct_status:"Sửa trạng thái",correct_work_fraction:"Điều chỉnh công",note_only:"Ghi chú",other:"Khác"};
  for(const item of input.adjustments.filter(row=>row.workDate.startsWith(`${input.month}-`))) adjustments.addRow([text(item.periodName),formatBusinessDate(item.workDate),text(item.employeeCode),text(item.employeeName),adjustmentLabels[item.type]??text(item.type),timestamp(item.effectiveTime),item.workFraction??"",text(item.reason),timestamp(item.createdAt)]);
  adjustments.columns=[28,16,20,30,24,26,20,60,26].map(width=>({width}));
  for(const sheet of book.worksheets) finishSheet(sheet);
  return Buffer.from(await book.xlsx.writeBuffer());
}

function finishSheet(sheet: ExcelJS.Worksheet) {
  const header=sheet.name==="Chấm công công trường"?3:sheet.name==="Bảng dấu công"?2:1;
  sheet.views=[{state:"frozen",ySplit:header,...(sheet.name==="Bảng dấu công"?{xSplit:2}:{})}];
  sheet.getRow(header).font={name:"Arial",bold:true,color:{argb:"FFFFFFFF"},size:11};
  sheet.getRow(header).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF146C54"}};
  sheet.getRow(header).height=32;
  sheet.getRow(header).alignment={vertical:"middle",wrapText:true};
  sheet.autoFilter={from:{row:header,column:1},to:{row:header,column:sheet.columnCount}};
  sheet.eachRow((row,index)=>{if(index<=header)return;row.font={name:"Arial",size:11};row.alignment={vertical:"top",wrapText:true};if(index%2===0)row.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF1F7F5"}};row.eachCell(cell=>{if(cell.hyperlink)cell.font={name:"Arial",size:11,color:{argb:"FF0563C1"},underline:true};});});
}
