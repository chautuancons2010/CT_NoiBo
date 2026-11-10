import { describe, expect, it } from "vitest";
import { computeDailyTimesheet, resolveCalendarDay, resolveShift, scheduledMinutes } from "./timesheetRules";
import type { Shift } from "../types/timesheetTypes";
import type { TimesheetAdjustment, TimesheetWorkerInput } from "../types/timesheetTypes";
import { aggregateWorkerDay } from "@/features/worker-attendance/services/workerAttendanceDay";

const shift: Shift = { id:"1", code:"OFFICE", name:"Hành chính", startTime:"08:00", endTime:"17:00", breakMinutes:60, lateGraceMinutes:5, earlyLeaveGraceMinutes:5, checkInEarliestMinutes:120, checkInLatestMinutes:240, checkOutEarliestMinutes:0, checkOutLatestMinutes:360, crossMidnight:false, active:true };
const base = { periodId:"p", employee:{id:"e",code:"NV01",name:"An",departmentName:"HC",positionName:"NV",employmentTypeName:"Chính thức"}, date:"2026-09-10", shift, adjustments:[] };

it("uses merged worker intervals without filling gaps between rounds", () => {
  const daily = computeDailyTimesheet({ ...base, events: [], worker: { status: "present", checkedInAt: "2026-09-10T01:00:00Z", checkedOutAt: "2026-09-10T10:00:00Z", workMinutes: 300, workFraction: 1, sessionIds: ["round-1", "round-2"] } });
  expect(daily.workMinutes).toBe(300);
  expect(daily.workFraction).toBe(1);
  expect(daily.rawSource.worker).toMatchObject({ sessionIds: ["round-1", "round-2"] });
});

describe("worker round clock adjustments", () => {
  const observation = (start?: string, end?: string) => ({ status: "present" as const, checkedInAt: start ? `2026-09-10T${start}:00+07:00` : undefined, checkedOutAt: end ? `2026-09-10T${end}:00+07:00` : undefined, breakMinutes: 60 });
  const correction = (adjustmentType: TimesheetAdjustment["adjustmentType"], hour: string, timeTarget = "check_out"): TimesheetAdjustment => ({ id: "fix", periodId: "p", employeeId: "e", workDate: base.date, adjustmentType, effectiveTime: `2026-09-10T${hour}:00+07:00`, reason: "Clock correction", createdAt: "2026-09-11T00:00:00Z", before: {}, after: { timeTarget } });
  const compute = (observations: ReturnType<typeof observation>[], adjustments: TimesheetAdjustment[] = []) => computeDailyTimesheet({ ...base, events: [], worker: aggregateWorkerDay(observations) as TimesheetWorkerInput, adjustments });

  it("changes the last checkout without filling the gap between two completed rounds", () => {
    const result = compute([observation("08:00", "11:00"), observation("14:00", "17:00")], [correction("adjust_effective_time", "18:00")]);
    expect(result.workMinutes).toBe(360);
    expect(result.effectiveCheckOut).toBe("2026-09-10T18:00:00+07:00");
  });

  it("changes the first checkin while preserving subsequent completed rounds", () => {
    const result = compute([observation("08:00", "11:00"), observation("14:00", "17:00")], [correction("adjust_effective_time", "07:00", "check_in")]);
    expect(result.workMinutes).toBe(360);
  });

  it("flags a missing checkin even when another round has complete clocks", () => {
    const result = compute([observation(undefined, "11:00"), observation("14:00", "17:00")]);
    expect(result.status).toBe("missing_check_in");
    expect(result.exceptions.filter(item => item.type === "missing_check_in")).toHaveLength(1);
    expect(result.workMinutes).toBe(120);
  });

  it("repairs a missing checkin on its own round without joining the afternoon interval", () => {
    const result = compute([observation(undefined, "11:00"), observation("14:00", "17:00")], [correction("add_missing_check_in", "08:00", "check_in")]);
    expect(result.workMinutes).toBe(300);
    expect(result.exceptions.some(item => item.type === "missing_check_in")).toBe(false);
  });

  it("repairs a missing checkout without filling the earlier gap", () => {
    const result = compute([observation("08:00", "11:00"), observation("14:00")], [correction("add_missing_check_out", "17:00")]);
    expect(result.workMinutes).toBe(300);
    expect(result.exceptions.some(item => item.type === "missing_check_out")).toBe(false);
  });
});

