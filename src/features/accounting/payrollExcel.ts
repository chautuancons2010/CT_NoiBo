import ExcelJS from "exceljs";
import { sanitizeSpreadsheetCell } from "@/lib/security/filePolicy";
import type { PayrollDetail } from "./types";

const statusLabels = { draft: "Bản nháp", calculated: "Đã tính", reviewed: "Đã kiểm tra", locked: "Đã khóa", published: "Đã phát hành" };

export async function generatePayrollExcel(payroll: PayrollDetail): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Châu Tuấn ERP";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Bảng lương", {
    views: [{ state: "frozen", ySplit: 3, xSplit: 2 }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:3" }
  });
  sheet.mergeCells("A1:I1");
  const [year, month] = payroll.periodMonth.slice(0, 7).split("-");
  sheet.getCell("A1").value = `BẢNG LƯƠNG THÁNG ${month}/${year}`;
  sheet.getCell("A1").font = { name: "Arial", bold: true, size: 15 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.mergeCells("A2:I2");
  sheet.getCell("A2").value = `${statusLabels[payroll.status]} · Phiên bản ${payroll.rowVersion}`;
  sheet.addRow(["Mã nhân viên", "Họ tên", "Ngày công", "Lương cơ bản", "Phụ cấp", "Thưởng", "Khấu trừ", "Thực nhận", "Trạng thái"]);
  for (const item of payroll.lines) sheet.addRow([sanitizeSpreadsheetCell(item.employeeCode), sanitizeSpreadsheetCell(item.employeeName), item.workDays, item.baseSalary, item.allowance, item.bonus, item.deduction, item.netSalary, statusLabels[payroll.status]]);
  sheet.columns = [{ width: 16 }, { width: 28 }, { width: 13 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 16 }];
  sheet.getRow(3).font = { name: "Arial", bold: true };
  sheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF5EE" } };
  sheet.getRow(3).height = 30;
  sheet.getRow(3).alignment = { vertical: "middle", wrapText: true };
  sheet.getColumn(3).numFmt = "0.##";
  for (let column = 4; column <= 8; column += 1) sheet.getColumn(column).numFmt = '#,##0 "₫"';
  const lastDataRow = sheet.rowCount;
  const totals = sheet.addRow(["TỔNG CỘNG"]);
  const totalValues = [
    payroll.lines.reduce((sum, item) => sum + item.workDays, 0),
    payroll.lines.reduce((sum, item) => sum + item.baseSalary, 0),
    payroll.lines.reduce((sum, item) => sum + item.allowance, 0),
    payroll.lines.reduce((sum, item) => sum + item.bonus, 0),
    payroll.lines.reduce((sum, item) => sum + item.deduction, 0),
    payroll.lines.reduce((sum, item) => sum + item.netSalary, 0)
  ];
  totalValues.forEach((value, index) => {
    const column = index + 3;
    const letter = sheet.getColumn(column).letter;
    totals.getCell(column).value = payroll.lines.length ? { formula: `SUM(${letter}4:${letter}${lastDataRow})`, result: value } : 0;
  });
  totals.font = { name: "Arial", bold: true };
  totals.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF5EE" } };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    row.eachCell({ includeEmpty: true }, (cell) => { cell.border = { bottom: { style: "hair", color: { argb: "FFD9DEE5" } } }; });
  });
  sheet.autoFilter = { from: "A3", to: `I${lastDataRow}` };
  sheet.addRow([]);
  sheet.addRow(["Người lập", "", "", "Nhân sự", "", "", "Phê duyệt"]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
