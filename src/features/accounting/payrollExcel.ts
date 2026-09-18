import ExcelJS from "exceljs";
import { sanitizeSpreadsheetCell } from "@/lib/security/filePolicy";
import type { PayrollDetail } from "./types";

export async function generatePayrollExcel(payroll: PayrollDetail): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Châu Tuấn ERP";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Bảng lương", { views: [{ state: "frozen", ySplit: 3 }] });
  sheet.mergeCells("A1:I1");
  sheet.getCell("A1").value = `BẢNG LƯƠNG ${payroll.periodMonth.slice(0, 7)}`;
  sheet.getCell("A1").font = { bold: true, size: 15 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.addRow([]);
  sheet.addRow(["Mã nhân viên", "Họ tên", "Ngày công", "Lương cơ bản", "Phụ cấp", "Thưởng", "Khấu trừ", "Thực nhận", "Trạng thái"]);
  for (const item of payroll.lines) sheet.addRow([sanitizeSpreadsheetCell(item.employeeCode), sanitizeSpreadsheetCell(item.employeeName), item.workDays, item.baseSalary, item.allowance, item.bonus, item.deduction, item.netSalary, payroll.status]);
  sheet.columns = [{ width: 16 }, { width: 28 }, { width: 13 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 16 }];
  sheet.getRow(3).font = { bold: true };
  sheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EAF5EE" } };
  for (let column = 4; column <= 8; column += 1) sheet.getColumn(column).numFmt = "#,##0 [$₫-vi-VN]";
  sheet.autoFilter = { from: "A3", to: "I3" };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
