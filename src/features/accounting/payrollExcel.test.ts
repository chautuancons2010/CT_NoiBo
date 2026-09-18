import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { generatePayrollExcel } from "./payrollExcel";

describe("generatePayrollExcel", () => {
  it("exports only the supplied payroll snapshot with safe spreadsheet cells", async () => {
    const bytes = await generatePayrollExcel({
      id: "period-1", periodMonth: "2026-09-01", status: "locked", rowVersion: 1,
      lineCount: 1, grossTotal: 15_000_000, deductionTotal: 500_000, netTotal: 14_500_000,
      updatedAt: "2026-09-16T00:00:00.000Z",
      lines: [{ id: "line-1", employeeId: "employee-1", employeeCode: "=NV001", employeeName: "Nguyễn Văn A", workDays: 22, baseSalary: 14_000_000, allowance: 1_000_000, bonus: 0, deduction: 500_000, netSalary: 14_500_000, rowVersion: 1 }]
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet("Bảng lương");
    expect(sheet?.getCell("A4").value).toBe("'=NV001");
    expect(sheet?.getCell("B4").value).toBe("Nguyễn Văn A");
    expect(sheet?.getCell("H4").value).toBe(14_500_000);
  });
});
