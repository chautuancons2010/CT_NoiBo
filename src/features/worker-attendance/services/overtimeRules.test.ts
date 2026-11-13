import { describe, expect, it } from "vitest";
import { canReviewOvertime, nextOvertimeCheckpoint, overtimeEvidenceComplete } from "./overtimeRules";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
const photo=(checkpoint:"start"|"middle"|"end",time:string)=>({checkpoint,capturedAt:`2026-11-13T${time}:00+07:00`});
describe("overtime evidence and confirmation",()=>{
  it("requires all three actual checkpoints in chronological order",()=>{
    expect(overtimeEvidenceComplete([photo("start","17:00"),photo("middle","18:00"),photo("end","19:00")])).toBe(true);
    expect(overtimeEvidenceComplete([photo("start","17:00"),photo("start","18:00"),photo("end","19:00")])).toBe(false);
    expect(overtimeEvidenceComplete([photo("start","19:00"),photo("middle","18:00"),photo("end","17:00")])).toBe(false);
    expect(nextOvertimeCheckpoint([photo("start","17:00")])).toBe("middle");
  });
  it("allows HR/admin confirmation and does not grant that right to the supervisor",()=>{
    const user={id:"one",status:"active",permissions:["worker_attendance.create","attendance.view_all"]} as AuthenticatedUser;
    expect(canReviewOvertime({...user,roleCodes:["supervisor"]})).toBe(false);
    expect(canReviewOvertime({...user,roleCodes:["hr"]})).toBe(true);
    expect(canReviewOvertime({...user,roleCodes:["admin"]})).toBe(true);
  });
});
