import { describe, expect, it } from "vitest";
import { arrivalLatenessMinutes, creditedWorkMinutes } from "./workforceAttendancePolicy";
import { computeDailyTimesheet } from "./timesheetRules";
import { getAttendanceLateMinutes } from "@/features/attendance/services/attendanceRules";
import { portScheduleRules } from "./portSchedules";

const date="2026-11-13";
const policy={timezone:"Asia/Ho_Chi_Minh",shiftStart:"08:00",lateThresholdMinutes:5};
describe("ten-minute arrival and eight-hour workday",()=>{
 it("uses the preparation deadline without the old lateness grace",()=>{
  expect(getAttendanceLateMinutes(`${date}T07:50:00+07:00`,policy)).toBe(0);
  expect(getAttendanceLateMinutes(`${date}T07:50:01+07:00`,policy)).toBe(1);
  expect(getAttendanceLateMinutes(`${date}T08:00:00+07:00`,policy)).toBe(10);
  expect(getAttendanceLateMinutes(`${date}T08:00:00+07:00`,{...policy,isWorkingDay:false})).toBe(0);
  expect(getAttendanceLateMinutes("2026-11-11T08:05:00+07:00",policy)).toBe(0);
 });
 it("keeps a midnight arrival deadline on the preceding date",()=>{
  expect(arrivalLatenessMinutes(date,"2026-11-12T23:55:00+07:00","00:05")).toBe(0);
  expect(arrivalLatenessMinutes(date,"2026-11-12T23:56:00+07:00","00:05")).toBe(1);
 });
 it("preserves historical hours and prorates current short days",()=>{
  expect(creditedWorkMinutes("2026-11-11",450,450)).toBe(450);
  expect(creditedWorkMinutes(date,450,450)).toBe(480);
  expect(creditedWorkMinutes(date,225,450)).toBe(240);
  expect(creditedWorkMinutes(date,600,600)).toBe(480);
 });
 it("records actual short-port minutes in the source while earning one eight-hour day",()=>{
  const shift={id:"port",code:"PORT_SPECIALIZED",name:"Cảng chuyên dụng",startTime:"08:00",endTime:"17:00",breakMinutes:90,lateGraceMinutes:5,earlyLeaveGraceMinutes:0,checkInEarliestMinutes:120,checkInLatestMinutes:240,checkOutEarliestMinutes:0,checkOutLatestMinutes:360,crossMidnight:false,active:true,scheduleRules:portScheduleRules};
  const event=(eventType:"check_in"|"check_out",time:string)=>({id:eventType,eventType,effectiveAt:`${date}T${time}:00+07:00`,geofenceStatus:"inside",photoStatus:"uploaded",syncStatus:"synced"});
  const day=computeDailyTimesheet({periodId:"p",employee:{id:"e",code:"GS1",name:"Giám sát",departmentName:"",positionName:"",employmentTypeName:"Giám sát"},date,shift,events:[event("check_in","08:00"),event("check_out","17:00")],adjustments:[]});
  expect(day).toMatchObject({workMinutes:480,workFraction:1,lateMinutes:10,status:"late",overtimeMinutes:0});
  expect(day.rawSource.accounting).toMatchObject({regularMinutes:450,creditedMinutes:480});
 });
});
