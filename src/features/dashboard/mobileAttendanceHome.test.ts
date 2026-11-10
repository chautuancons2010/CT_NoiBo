import { describe, expect, it } from "vitest";
import { isPhoneRequest, supervisorPhoneLanding } from "./mobileAttendanceHome";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
const supervisor: AuthenticatedUser = { id: "supervisor", username: "supervisor", displayName: "Giám sát", email: "test@example.invalid", status: "active", permissions: ["worker_attendance.create", "dashboard.view"] };
describe("server phone entry", () => {
  it("detects phone requests and opens Personal for a supervisor before dashboard rendering", () => {
    const request = new Headers({ "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148" });
    expect(supervisorPhoneLanding(supervisor, request)).toBe("/personal");
    expect(isPhoneRequest(new Headers({ "sec-ch-ua-mobile": "?1" }))).toBe(true);
  });
  it("keeps desktop and other role destinations", () => {
    expect(supervisorPhoneLanding(supervisor, new Headers({ "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }))).toBeUndefined();
    expect(supervisorPhoneLanding({ ...supervisor, permissions: ["employee.view", "dashboard.view"] }, new Headers({ "sec-ch-ua-mobile": "?1" }))).toBeUndefined();
  });
});
