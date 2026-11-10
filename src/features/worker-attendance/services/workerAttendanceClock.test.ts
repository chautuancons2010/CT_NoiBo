import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { workerClock, workerClockLabel } from "./workerAttendanceClock";
import { generateWorkerAttendanceExcel } from "./workerAttendanceExcel";
import type { WorkerAttendanceEntry, WorkerAttendanceSession } from "../types/workerAttendanceTypes";

const entry = { id: "1", workerId: "worker", employeeCode: "CN01", workerName: "Công nhân A", status: "present", isSelected: true, checkedInAt: "2026-11-09T00:00:00Z", checkedOutAt: "2026-11-09T10:00:00Z" } as WorkerAttendanceEntry;
describe("worker time and Excel", () => {
  it("uses actual clocks and the HR shift break", () => {
    expect(workerClock(entry, { shiftBreakMinutes: 120 })).toMatchObject({ presenceMinutes: 600, breakMinutes: 120, workMinutes: 480 });
    expect(workerClockLabel(entry.checkedInAt)).toContain("07:00:00");
  });
  it("leaves hours empty until checkout is observed", () => {
    expect(workerClock({ ...entry, checkedOutAt: undefined }, { shiftBreakMinutes: 120 })).toMatchObject({ complete: false, workMinutes: undefined });
  });
  it("includes midnight work without a negative duration", () => {
    expect(workerClock({ ...entry, checkedInAt: "2026-11-09T15:00:00Z", checkedOutAt: "2026-11-10T01:00:00Z" }, { shiftBreakMinutes: 60 }).workMinutes).toBe(540);
  });
  it("exports selected workers, actual in/out, work hours and totals", async () => {
    const session = { id: "session-1", status: "submitted", date: "2026-11-09", projectName: "Gói A", worksiteName: "Công trường A", shiftName: "Ca ngày", shiftStart: "07:00", shiftEnd: "17:00", shiftBreakMinutes: 120, supervisorName: "Giám sát A", safetyConfirmed: true, photos: [{ id: "photo-1", capturedAt: "2026-11-09T00:00:00Z", address: "12 Đường A, TP.HCM" }], entries: [entry, { ...entry, id: "2", workerId: "not-selected", isSelected: false }] } as WorkerAttendanceSession;
    const bytes = await generateWorkerAttendanceExcel([session], "2026-11");
    const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes as never);
    const sheet = book.getWorksheet("Chấm công công trường")!;
    expect(sheet.rowCount).toBe(4);
    expect(sheet.getCell("J4").value).toContain("07:00:00");
    expect(sheet.getCell("K4").value).toContain("17:00:00");
    expect(sheet.getCell("N4").value).toBe(8);
    expect(book.getWorksheet("Tổng hợp công nhân")!.getCell("E2").value).toBe(8);
    expect(book.getWorksheet("Bảng dấu công")!.getCell("K3").value).toBe("X");
    expect(book.getWorksheet("Ảnh theo ngày")!.rowCount).toBe(2);
  });
  it("keeps one shared photo set while marking each selected worker", async () => {
    const session = { id: "session-1", status: "submitted", date: "2026-11-09", projectName: "Gói A", worksiteName: "Khu A", shiftName: "Ca ngày", photos: [1, 2].map(index => ({ id: `photo-${index}`, capturedAt: "2026-11-09T00:00:00Z", address: "SC05" })), entries: [entry, { ...entry, id: "2", workerId: "second", employeeCode: "CN02", workerName: "Công nhân B", dayException: "half_day" }] } as WorkerAttendanceSession;
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await generateWorkerAttendanceExcel([session], "2026-11") as never);
    expect(book.getWorksheet("Chấm công công trường")!.rowCount).toBe(5);
    expect(book.getWorksheet("Bảng dấu công")!.getCell("K3").value).toBe("X");
    expect(book.getWorksheet("Bảng dấu công")!.getCell("K4").value).toBe("½");
    expect(book.getWorksheet("Ảnh theo ngày")!.rowCount).toBe(3);
  });
  it("does not turn an unsent draft into confirmed Excel attendance", async () => {
    const draft = { id: "draft", status: "in_progress", date: "2026-11-09", entries: [entry], photos: [] } as unknown as WorkerAttendanceSession;
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await generateWorkerAttendanceExcel([draft], "2026-11") as never);
    expect(book.getWorksheet("Chấm công công trường")!.rowCount).toBe(3);
    expect(book.getWorksheet("Bảng dấu công")!.rowCount).toBe(2);
  });
});
