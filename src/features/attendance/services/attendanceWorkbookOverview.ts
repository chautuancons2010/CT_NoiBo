import type ExcelJS from "exceljs";
import type { AttendanceCalculatedRow } from "./attendanceWorkbook";
import type { AttendanceEvent } from "../types/attendanceTypes";
import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { aggregateWorkerDay } from "@/features/worker-attendance/services/workerAttendanceDay";
import { workerRainIntervals } from "@/features/worker-attendance/services/workerWorkIntervals";
import { accountWorkTime, pairAttendanceEvents } from "@/features/timesheets/services/workTimeAccounting";
import { sanitizeSpreadsheetCell } from "@/lib/security/filePolicy";
import { getBusinessDateKey } from "@/lib/time/timezone";
import { arrivalLatenessMinutes, usesWorkforceAttendancePolicy } from "@/features/timesheets/services/workforceAttendancePolicy";

export interface AttendanceExportEmployee { code: string; name: string; category?: string; department?: string; joinDate?:string; terminationDate?:string; }
type Group = "worker" | "supervisor" | "other";
type Day = { code:string; name:string; date:string; group:Group; department:string; minutes?:number; overtime?:number; pending?:number; rain?:number; late?:number; early?:number; fraction?:number; status:string; checkIn?:string; checkOut?:string; source:string; note?:string; };
type Input = {month:string;events:AttendanceEvent[];sessions:WorkerAttendanceSession[];calculated:AttendanceCalculatedRow[];employees?:AttendanceExportEmployee[]};
const safe=(value:string)=>sanitizeSpreadsheetCell(value);
const hours=(minutes?:number)=>minutes===undefined?"":Math.round(minutes/60*100)/100;
const labels:Record<string,string>={full_work:"Có công",worker_site:"Công trường",late:"Đi trễ",early_leave:"Về sớm",annual_leave:"Nghỉ phép",unpaid_leave:"Không lương",absent:"Vắng",rest_day:"Ngày nghỉ",holiday:"Ngày lễ",missing_check_in:"Thiếu giờ vào",missing_check_out:"Thiếu giờ ra",needs_review:"Cần đối chiếu",business_trip:"Công tác",unconfirmed:"Chưa xác nhận",leave:"Nghỉ",present:"Có mặt"};
const clock=(value?:string)=>value?new Intl.DateTimeFormat("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",hour:"2-digit",minute:"2-digit"}).format(new Date(value)):"";
const dayKey=(code:string,date:string)=>`${code}:${date}`;

