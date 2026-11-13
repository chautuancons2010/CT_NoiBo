import { describe, expect, it } from "vitest";
import { workerSessionDraftSchema } from "./workerAttendanceSchemas";

const entry = { id: "33333333-3333-4333-8333-333333333333", isSelected: true, status: "late" };

describe("worker draft timestamps returned by the database", () => {
  it.each(["2026-11-13T06:58:51.184+00:00", "2026-11-13T06:58:51.184029+00:00", "2026-11-13T13:58:51.184+07:00", "2026-11-13T06:58:51.184Z"])("accepts a saved observation on subsequent wizard saves: %s", checkedInAt => {
    const parsed = workerSessionDraftSchema.parse({ version: 4, entries: [{ ...entry, checkedInAt }], checklistResponses: [] });
    expect(Date.parse(parsed.entries[0].checkedInAt!)).toBe(Date.parse(checkedInAt));
  });
  it.each(["2026-11-13T06:58:51", "not-a-time", "2026-99-99T00:00:00+00:00"])("rejects an invalid or timezone-free observation: %s", checkedInAt => {
    expect(workerSessionDraftSchema.safeParse({ version: 4, entries: [{ ...entry, checkedInAt }] }).success).toBe(false);
  });
});
