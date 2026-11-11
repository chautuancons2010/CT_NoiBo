import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import { AttendanceCameraExperience } from "./AttendanceCameraExperience";
const viewport = vi.hoisted(() => ({ value: false as boolean | null }));
vi.mock("@/lib/ui/useMobileViewport", () => ({ useMobileViewport: () => viewport.value }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/realtime/useDomainReconciliation", () => ({ useDomainReconciliation: vi.fn() }));
vi.mock("@/features/attendance/client/attendanceQueue", () => ({ countPendingAttendance: vi.fn().mockResolvedValue(0), listPendingAttendance: vi.fn().mockResolvedValue([]) }));
afterEach(() => { cleanup(); viewport.value = false; Reflect.deleteProperty(navigator, "mediaDevices"); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("quick attendance opening", () => {
  it("waits for the phone camera layer to be stable before requesting its stream", async () => {
    viewport.value = null;
    vi.stubGlobal("isSecureContext", true);
    const getUserMedia = vi.fn(() => new Promise<MediaStream>(() => undefined));
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    const content = () => <CurrentUserProvider user={{ id: "stable-phone", username: "camera", displayName: "Giám sát", email: "camera@example.invalid", status: "active", permissions: ["attendance.self.create"] }}><AttendanceCameraExperience initialCapture /></CurrentUserProvider>;
    const view = render(content());
    await Promise.resolve();
    expect(getUserMedia).not.toHaveBeenCalled();
    viewport.value = true;
    view.rerender(content());
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Chụp ảnh chấm công").parentElement?.parentElement).toBe(document.body);
  });
  it("permits a new check-in after a completed pair while preventing a repeated checkout", async () => {
    const getUserMedia = vi.fn(() => new Promise<MediaStream>(() => undefined));
    vi.stubGlobal("isSecureContext", true);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    const event = (eventType: "check_in" | "check_out", hour: string) => ({ id: eventType, clientEventId: eventType, employeeId: "repeat-employee", eventType, attendanceDate: "2026-11-09", effectiveAt: `2026-11-09T${hour}:00+07:00`, capturedAtClient: `2026-11-09T${hour}:00+07:00`, receivedAtServer: `2026-11-09T${hour}:00+07:00`, geofenceStatus: "valid" as const, attendanceStatus: "recorded" as const, photoStatus: "uploaded" as const, syncStatus: "synced" as const, anomalyFlags: [] });
    const dashboard = { accountId: "repeat-camera", employeeId: "repeat-employee", employeeName: "Giám sát", locations: [], nextAction: "check_in" as const, todayEvents: [event("check_in", "08:00"), event("check_out", "12:00")], policy: { id: "p", name: "Ca ngày", attendanceEnabled: true, photoRequired: true, gpsRequired: true, offlineEnabled: true, allowedAccuracyThresholdMeters: 100, earlyCheckinWindowMinutes: 0, lateThresholdMinutes: 5, shiftName: "Ca ngày", shiftStart: "08:00", shiftEnd: "17:00", timezone: "Asia/Ho_Chi_Minh" } };
    render(<CurrentUserProvider user={{ id: "repeat-camera", username: "camera", displayName: "Giám sát", email: "camera@example.invalid", status: "active", permissions: ["attendance.self.create"] }}><AttendanceCameraExperience initialCapture initialDashboard={dashboard} /></CurrentUserProvider>);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    const checkout = screen.getByRole("button", { name: "Chấm ra" });
    fireEvent.click(checkout);
    expect(checkout).toBeDisabled();
    expect(screen.getByRole("button", { name: "Chấm vào" })).toBeEnabled();
  });
  it("requests the camera immediately while the dashboard request is still pending", async () => {
    const getUserMedia = vi.fn(() => new Promise<MediaStream>(() => undefined));
    vi.stubGlobal("isSecureContext", true);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    render(<CurrentUserProvider user={{ id: "immediate-camera", username: "camera", displayName: "Giám sát", email: "camera@example.invalid", status: "active", permissions: ["attendance.self.create"] }}><AttendanceCameraExperience initialCapture /></CurrentUserProvider>);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Camera chấm công")).toBeInTheDocument();
    expect(screen.queryByText("Đang tải trạng thái hôm nay")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chụp và chấm công" })).toBeDisabled();
  });
});