export function attendanceOverviewDays(input:Input):Day[] {
 const roster=new Map((input.employees??[]).map(person=>[person.code,person]));
 const workerCodes=new Set(input.sessions.flatMap(session=>session.entries.map(entry=>entry.employeeCode)));
 const supervisorIds=new Set(input.sessions.map(session=>session.supervisorEmployeeId).filter(Boolean));
 const supervisorCodes=new Set(input.events.filter(event=>supervisorIds.has(event.employeeId)).map(event=>event.employeeCode));
 const group=(code:string):Group=>{const category=roster.get(code)?.category;if(category==="office")return "other";if(["supervisor","engineer"].includes(category??"")||supervisorCodes.has(code))return "supervisor";if(["worker","seasonal","contractor"].includes(category??"")||workerCodes.has(code))return "worker";return "other";};
 const days=new Map<string,Day>();
 const rounds=new Map<string,Array<WorkerAttendanceSession["entries"][number]&{session:WorkerAttendanceSession;observedAt:string;breakMinutes:number}>>();
 for(const session of input.sessions.filter(s=>s.date.startsWith(input.month+"-")&&(s.submittedAt||["submitted","locked","needs_review"].includes(s.status))))for(const entry of session.entries.filter(e=>e.isSelected!==false)){
  const key=dayKey(entry.employeeCode,session.date);rounds.set(key,[...(rounds.get(key)??[]),{...entry,session,observedAt:session.startedAt,breakMinutes:session.shiftBreakMinutes??0}]);
 }
 for(const [key,observations]of rounds){
  const daily=aggregateWorkerDay(observations)!;const session=observations[0].session;
  const rain=observations.flatMap(workerRainIntervals);
  const rainMinutes=rain.length?session.shiftStart&&session.shiftEnd?accountWorkTime({date:session.date,shift:{startTime:session.shiftStart,endTime:session.shiftEnd,crossMidnight:session.shiftEnd<=session.shiftStart,scheduleRules:session.shiftScheduleRules},workingDay:session.overtimeDayType!=="rest_day"&&session.overtimeDayType!=="holiday",intervals:rain}).regularMinutes:rain.reduce((sum,item)=>sum+(Date.parse(item.checkedOutAt)-Date.parse(item.checkedInAt))/60000,0):0;
  const normal=observations.find(item=>item.session.sessionType!=="overtime")?.session;
  const late=normal?.shiftStart&&daily.checkedInAt?usesWorkforceAttendancePolicy(session.date)?arrivalLatenessMinutes(session.date,daily.checkedInAt,normal.shiftStart):Math.max(0,Math.floor((Date.parse(daily.checkedInAt)-Date.parse(`${session.date}T${normal.shiftStart}:00+07:00`))/60000)):undefined;
  const early=normal?.shiftEnd&&daily.checkedOutAt?Math.max(0,Math.floor((Date.parse(`${session.date}T${normal.shiftEnd}:00+07:00`)+(normal.shiftStart&&normal.shiftEnd<=normal.shiftStart?86400000:0)-Date.parse(daily.checkedOutAt))/60000)):undefined;
  days.set(key,{code:daily.employeeCode,name:daily.workerName,date:session.date,group:group(daily.employeeCode),department:roster.get(daily.employeeCode)?.department??"",minutes:daily.complete?daily.workMinutes:undefined,overtime:daily.overtimeMinutes,pending:daily.pendingOvertimeMinutes,rain:rainMinutes,late,early,checkIn:daily.checkedInAt,checkOut:daily.checkedOutAt,status:daily.missingCheckIn?"missing_check_in":daily.missingCheckOut?"missing_check_out":(late??0)>0?"late":(early??0)>0?"early_leave":daily.status,source:"Điểm danh thực tế · Chưa tổng hợp"});
 }
 const events=new Map<string,AttendanceEvent[]>();
 for(const event of input.events.filter(e=>e.attendanceDate.startsWith(input.month+"-")&&e.attendanceStatus!=="rejected"&&e.employeeCode)){const key=dayKey(event.employeeCode!,event.attendanceDate);events.set(key,[...(events.get(key)??[]),event]);}
 for(const [key,items]of events){
  if(days.has(key))continue;
  items.sort((a,b)=>a.effectiveAt.localeCompare(b.effectiveAt));const first=items[0],intervals=pairAttendanceEvents(items),last=items.at(-1)!;
  days.set(key,{code:first.employeeCode!,name:first.employeeName??roster.get(first.employeeCode!)?.name??"",group:group(first.employeeCode!),department:roster.get(first.employeeCode!)?.department??"",date:first.attendanceDate,checkIn:items.find(e=>e.eventType==="check_in")?.effectiveAt,checkOut:last.eventType==="check_out"?last.effectiveAt:undefined,status:last.eventType==="check_in"?"missing_check_out":intervals.length?"needs_review":"missing_check_in",source:"Chấm cá nhân · Chưa tổng hợp",note:"Chưa phân ca để chốt giờ trong ca; không tự trừ giờ nghỉ của giám sát."});
 }
 // Multiple overlapping periods are snapshots of the same day, not extra work.
 const calculated=new Map<string,AttendanceCalculatedRow>();
 for(const row of input.calculated.filter(item=>item.workDate.startsWith(input.month+"-"))){const key=dayKey(row.employeeCode,row.workDate),prior=calculated.get(key);const priority=(item:AttendanceCalculatedRow)=>`${item.periodStatus==="locked"?1:0}:${item.computedAt??""}:${item.periodId??item.periodName}`;if(!prior||priority(row)>priority(prior))calculated.set(key,row);}
 for(const [key,row]of calculated){const previous=days.get(key);days.set(key,{...previous,code:row.employeeCode,name:row.employeeName,date:row.workDate,group:group(row.employeeCode),department:roster.get(row.employeeCode)?.department??"",minutes:row.workMinutes,overtime:row.overtimeMinutes,pending:row.pendingOvertimeMinutes,rain:row.rainPauseMinutes,late:row.lateMinutes,early:row.earlyLeaveMinutes,fraction:row.workFraction,checkIn:row.checkIn,checkOut:row.checkOut,status:row.status,source:`Đã tổng hợp · ${row.periodName}`,note:row.note});}
 return [...days.values()].sort((a,b)=>a.group.localeCompare(b.group)||a.code.localeCompare(b.code,"vi")||a.date.localeCompare(b.date));
}

export function finishPlainAttendanceSheet(sheet: ExcelJS.Worksheet) {
 sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }];
 sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
 sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, printTitlesRow: "1:1" };
 sheet.eachRow((row, index) => {
  row.font = { name: "Arial", size: 11, bold: index === 1 };
  row.alignment = { vertical: "top", wrapText: true };
 });
}

