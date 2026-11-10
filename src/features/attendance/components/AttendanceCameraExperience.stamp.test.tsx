import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import type { AttendanceDashboard } from "../types/attendanceTypes";
import { AttendanceCameraExperience } from "./AttendanceCameraExperience";

const mocks = vi.hoisted(() => ({ stamp: vi.fn(), save: vi.fn(), sync: vi.fn(), capture: vi.fn(), location: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/lib/realtime/useDomainReconciliation", () => ({ useDomainReconciliation: vi.fn() }));
vi.mock("../client/attendanceQueue", () => ({ countPendingAttendance: vi.fn().mockResolvedValue(0), listPendingAttendance: vi.fn().mockResolvedValue([]), savePendingAttendance: mocks.save }));
vi.mock("../client/attendanceSync", () => ({ syncAttendanceItem: mocks.sync, AttendanceSyncError: class extends Error {} }));
vi.mock("../client/imageProcessing", () => ({ captureAttendancePhoto: mocks.capture }));
vi.mock("../client/personalPhotoStamp", () => ({ preparePersonalAttendancePhoto: mocks.stamp }));
vi.mock("../client/locationCapture", () => ({ captureAttendanceLocation: mocks.location, AttendanceLocationError: class extends Error {} }));
vi.mock("../components/AttendanceLocationAddress", () => ({ AttendanceLocationAddress: () => <span>GPS</span> }));

const photo = { photo: new Blob(["raw-camera-jpeg"], { type: "image/jpeg" }), thumbnail: new Blob(["raw-thumbnail"], { type: "image/jpeg" }), width: 640, height: 480, previewUrl: "blob:original-photo" };
const dashboard: AttendanceDashboard = { accountId: "stamp-camera", employeeId: "employee", employeeName: "Giám sát", locations: [], nextAction: "check_in", todayEvents: [], policy: { id: "p", name: "Ca ngày", attendanceEnabled: true, photoRequired: true, gpsRequired: true, offlineEnabled: true, allowedAccuracyThresholdMeters: 100, earlyCheckinWindowMinutes: 0, lateThresholdMinutes: 5, shiftName: "Ca ngày", shiftStart: "08:00", shiftEnd: "17:00", timezone: "Asia/Ho_Chi_Minh" } };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) } });
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(2);
  vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(640);
  vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(480);
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
  mocks.capture.mockResolvedValue(photo);
  mocks.location.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); Reflect.deleteProperty(navigator, "mediaDevices"); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("personal capture stamp gate", () => {
  it.each(["Chưa có GPS", "Chưa lấy được địa chỉ", "Không thể ghi thông tin lên ảnh"])("retains the original image and never queues or uploads on %s", async message => {
    mocks.stamp.mockRejectedValueOnce(new Error(message));
    render(<CurrentUserProvider user={{ id: "stamp-camera", username: "camera", displayName: "Giám sát", email: "camera@example.invalid", status: "active", permissions: ["attendance.self.create"] }}><AttendanceCameraExperience initialCapture initialDashboard={dashboard} /></CurrentUserProvider>);
    const shutter = await screen.findByRole("button", { name: "Chụp và chấm vào" });
    await waitFor(() => expect(shutter).toBeEnabled());
    fireEvent.click(shutter);
    expect(await screen.findByText("Ảnh chưa được gửi")).toBeInTheDocument();
    expect(screen.getByAltText("Ảnh chấm công vừa chụp")).toHaveAttribute("src", photo.previewUrl);
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
    const capture = mocks.stamp.mock.calls[0][1];
    const stamped = { ...photo, photo: new Blob(["stamped-full-jpeg"], { type: "image/jpeg" }), thumbnail: new Blob(["stamped-thumbnail-jpeg"], { type: "image/jpeg" }), previewUrl: "blob:stamped-photo" };
    const metadata = { version: 1, capturedAt: capture.capturedAtClient, address: "12 Nguyễn Huệ, TP. Hồ Chí Minh", latitude: 10.7769, longitude: 106.7009 };
    mocks.stamp.mockResolvedValueOnce({ photo: stamped, stamp: metadata });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại và ghi nhận" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.capture).toHaveBeenCalledOnce();
    expect(mocks.stamp.mock.calls[1][1]).toEqual(capture);
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ capturedAtClient: capture.capturedAtClient, photo: stamped.photo, thumbnail: stamped.thumbnail, requiresPhotoStamp: true, photoStamp: metadata });
  });
});
