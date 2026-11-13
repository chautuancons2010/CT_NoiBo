import { describe, expect, it } from "vitest";
import { accountWorkTime } from "./workTimeAccounting";
import { portScheduleRules } from "./portSchedules";
import type { Shift } from "../types/timesheetTypes";

const date = "2026-11-13";
const interval = (start: string, end: string) => ({ checkedInAt: `${date}T${start}:00+07:00`, checkedOutAt: `${date}T${end}:00+07:00` });
const shift: Shift = { id: "port", code: "PORT_GENERAL", name: "Cảng tổng hợp", startTime: "07:30", endTime: "17:00", breakMinutes: 90, lateGraceMinutes: 0, earlyLeaveGraceMinutes: 0, checkInEarliestMinutes: 120, checkInLatestMinutes: 240, checkOutEarliestMinutes: 0, checkOutLatestMinutes: 360, crossMidnight: false, active: true, scheduleRules: portScheduleRules };
describe("port attendance accounting", () => {
  it("splits continuous work into regular time, lunch, and confirmed overtime without a forced checkout", () => {
    const result = accountWorkTime({ date, shift, workingDay: true, intervals: [interval("07:15", "19:00")], confirmedOvertime: [interval("17:00", "19:00")] });
    expect(result).toMatchObject({ regularMinutes: 480, creditedMinutes: 480, outsideMinutes: 135, overtimeMinutes: 120, pendingOvertimeMinutes: 0, arrivalLateMinutes: 0, requiredArrivalTime: "07:20" });
  });
  it("calculates the specialized port as 7.5 hours and excludes only the lunch that overlaps actual presence", () => {
    const specialized = { ...shift, startTime: "08:00" };
    expect(accountWorkTime({ date, shift: specialized, workingDay: true, intervals: [interval("07:45", "17:00")] })).toMatchObject({regularMinutes:450,creditedMinutes:480});
    expect(accountWorkTime({ date, shift: specialized, workingDay: true, intervals: [interval("13:00", "17:00")] }).regularMinutes).toBe(240);
  });
  it("separates arrival compliance from lateness to the work shift", () => {
    expect(accountWorkTime({ date, shift, workingDay: true, intervals: [interval("07:25", "17:00")] })).toMatchObject({ regularMinutes: 480, arrivalLateMinutes: 5 });
  });
  it("marks arrival at shift start ten minutes late without deducting preparation from earned work",()=>{
    expect(accountWorkTime({date,shift,workingDay:true,intervals:[interval("07:30","17:00")]})).toMatchObject({regularMinutes:480,creditedMinutes:480,arrivalLateMinutes:10});
    expect(accountWorkTime({date,shift,workingDay:true,intervals:[interval("07:20","17:00")]}).arrivalLateMinutes).toBe(0);
  });
  it("counts explicitly confirmed early work while keeping unconfirmed early arrival as preparation",()=>{
    const long={...shift,startTime:"06:00",endTime:"19:00"};
    const result=accountWorkTime({date,shift:long,workingDay:true,intervals:[interval("05:00","20:00")],confirmedOvertime:[interval("05:00","06:00"),interval("19:00","20:00")],pendingOvertime:[interval("05:00","06:00")]});
    expect(result).toMatchObject({regularMinutes:690,creditedMinutes:480,overtimeMinutes:120,pendingOvertimeMinutes:0});
    expect(accountWorkTime({date,shift:long,workingDay:true,intervals:[interval("05:00","20:00")]}).overtimeMinutes).toBe(0);
  });
  it("prorates a short port day after a real rain pause and keeps overtime as actual minutes",()=>{
    expect(accountWorkTime({date,shift:{...shift,startTime:"08:00"},workingDay:true,intervals:[interval("07:50","10:00"),interval("10:30","19:00")],confirmedOvertime:[interval("17:00","19:00")]})).toMatchObject({regularMinutes:420,creditedMinutes:448,overtimeMinutes:120});
  });
  it("does not count time away, overlapping rounds or an unconfirmed late checkout twice", () => {
    const result = accountWorkTime({ date, shift, workingDay: true, intervals: [interval("07:15", "17:00"), interval("18:00", "19:00"), interval("18:00", "19:00")], confirmedOvertime: [interval("17:00", "19:00"), interval("18:00", "19:00")] });
    expect(result).toMatchObject({ regularMinutes: 480, overtimeMinutes: 60, outsideMinutes: 75 });
  });
  it("keeps a rest day separate and confirms only actual work", () => {
    expect(accountWorkTime({ date, workingDay: false, intervals: [interval("08:00", "11:00")], confirmedOvertime: [interval("07:00", "12:00")] })).toMatchObject({ regularMinutes: 0, overtimeMinutes: 180 });
  });
  it("subtracts overlapping regular and confirmed time once from a pending overtime block", () => {
    expect(accountWorkTime({date,shift,workingDay:true,intervals:[interval("15:00","19:00")],confirmedOvertime:[interval("16:00","18:00")],pendingOvertime:[interval("15:00","19:00")]})).toMatchObject({regularMinutes:0,overtimeMinutes:120,pendingOvertimeMinutes:120});
  });
  it("separates overtime recorded inside a configured shift from regular credit",()=>{
    expect(accountWorkTime({date,shift,workingDay:true,intervals:[interval("07:20","17:00")],confirmedOvertime:[interval("15:00","17:00")]})).toMatchObject({regularMinutes:360,creditedMinutes:360,overtimeMinutes:120});
  });
  it("does not convert rejected overtime into regular attendance",()=>{
    expect(accountWorkTime({date,shift,workingDay:true,intervals:[interval("15:00","17:00")],recordedOvertime:[interval("15:00","17:00")]})).toMatchObject({regularMinutes:0,creditedMinutes:0,overtimeMinutes:0,pendingOvertimeMinutes:0});
  });
  it("counts lunchtime overtime and a night crossing midnight using actual intervals",()=>{
    expect(accountWorkTime({date,shift,workingDay:true,intervals:[interval("07:20","17:00")],confirmedOvertime:[interval("11:30","13:00")]})).toMatchObject({regularMinutes:480,overtimeMinutes:90});
    expect(accountWorkTime({date,shift,workingDay:true,intervals:[{checkedInAt:`${date}T22:00:00+07:00`,checkedOutAt:"2026-11-14T02:00:00+07:00"}],confirmedOvertime:[{checkedInAt:`${date}T22:00:00+07:00`,checkedOutAt:"2026-11-14T02:00:00+07:00"}]})).toMatchObject({regularMinutes:0,overtimeMinutes:240});
  });
});