describe("timesheet rules", () => {
  it("không tăng giờ công hoặc mất giờ nghỉ khi chấm lặp cùng loại", () => {
    const result = computeDailyTimesheet({ ...base, events: [
      { id: "in", eventType: "check_in", effectiveAt: "2026-09-10T01:00:00Z", geofenceStatus: "inside", photoStatus: "uploaded", syncStatus: "synced" },
      { id: "repeat-in", eventType: "check_in", effectiveAt: "2026-09-10T01:01:00Z", geofenceStatus: "inside", photoStatus: "uploaded", syncStatus: "synced" },
      { id: "out", eventType: "check_out", effectiveAt: "2026-09-10T10:00:00Z", geofenceStatus: "inside", photoStatus: "uploaded", syncStatus: "synced" },
      { id: "repeat-out", eventType: "check_out", effectiveAt: "2026-09-10T10:01:00Z", geofenceStatus: "inside", photoStatus: "uploaded", syncStatus: "synced" }
    ] });
    expect(result.workMinutes).toBe(480);
    expect(result.rawSource.events).toHaveLength(4);
  });
  it("tính lại số phút khi nhân sự bổ sung lượt ra còn thiếu", () => {
    const result=computeDailyTimesheet({...base,events:[{id:"in",eventType:"check_in",effectiveAt:"2026-09-10T01:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"}],adjustments:[{id:"a",periodId:"p",employeeId:"e",workDate:base.date,adjustmentType:"add_missing_check_out",effectiveTime:"2026-09-10T10:00:00Z",reason:"Bổ sung từ nhật ký ca",createdAt:"2026-09-10T11:00Z",before:{},after:{}}]});
    expect(result.workMinutes).toBe(480);expect(result.workFraction).toBe(1);expect(result.status).toBe("full_work");expect(result.exceptions).toEqual([]);expect(result.rawSource.events).toHaveLength(1);
  });
  it("sửa thời gian hiệu lực vẫn giữ nguồn chấm công gốc",()=>{
    const result=computeDailyTimesheet({...base,events:[{id:"in",eventType:"check_in",effectiveAt:"2026-09-10T02:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"},{id:"out",eventType:"check_out",effectiveAt:"2026-09-10T10:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"}],adjustments:[{id:"a",periodId:"p",employeeId:"e",workDate:base.date,adjustmentType:"adjust_effective_time",effectiveTime:"2026-09-10T01:00:00Z",reason:"Đối chiếu giờ ca",createdAt:"2026-09-10T11:00Z",before:{},after:{timeTarget:"check_in"}}]});
    expect(result.workMinutes).toBe(480);expect(result.lateMinutes).toBe(0);expect((result.rawSource.events as Array<{effectiveAt:string}>)[0].effectiveAt).toBe("2026-09-10T02:00:00Z");
  });
  it("nghỉ nửa ngày và làm nửa ngày không bị coi là trùng đơn nghỉ toàn ngày",()=>{
    const result=computeDailyTimesheet({...base,events:[{id:"in",eventType:"check_in",effectiveAt:"2026-09-10T01:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"},{id:"out",eventType:"check_out",effectiveAt:"2026-09-10T05:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"}],leave:{requestId:"l",requestNumber:"NP1",typeCode:"AL",typeName:"Phép năm",deductsBalance:true,fraction:.5}});
    expect(result.leaveFraction).toBe(.5);expect(result.workFraction).toBeLessThanOrEqual(.5);expect(result.exceptions.some(item=>item.type==="attendance_leave_conflict")).toBe(false);
  });
  it("tính ca thường và ca qua đêm", () => { expect(scheduledMinutes(shift)).toBe(480); expect(scheduledMinutes({...shift,startTime:"22:00",endTime:"06:00",crossMidnight:true})).toBe(420); });
  it("áp dụng độ trễ cho phép", () => { const result=computeDailyTimesheet({...base,events:[{id:"in",eventType:"check_in",effectiveAt:"2026-09-10T01:05:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"},{id:"out",eventType:"check_out",effectiveAt:"2026-09-10T10:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"}]});expect(result.status).toBe("full_work");expect(result.lateMinutes).toBe(0);expect(result.workMinutes).toBe(475); });
  it("giữ nhiều lượt vào/ra và phát hiện thiếu lượt ra", () => { const result=computeDailyTimesheet({...base,events:[{id:"1",eventType:"check_in",effectiveAt:"2026-09-10T01:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"},{id:"2",eventType:"check_out",effectiveAt:"2026-09-10T05:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"},{id:"3",eventType:"check_in",effectiveAt:"2026-09-10T06:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"}]});expect(result.workMinutes).toBe(240);expect(result.status).toBe("missing_check_out");expect(result.rawSource.events).toHaveLength(3); });
  it("đánh dấu xung đột chấm công với đơn nghỉ", () => { const result=computeDailyTimesheet({...base,events:[{id:"1",eventType:"check_in",effectiveAt:"2026-09-10T01:00:00Z",geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"}],leave:{requestId:"l",requestNumber:"NP1",typeCode:"AL",typeName:"Phép năm",deductsBalance:true,fraction:1}});expect(result.status).toBe("needs_review");expect(result.exceptions.some(item=>item.type==="attendance_leave_conflict")).toBe(true); });
  it("áp dụng dữ liệu đội công nhân và điều chỉnh HR", () => { const result=computeDailyTimesheet({...base,events:[],worker:{status:"present",dayException:"half_day"},adjustments:[{id:"a",periodId:"p",employeeId:"e",workDate:base.date,adjustmentType:"mark_business_trip",reason:"Công tác",createdAt:"2026-09-10T00:00:00Z",before:{},after:{}}]});expect(result.status).toBe("business_trip");expect(result.workFraction).toBe(.5);expect(result.sources).toContain("MANUAL_ADJUSTMENT"); });
  it("ưu tiên phạm vi nhân viên và lịch riêng", () => { const assignments=[{scopeType:"company" as const,effectiveFrom:"2020-01-01",weekdays:[4],shift},{scopeType:"employee" as const,scopeId:"e",effectiveFrom:"2020-01-01",weekdays:[4],shift:{...shift,id:"2",name:"Riêng"}}];expect(resolveShift({assignments,date:base.date,employeeId:"e",departmentId:"d",projectIds:[]})?.name).toBe("Riêng"); const days=[{id:"1",date:base.date,name:"Lễ",dayType:"holiday" as const,scopeType:"company" as const,isWorkingDay:false,active:true},{id:"2",date:base.date,name:"Đi làm",dayType:"makeup_workday" as const,scopeType:"employee" as const,scopeId:"e",isWorkingDay:true,active:true}];expect(resolveCalendarDay(days,{date:base.date,employeeId:"e",departmentId:"d",projectIds:[]})?.isWorkingDay).toBe(true); });
  it("dùng đúng phiên bản ca theo ngày hiệu lực", () => { const assignments=[{scopeType:"company" as const,effectiveFrom:"2020-01-01",weekdays:[4],shift:{...shift,name:"Hiện tại"},versions:[{effectiveFrom:"2020-01-01",effectiveTo:"2026-09-10",shift:{...shift,name:"Ca cũ",startTime:"07:00"}},{effectiveFrom:"2026-09-11",shift:{...shift,name:"Ca mới",startTime:"08:30"}}]}];expect(resolveShift({assignments,date:"2026-09-10",employeeId:"e",departmentId:"d",projectIds:[]})?.name).toBe("Ca cũ");expect(resolveShift({assignments,date:"2026-09-17",employeeId:"e",departmentId:"d",projectIds:[]})?.name).toBe("Ca mới"); });
});
