import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { generateReportWorkbook } from "./excelGenerator";
import type { ReportTemplate } from "../types/timesheetTypes";

function template(sheets: ReportTemplate["definition"]["sheets"], reportType: ReportTemplate["reportType"] = "timesheet"): ReportTemplate {
  return {
    id: "t",
    code: "TEST",
    name: "Test",
    reportType,
    version: 1,
    active: true,
    definition: { freezeHeader: true, autoFilter: true, sheets }
  };
}

async function load(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return workbook;
}

describe("Excel report", () => {
  it("tạo liên kết ảnh ổn định, định dạng và dữ liệu dễ đọc", async () => {
    const buffer = await generateReportWorkbook({
      template: template([{ key: "events", name: "Sự kiện", enabled: true }]),
      permissions: ["attendance.raw.view", "attendance.photo.view"],
      title: "Báo cáo",
      generatedAt: new Date("2026-09-11T00:00:00Z"),
      data: { events: [{ employeeCode: "NV01", employeeName: "An", attendanceDate: "2026-09-10", eventType: "check_in", effectiveAt: "2026-09-10T01:00:00Z", geofenceStatus: "inside", photoStatus: "verified", photoUrl: "https://example.test/attendance/photos/id" }] }
    });
    const sheet = (await load(buffer)).getWorksheet("Sự kiện")!;
    expect(sheet.views[0]?.state).toBe("frozen");
    expect(sheet.autoFilter).toBeTruthy();
    expect(sheet.getRow(3).getCell(4).value).toBe("Chấm vào");
    expect(sheet.getRow(3).getCell(7).value).toBe("Trong vùng");
    expect(sheet.getRow(3).getCell(9).value).toMatchObject({ hyperlink: "https://example.test/attendance/photos/id" });
    expect(sheet.getRow(3).getCell(9).font.underline).toBe(true);
  });

  it("lọc cột ảnh khi thiếu quyền và áp dụng thứ tự, nhãn cột của mẫu", async () => {
    const buffer = await generateReportWorkbook({
      template: template([{ key: "events", name: "Sự kiện", enabled: true, columns: [
        { key: "eventType", label: "Loại chấm", enabled: true, order: 0 },
        { key: "photoUrl", label: "Ảnh", enabled: true, order: 1 },
        { key: "employeeCode", label: "Nhân viên", enabled: true, order: 2 },
        { key: "effectiveAt", label: "Thời gian", enabled: false, order: 3 }
      ] }]),
      permissions: ["attendance.raw.view"],
      title: "Báo cáo",
      data: { events: [{ employeeCode: "NV01", eventType: "check_out", photoUrl: "https://example.test/private" }] }
    });
    const sheet = (await load(buffer)).getWorksheet("Sự kiện")!;
    expect(sheet.getRow(2).values).toEqual([undefined, "Loại chấm", "Nhân viên"]);
    expect(sheet.getRow(3).values).toEqual([undefined, "Chấm ra", "NV01"]);
  });

  it("loại dữ liệu nhạy cảm khỏi báo cáo cơ bản", async () => {
    const data = { employees: [{ employeeCode: "NV01", fullName: "An", joinDate: "2026-09-01", employmentStatus: "active", personalPhone: "0900000000", currentAddress: "Địa chỉ riêng" }] };
    const basic = await load(await generateReportWorkbook({
      template: template([{ key: "employees", name: "Nhân sự", enabled: true }], "employee_list"),
      permissions: ["employee.export_basic"],
      title: "Nhân sự",
      data
    }));
    const sensitive = await load(await generateReportWorkbook({
      template: template([{ key: "employees", name: "Nhân sự", enabled: true }], "employee_list"),
      permissions: ["employee.export_sensitive"],
      title: "Nhân sự",
      data
    }));
    expect(basic.getWorksheet("Nhân sự")!.getRow(2).values).not.toContain("Điện thoại");
    expect(sensitive.getWorksheet("Nhân sự")!.getRow(2).values).toContain("Điện thoại");
    expect(basic.getWorksheet("Nhân sự")!.getRow(3).values).not.toContain("0900000000");
  });

  it("xuất tập dữ liệu lớn mà không nhúng ảnh", async () => {
    const summary = Array.from({ length: 3000 }, (_, index) => ({
      employeeCode: `NV${index.toString().padStart(5, "0")}`,
      employeeName: `Nhân viên ${index}`,
      scheduledWorkdays: 26,
      actualWorkdays: 25.5,
      workedMinutes: 12240,
      exceptionCount: 0
    }));
    const buffer = await generateReportWorkbook({
      template: template([{ key: "summary", name: "Tổng hợp", enabled: true }]),
      permissions: ["timesheet.export"],
      title: "Bảng công lớn",
      data: { summary }
    });
    const workbook = await load(buffer);
    expect(workbook.getWorksheet("Tổng hợp")!.rowCount).toBe(3002);
    expect(workbook.model.media).toHaveLength(0);
    expect(buffer.byteLength).toBeLessThan(2_000_000);
  }, 15_000);
});