export function addAttendanceOverview(book: ExcelJS.Workbook, input: Input) {
 const data = attendanceOverviewDays(input);
 const today = getBusinessDateKey();
 const countDays = new Date(Number(input.month.slice(0, 4)), Number(input.month.slice(5)), 0).getDate();
 const dates = Array.from({ length: countDays }, (_, i) => `${input.month}-${String(i + 1).padStart(2, "0")}`);
 for (const [group, name] of [["worker", "công nhân"], ["supervisor", "giám sát"]] as const) {
  const people = new Map<string, Day[]>();
  for (const day of data.filter(day => day.group === group)) people.set(day.code, [...(people.get(day.code) ?? []), day]);
  for (const person of input.employees ?? []) {
   const categories = group === "worker" ? ["worker", "seasonal", "contractor"] : ["engineer", "supervisor"];
   if (categories.includes(person.category ?? "") && !people.has(person.code)) people.set(person.code, []);
  }
  const summary = book.addWorksheet(`Bảng công ${name}`);
  const detail = book.addWorksheet(`Chi tiết ${name}`);
  const rainHeader = group === "worker" ? ["Nghỉ mưa (giờ)"] : [];
  summary.addRow(["Mã NV", "Họ tên", "Ngày đi làm", "Công quy đổi", "Giờ tính công", "Tăng ca đã xác nhận (giờ)", "Tăng ca chờ xác nhận (giờ)", ...rainHeader, "Nghỉ phép (ngày)", "Nghỉ không lương (ngày)", "Vắng (ngày)", "Đi trễ (ngày)", "Trễ (phút)", "Về sớm (phút)", "Thiếu giờ vào/ra (ngày)", "Chưa có dữ liệu (ngày)"]);
  detail.addRow(["Mã NV", "Họ tên", "Ngày", "Thứ", "Giờ vào", "Giờ ra", "Giờ tính công", "Công quy đổi", "Tăng ca đã xác nhận (giờ)", "Tăng ca chờ xác nhận (giờ)", ...rainHeader, "Trễ (phút)", "Về sớm (phút)", "Trạng thái", "Nguồn tổng hợp", "Ghi chú"]);
  for (const [code, days] of [...people].sort(([a], [b]) => a.localeCompare(b, "vi"))) {
   const person = input.employees?.find(item => item.code === code);
   const personName = person?.name ?? days[0]?.name ?? "";
   const sum = (field: keyof Day) => days.reduce((n, d) => n + (typeof d[field] === "number" ? d[field] as number : 0), 0);
   const byDate = new Map(days.map(day => [day.date, day]));
   const relevantDates = dates.filter(date => date <= today && (!person?.joinDate || date >= person.joinDate) && (!person?.terminationDate || date <= person.terminationDate));
   const missing = relevantDates.filter(date => !byDate.has(date)).length;
   summary.addRow([safe(code), safe(personName), days.filter(d => d.checkIn || (d.minutes ?? 0) > 0).length,
    days.some(d => d.fraction !== undefined) ? Math.round(sum("fraction") * 100) / 100 : "",
    days.some(d => d.minutes !== undefined) ? hours(sum("minutes")) : "",
    hours(sum("overtime")), hours(sum("pending")), ...(group === "worker" ? [hours(sum("rain"))] : []),
    days.filter(d => ["annual_leave", "leave"].includes(d.status)).length,
    days.filter(d => d.status === "unpaid_leave").length, days.filter(d => d.status === "absent").length,
    days.filter(d => (d.late ?? 0) > 0 || d.status === "late").length, sum("late"), sum("early"),
    days.filter(d => ["missing_check_in", "missing_check_out"].includes(d.status)).length, missing]);
   for (const date of dates.filter(date => byDate.has(date) || relevantDates.includes(date))) {
    const d = byDate.get(date);
    detail.addRow([safe(code), safe(personName), date.split("-").reverse().join("/"), ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][new Date(`${date}T12:00:00Z`).getUTCDay()],
     clock(d?.checkIn), clock(d?.checkOut), hours(d?.minutes), d?.fraction ?? "", hours(d?.overtime), hours(d?.pending),
     ...(group === "worker" ? [hours(d?.rain)] : []), d?.late ?? "", d?.early ?? "",
     d ? labels[d.status] ?? safe(d.status) : "Chưa có dữ liệu", safe(d?.source ?? ""), safe(d?.note ?? "")]);
   }
  }
  summary.columns = Array.from({ length: summary.columnCount }).map((_, index) => ({ width: index === 1 ? 30 : index === 0 ? 16 : 19 }));
  detail.columns = Array.from({ length: detail.columnCount }).map((_, index) => ({ width: index === 1 ? 30 : index >= detail.columnCount - 2 ? 40 : index < 4 ? 16 : 19 }));
  for (const col of [4, 5, 6, 7, ...(group === "worker" ? [8] : [])]) summary.getColumn(col).numFmt = "0.00";
  for (const col of [7, 8, 9, 10, ...(group === "worker" ? [11] : [])]) detail.getColumn(col).numFmt = "0.00";
  finishPlainAttendanceSheet(summary);
  finishPlainAttendanceSheet(detail);
 }
}
