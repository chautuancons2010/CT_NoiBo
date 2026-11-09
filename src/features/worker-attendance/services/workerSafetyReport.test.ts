import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type { WorkerAttendanceSession } from "../types/workerAttendanceTypes";
import { createWorkerSafetyReport, formatWorkerSafetyReport, manpowerCounts, validateWorkerSafetyReport } from "./workerSafetyReport";
import { generateWorkerAttendanceExcel } from "./workerAttendanceExcel";

function fixture(): WorkerAttendanceSession {
  return {
    id: "session", clientSessionId: "client-session", projectId: "project", worksiteId: "worksite", shiftCode: "DAY", sessionType: "morning",
    supervisorEmployeeId: "supervisor", startedAt: "2026-11-09T00:00:00Z", capturedAtClient: "2026-11-09T00:00:00Z", geofenceStatus: "not_required", status: "submitted", syncStatus: "synced", photoStatus: "uploaded", version: 1, selectionMode: true, checklist: [], checklistResponses: [], adjustments: [],
    date: "2026-11-09", projectName: "Gói SC05", worksiteName: "Cẩu SC05", shiftName: "Ca ngày", supervisorName: "Giám sát A", safetyConfirmed: true, photos: [],
    entries: Array.from({ length: 6 }, (_, index) => ({ id: String(index), sessionId: "session", workerId: String(index), workerName: `Công nhân ${index}`, employeeCode: `CN${index}`, isSelected: index < 5, status: "present", assignmentRole: "worker", dayException: "none", isUnplanned: false })),
    safetyReport: { ...createWorkerSafetyReport(), briefing: createWorkerSafetyReport().briefing.map(item => ({ ...item, checked: true })), workArea: "SC05" }, workNote: "Thay bu lông, sơn cẩu"
  };
}

describe("supervisor manpower and safety report", () => {
  it("counts only selected attendees and includes the supervisor", () => {
    expect(manpowerCounts(fixture())).toEqual({ workers: 5, supervisors: 1, total: 6 });
  });
  it("formats the supplied report with Vietnam date, briefing, health and work area", () => {
    const text = formatWorkerSafetyReport(fixture());
    expect(text).toContain("Báo cáo nhân lực nhà thầu Châu Tuấn ngày 09-11-2026");
    expect(text).toContain("Nhân lực: 6 người (5 CN, 1 GS)");
    expect(text).toContain("AT-MT-5S-PCCC");
    expect(text).toContain("Tình trạng sức khỏe nhân viên: Tốt");
    expect(text).toContain("Khu vực làm việc: SC05");
  });
  it("never preconfirms briefing and requires actual work and location", () => {
    const report = createWorkerSafetyReport();
    expect(report.briefing.every(item => !item.checked)).toBe(true);
    expect(report.workArea).toBe("");
    expect(validateWorkerSafetyReport(report, "")).toEqual(["Xác nhận đầy đủ nội dung phổ biến an toàn.", "Nhập nội dung công việc.", "Nhập khu vực làm việc."]);
    expect(validateWorkerSafetyReport(fixture().safetyReport, fixture().workNote)).toEqual([]);
  });
  it("exports the complete report without changing per-worker clock columns", async () => {
    const bytes = await generateWorkerAttendanceExcel([fixture()], "2026-11");
    const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes as never);
    const reports = book.getWorksheet("Báo cáo nhân lực")!;
    expect(reports.getCell("E2").value).toBe(6);
    expect(reports.getCell("F2").value).toBe(5);
    expect(reports.getCell("G2").value).toBe(1);
    expect(reports.getCell("I2").value).toBe("Thay bu lông, sơn cẩu");
    expect(reports.getCell("K2").value).toBe("SC05");
    expect(book.getWorksheet("Chấm công công trường")!.getCell("J3").value).toBe("Giờ vào");
  });
});
