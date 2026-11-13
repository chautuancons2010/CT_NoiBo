import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { attendanceOverviewDays, addAttendanceOverview } from "./attendanceWorkbookOverview";
const row={periodId:"p",periodName:"Tháng 11",employeeCode:"CN01",employeeName:"Công nhân A",workDate:"2026-11-10",status:"late",workMinutes:420,workFraction:.875,rainPauseMinutes:45,overtimeMinutes:120,pendingOvertimeMinutes:60,lateMinutes:15,computedAt:"2026-11-11T00:00:00Z"};
const input={month:"2026-11",events:[],sessions:[],calculated:[row,{...row,employeeCode:"GS01",employeeName:"Giám sát A",rainPauseMinutes:0,workMinutes:480}],employees:[{code:"CN01",name:"Công nhân A",category:"worker"},{code:"GS01",name:"Giám sát A",category:"supervisor"},{code:"CN02",name:"Chưa có dữ liệu",category:"worker",joinDate:"2026-11-10"}]};
describe("attendance export reading views",()=>{
 it("counts a day once across overlapping period snapshots and prefers the latest computation",()=>{
  const days=attendanceOverviewDays({...input,calculated:[{...row,periodId:"old",workMinutes:60,computedAt:"2026-11-09T00:00:00Z"},row]});
  expect(days).toHaveLength(1);expect(days[0].minutes).toBe(420);
 });
 it("gives the locked snapshot precedence over a newer open calculation",()=>{
  const days=attendanceOverviewDays({...input,calculated:[{...row,periodStatus:"locked",workMinutes:360,computedAt:"2026-11-09T00:00:00Z"},row]});
  expect(days[0].minutes).toBe(360);
 });
 it("exports plain separate summaries and daily details without treating unknown days as absence",async()=>{
  const original=new ExcelJS.Workbook();addAttendanceOverview(original,input);
  const book=new ExcelJS.Workbook();await book.xlsx.load(await original.xlsx.writeBuffer() as never);
  expect(book.worksheets.map(s=>s.name)).toEqual(["Bảng công công nhân","Chi tiết công nhân","Bảng công giám sát","Chi tiết giám sát"]);
  const workers=book.getWorksheet("Bảng công công nhân")!,supervisors=book.getWorksheet("Bảng công giám sát")!;
  expect(workers.getCell("E2").value).toBe(7);expect(workers.getCell("F2").value).toBe(2);expect(workers.getCell("G2").value).toBe(1);expect(workers.getCell("H2").value).toBe(.75);expect(workers.getCell("M2").value).toBe(15);
  expect(workers.getCell("B3").value).toBe("Chưa có dữ liệu");expect(workers.getCell("K3").value).toBe(0);
  expect(supervisors.getCell("E2").value).toBe(8);
  expect(supervisors.getRow(1).values).not.toContain("Nghỉ mưa (giờ)");
  for(const sheet of book.worksheets) sheet.eachRow(r=>r.eachCell(c=>expect(c.fill?.type === "pattern" && c.fill.pattern === "solid").toBe(false)));
  const detail=book.getWorksheet("Chi tiết công nhân")!;
  const rows=detail.getSheetValues().filter(Array.isArray) as unknown[][];
  expect(rows.some(r=>r[1]==="CN02"&&r[3]==="10/11/2026"&&r[14]==="Chưa có dữ liệu")).toBe(true);
 });
 it("excludes office staff even if a legacy session contains their code",()=>{
  const days=attendanceOverviewDays({...input,employees:[...input.employees,{code:"CN01",name:"Văn phòng",category:"office"}]});
  expect(days.find(d=>d.code==="CN01")?.group).toBe("other");
 });
});
