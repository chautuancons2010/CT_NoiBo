import { describe, expect, it } from "vitest";
import { aggregateWorkerDay } from "./workerAttendanceDay";

const round = (start: string, end?: string) => ({ status: "present", checkedInAt: `2026-11-10T${start}:00+07:00`, checkedOutAt: end ? `2026-11-10T${end}:00+07:00` : undefined, breakMinutes: 60 });

describe("daily worker rounds", () => {
  it("merges repeated observations and subtracts the daily break once", () => {
    expect(aggregateWorkerDay([round("08:00", "17:00"), round("10:00", "17:00"), round("13:00", "17:00")])).toMatchObject({ workMinutes: 480, workFraction: 1, complete: true });
  });
  it("does not count a gap between separate intervals", () => {
    expect(aggregateWorkerDay([round("08:00", "11:00"), round("14:00", "17:00")])).toMatchObject({ presenceMinutes: 360, workMinutes: 300 });
  });
  it("keeps missing checkout visible and never invents time", () => {
    expect(aggregateWorkerDay([round("08:00"), round("13:00", "17:00")])).toMatchObject({ workMinutes: 180, complete: false, checkedOutAt: undefined });
    expect(aggregateWorkerDay([round("08:00")])).toMatchObject({ workMinutes: 0, complete: false });
  });
  it("counts presence once even when a later round marks absence", () => {
    expect(aggregateWorkerDay([round("08:00", "17:00"), { status: "absent" }])).toMatchObject({ status: "present", workFraction: 1, workMinutes: 480 });
  });
  it("preserves checkout-only evidence and flags the missing check-in", () => {
    expect(aggregateWorkerDay([{ status: "present", checkedOutAt: "2026-11-10T10:00:00Z", breakMinutes: 60 }])).toMatchObject({
      checkedOutAt: "2026-11-10T10:00:00Z", missingCheckIn: true, missingCheckOut: false, complete: false, workMinutes: 0
    });
  });
  it("retains complete interval pairs and partial observations for HR corrections", () => {
    const observations = [round("08:00", "11:00"), round("14:00", "17:00"), round("18:00")];
    const daily = aggregateWorkerDay(observations)!;
    expect(daily.mergedIntervals).toEqual([
      { checkedInAt: "2026-11-10T01:00:00.000Z", checkedOutAt: "2026-11-10T04:00:00.000Z" },
      { checkedInAt: "2026-11-10T07:00:00.000Z", checkedOutAt: "2026-11-10T10:00:00.000Z" }
    ]);
    expect(daily.observations).toHaveLength(3);
    expect(daily.missingCheckOut).toBe(true);
  });
});
