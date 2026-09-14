import ExcelJS from "exceljs";
import type { Permission } from "@/lib/auth/permissions";
import { allowedFields, type ReportField } from "./reportFieldRegistry";
import type { ReportTemplate } from "../types/timesheetTypes";
import { sanitizeSpreadsheetCell } from "@/lib/security/filePolicy";

type RecordRow = Record<string, unknown>;

const sheetPermission: Record<string, Permission> = {
  daily: "timesheet.export_detail",
  events: "attendance.raw.view",
  leave: "leave.export",
  balance: "leave.export",
  ledger: "leave.export"
};

const localizedValues: Record<string, string> = {
  full_work: "Đủ công",
  late: "Đi trễ",
  early_leave: "Về sớm",
  missing_check_in: "Thiếu chấm vào",
  missing_check_out: "Thiếu chấm ra",
  annual_leave: "Phép năm",
  unpaid_leave: "Nghỉ không lương",
  absent: "Vắng",
  business_trip: "Công tác",
  holiday: "Ngày lễ",
  rest_day: "Ngày nghỉ",
  worker_site: "Điểm danh công trường",
  needs_review: "Cần xem xét",
  check_in: "Chấm vào",
  check_out: "Chấm ra",
  approved: "Đã duyệt",
  pending: "Chờ duyệt",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
  active: "Đang làm việc",
  inactive: "Ngừng hoạt động",
  terminated: "Đã nghỉ việc",
  probation: "Thử việc",
  pending_onboarding: "Chờ nhận việc",
  inside: "Trong vùng",
  outside: "Ngoài vùng",
  unknown: "Chưa xác định",
  verified: "Đã xác minh",
  missing: "Thiếu",
  SELF_ATTENDANCE: "Tự chấm công",
  SUPERVISOR_ROSTER: "Điểm danh đội",
  APPROVED_LEAVE: "Nghỉ đã duyệt",
  MANUAL_ADJUSTMENT: "HR điều chỉnh",
  SYSTEM_CALENDAR: "Lịch làm việc",
  grant: "Cấp phép",
  deduction: "Khấu trừ",
  adjustment: "Điều chỉnh",
  carry_over: "Chuyển phép",
  expiry: "Hết hạn",
  hired: "Tiếp nhận",
  profile_updated: "Cập nhật hồ sơ",
  department_changed: "Chuyển phòng ban",
  position_changed: "Đổi chức danh"
};

function localize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => localize(item)).join(", ");
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value !== "string") return value;
  return localizedValues[value] ?? value;
}

function cellValue(field: ReportField, value: unknown): ExcelJS.CellValue {
  if (field.format === "status" || field.format === "boolean") return sanitizeSpreadsheetCell(localize(value)) as ExcelJS.CellValue;
  if (Array.isArray(value)) return sanitizeSpreadsheetCell(value.join(", ")) as ExcelJS.CellValue;
  if ((field.format === "date" || field.format === "datetime") && typeof value === "string" && value) {
    const parsed = new Date(field.format === "date" ? `${value}T00:00:00Z` : value);
    return Number.isNaN(parsed.getTime()) ? sanitizeSpreadsheetCell(value) as ExcelJS.CellValue : parsed;
  }
  if (field.format === "link" && typeof value === "string" && value) {
    return { text: "Mở ảnh", hyperlink: value, tooltip: "Ảnh chấm công" };
  }
  return sanitizeSpreadsheetCell(value ?? "") as ExcelJS.CellValue;
}

export async function generateReportWorkbook(input: {
  template: ReportTemplate;
  permissions: readonly Permission[];
  data: Record<string, RecordRow[]>;
  title: string;
  generatedAt?: Date;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Châu Tuấn";
  workbook.created = input.generatedAt ?? new Date();
  workbook.modified = input.generatedAt ?? new Date();

  for (const sheetDefinition of input.template.definition.sheets.filter((sheet) => sheet.enabled)) {
    const required = sheetPermission[sheetDefinition.key];
    if (required && !input.permissions.includes(required)) continue;
    const fields = allowedFields(sheetDefinition.key, input.permissions, sheetDefinition.columns);
    if (!fields.length) continue;

    const sheet = workbook.addWorksheet(sheetDefinition.name.slice(0, 31), {
      views: input.template.definition.freezeHeader ? [{ state: "frozen", ySplit: 2 }] : undefined
    });
    sheet.mergeCells(1, 1, 1, fields.length);
    const title = sheet.getCell(1, 1);
    title.value = input.title;
    title.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    title.alignment = { vertical: "middle" };
    sheet.getRow(1).height = 26;

    const header = sheet.getRow(2);
    header.values = fields.map((field) => field.label);
    header.font = { bold: true, color: { argb: "FF17202E" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F5F3" } };
    header.alignment = { vertical: "middle" };

    fields.forEach((field, index) => {
      const column = sheet.getColumn(index + 1);
      column.width = field.width ?? Math.max(12, field.label.length + 3);
      if (field.format === "date") column.numFmt = "dd/mm/yyyy";
      if (field.format === "datetime") column.numFmt = "dd/mm/yyyy hh:mm";
      if (field.format === "decimal") column.numFmt = "0.00";
    });

    for (const source of input.data[sheetDefinition.key] ?? []) {
      const row = sheet.addRow(fields.map((field) => cellValue(field, source[field.key])));
      row.alignment = { vertical: "top" };
      fields.forEach((field, index) => {
        const cell = row.getCell(index + 1);
        if (["reason", "hrNote", "value"].includes(field.key)) cell.alignment = { vertical: "top", wrapText: true };
        if (field.format === "link" && cell.value) cell.font = { color: { argb: "FF0563C1" }, underline: true };
      });
    }

    if (input.template.definition.autoFilter) {
      sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: fields.length } };
    }
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) row.eachCell((cell) => {
        cell.border = { bottom: { style: "hair", color: { argb: "FFD9DEE5" } } };
      });
    });
  }

  if (!workbook.worksheets.length) throw new Error("Mẫu xuất không có trang tính hợp lệ.");
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
