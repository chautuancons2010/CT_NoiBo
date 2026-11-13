import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttendanceDashboard, AttendanceEvent } from "../types/attendanceTypes";
import { PersonalToday } from "./PersonalToday";

vi.mock("@/components/providers/CurrentUserProvider", () => ({ useCurrentUser: () => ({ id: "personal", displayName: "Giám sát", permissions: ["attendance.self.view", "attendance.self.create"] }) }));
vi.mock("@/lib/realtime/useDomainReconciliation", () => ({ useDomainReconciliation: vi.fn() }));
vi.mock("@/lib/ui/useLoadingActivity", () => ({ useLoadingActivity: vi.fn() }));
vi.mock("../client/pendingDashboard", () => ({ withPendingAttendance: async (value: AttendanceDashboard) => value }));
vi.mock("../client/attendanceDashboardCache", () => ({ rememberAttendanceDashboard: vi.fn() }));
vi.mock("../client/attendanceQueue", () => ({ listPendingAttendance: async () => [] }));
vi.mock("./AttendanceEvidence", () => ({ AttendanceEvidenceViewer: () => null }));
afterEach(() => vi.unstubAllGlobals());

const event = (id: string, eventType: "check_in" | "check_out", time: string): AttendanceEvent => ({ id, clientEventId: id, employeeId: "worker", eventType, attendanceDate: "2026-11-12", effectiveAt: `2026-11-12T${time}:00+07:00`, capturedAtClient: `2026-11-12T${time}:00+07:00`, receivedAtServer: `2026-11-12T${time}:00+07:00`, attendanceStatus: "recorded", syncStatus: "synced", photoStatus: "not_required", geofenceStatus: "not_required", anomalyFlags: [] });
describe("personal attendance rounds", () => {
  it("shows the current round without reusing the previous checkout, and preserves earlier rounds", async () => {
    const dashboard: AttendanceDashboard = { accountId: "personal", employeeId: "worker", employeeName: "Giám sát", locations: [], nextAction: "check_out", todayEvents: [event("in2", "check_in", "13:00"), event("in1", "check_in", "08:00"), event("out1", "check_out", "12:00")], policy: { id: "policy", name: "Ca ngày", attendanceEnabled: true, photoRequired: false, gpsRequired: false, offlineEnabled: true, allowedAccuracyThresholdMeters: 100, earlyCheckinWindowMinutes: 0, lateThresholdMinutes: 5, shiftName: "Ca ngày", shiftStart: "08:00", shiftEnd: "17:00", timezone: "Asia/Ho_Chi_Minh" } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: dashboard }) }));
    render(<PersonalToday/>);
    const region = await screen.findByRole("region", { name: "Ca làm hôm nay" });
    expect(within(region).getByText("Đang trong ca")).toBeInTheDocument();
    const current = within(region).getByText("Chấm vào", { selector: "dt" }).closest("dl")!;
    expect(within(current).getByText("13:00")).toBeInTheDocument();
    expect(within(current).getByText("—")).toBeInTheDocument();
    expect(within(current).queryByText("12:00")).not.toBeInTheDocument();
    fireEvent.click(within(region).getByText("Các lượt trong ngày"));
    expect(within(region).getByText("08:00")).toBeVisible();
    expect(within(region).getByText("12:00")).toBeVisible();
  });
});
