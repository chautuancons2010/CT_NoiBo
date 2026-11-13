import { describe, expect, it } from "vitest";
import { overtimeDurationLabel, overtimeTimeRange } from "./overtimeTimeEntry";
import { workerOvertimeTimeEntrySchema } from "../schemas/workerAttendanceSchemas";
const id = "11111111-1111-4111-8111-111111111111";
const input = { ownerAccountId: id, clientSessionId: id, projectId: id, worksiteId: id, shiftCode: "PORT_GENERAL", date: "2026-11-13", capturedAtClient: "2026-11-13T10:00:00Z", workerIds: [id], checkedInAt: "2026-11-13T05:00:00+07:00", checkedOutAt: "2026-11-13T07:00:00+07:00", consentConfirmed: true };
describe("entered overtime hours", () => {
  it("accepts early, lunchtime and night overtime without a fixed shift end", () => {
    for (const [start,end,nextDay] of [["05:00","07:00",false],["11:30","13:00",false],["22:00","02:00",true]] as const) {
      const range = overtimeTimeRange(input.date,start,end,nextDay);
      expect(workerOvertimeTimeEntrySchema.safeParse({...input,...range,minutes:undefined}).success).toBe(false); // strict API excludes display fields
      expect(workerOvertimeTimeEntrySchema.safeParse({...input,checkedInAt:range.checkedInAt,checkedOutAt:range.checkedOutAt}).success).toBe(true);
    }
    expect(overtimeTimeRange(input.date,"22:00","02:00",true)).toMatchObject({minutes:240,checkedOutAt:"2026-11-14T02:00:00+07:00"});
  });
  it("subtracts only an explicitly bounded break and rejects reversed clocks", () => {
    expect(workerOvertimeTimeEntrySchema.safeParse({...input,breakStartedAt:"2026-11-13T05:30:00+07:00",breakEndedAt:"2026-11-13T06:00:00+07:00"}).success).toBe(true);
    for(const patch of [{checkedOutAt:input.checkedInAt},{breakStartedAt:input.checkedInAt},{breakStartedAt:input.checkedInAt,breakEndedAt:input.checkedOutAt},{checkedInAt:"invalid"},{date:"2026-11-12"},{workerIds:[id,id]}]) expect(workerOvertimeTimeEntrySchema.safeParse({...input,...patch}).success).toBe(false);
  });
  it("keeps empty time fields renderable and displays actual minutes", () => {
    expect(overtimeTimeRange("","","",true).minutes).toBe(0);
    expect(overtimeDurationLabel(105)).toBe("1 giờ 45 phút");
  });
});
