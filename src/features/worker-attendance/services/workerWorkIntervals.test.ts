import { describe, expect, it } from "vitest";
import { workerWorkIntervals, workerWorkState } from "./workerWorkIntervals";
import type { WorkerAttendanceEntry } from "../types/workerAttendanceTypes";
const time = (clock: string) => `2026-11-13T${clock}:00+07:00`;
describe("individual clocks inside group attendance", () => {
  it("excludes a rain pause while retaining morning-only work and other workers independently", () => {
    const entry = { checkedInAt: time("08:00"), checkedOutAt: time("11:30"), workEvents: [{ id: "p", entryId: "one", eventType: "pause", effectiveAt: time("10:00"), reason: "rain" }, { id: "r", entryId: "one", eventType: "resume", effectiveAt: time("10:30"), reason: "rain" }, { id: "f", entryId: "one", eventType: "finish", effectiveAt: time("11:30"), reason: "personal" }] } as WorkerAttendanceEntry;
    expect(workerWorkIntervals(entry)).toEqual([{ checkedInAt: time("08:00"), checkedOutAt: time("10:00") }, { checkedInAt: time("10:30"), checkedOutAt: time("11:30") }]);
    expect(workerWorkState(entry)).toBe("finished");
    expect(workerWorkState({ checkedInAt: time("08:00") } as WorkerAttendanceEntry)).toBe("working");
  });
  it("does not invent working time after a pause without a resume", () => {
    const entry = { checkedInAt: time("08:00"), checkedOutAt: time("17:00"), workEvents: [{ id: "p", entryId: "one", eventType: "pause", effectiveAt: time("10:00"), reason: "rain" }] } as WorkerAttendanceEntry;
    expect(workerWorkIntervals(entry)).toEqual([{ checkedInAt: time("08:00"), checkedOutAt: time("10:00") }]);
  });
});
