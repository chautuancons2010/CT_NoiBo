import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { generateAttendanceWorkbook } from "./attendanceWorkbook";
import type { AttendanceEvent } from "../types/attendanceTypes";
import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";

const event={id:"event-1",employeeId:"employee-1",employeeCode:"GS01",employeeName:"Giám sát A",eventType:"check_in",attendanceDate:"2026-11-10",effectiveAt:"2026-11-10T00:00:00Z",attendanceStatus:"recorded",photoStatus:"uploaded",photoId:"photo-personal",syncStatus:"synced",photoStamp:{address:"Khu A"}} as AttendanceEvent;
const session={id:"session-1",date:"2026-11-10",status:"submitted",projectName:"Gói A",worksiteName:"Khu A",shiftName:"Ca ngày",supervisorName:"Giám sát A",entries:[{id:"entry-1",workerId:"worker-1",employeeCode:"CN01",workerName:"Công nhân A",status:"present",isSelected:true},{id:"entry-2",workerId:"worker-2",employeeCode:"CN02",workerName:"Công nhân B",status:"present",isSelected:true}],photos:[{id:"site-1",capturedAt:"2026-11-10T00:01:00Z"},{id:"site-2",capturedAt:"2026-11-10T00:02:00Z"}]} as WorkerAttendanceSession;
const input={month:"2026-11",baseUrl:"https://erp.example.com",events:[event],sessions:[session],calculated:[{periodName:"Tháng 11",employeeCode:"GS01",employeeName:"Giám sát A",workDate:"2026-11-10",checkIn:"2026-11-10T00:00:00Z",checkOut:"2026-11-10T10:00:00Z",workMinutes:480,workFraction:1,status:"full_work"}],adjustments:[{periodName:"Tháng 11",employeeCode:"GS01",employeeName:"Giám sát A",workDate:"2026-11-10",type:"add_missing_check_out",effectiveTime:"2026-11-10T10:00:00Z",reason:"Bổ sung giờ ra thực tế",createdAt:"2026-11-10T11:00:00Z"}]};
describe("HR consolidated attendance workbook",()=>{
  it("counts overlapping worker rounds once in the daily and monthly totals", async () => {
    const first = { ...session, shiftBreakMinutes: 60, entries: [{ ...session.entries[0], checkedInAt: "2026-11-10T01:00:00Z", checkedOutAt: "2026-11-10T10:00:00Z" }] };
    const second = { ...first, id: "session-2", entries: [{ ...first.entries[0], checkedInAt: "2026-11-10T03:00:00Z" }] };
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await generateAttendanceWorkbook({ ...input, sessions: [first, second] }) as never);
    const summary = book.getWorksheet("Bảng công công nhân")!;
    expect(summary.getCell("C2").value).toBe(1);
    expect(summary.getCell("E2").value).toBe(8);
    const daily = book.getWorksheet("Chi tiết công nhân")!;
    const recorded = daily.getSheetValues().find(row => Array.isArray(row) && row[3] === "10/11/2026") as unknown[];
    expect(recorded[7]).toBe(8);
  });
  it("combines personal events, worker attendance, shared evidence and effective HR adjustments in one file",async()=>{
    const book=new ExcelJS.Workbook();await book.xlsx.load(await generateAttendanceWorkbook(input) as never);
    expect(book.worksheets.map(s=>s.name)).toEqual(["Bảng công công nhân","Chi tiết công nhân","Bảng công giám sát","Chi tiết giám sát","Lịch sử điều chỉnh"]);
    expect(book.worksheets.every(s=>s.state==="visible")).toBe(true);
    expect(book.getWorksheet("Lịch sử điều chỉnh")?.getCell("H2").value).toBe("Bổ sung giờ ra thực tế");
    expect(book.worksheets.every(sheet=>sheet.views[0]?.state==="frozen")).toBe(true);
  });
  it("excludes unsent sessions and other months, and escapes spreadsheet formulas",async()=>{
    const book=new ExcelJS.Workbook();await book.xlsx.load(await generateAttendanceWorkbook({...input,calculated:[],employees:[{code:"GS01",name:"=HYPERLINK(\"https://example.invalid\")",category:"supervisor"}],events:[{...event,employeeName:"=HYPERLINK(\"https://example.invalid\")"},{...event,attendanceDate:"2026-10-31"}],sessions:[{...session,status:"in_progress"},{...session,date:"2026-10-31"}]}) as never);
    expect(book.getWorksheet("Bảng công giám sát")?.getCell("B2").value).toMatch(/^'/);
    expect(book.getWorksheet("Bảng công công nhân")?.rowCount).toBe(1);
  });
});
