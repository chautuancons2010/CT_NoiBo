import { beforeEach, describe, expect, it, vi } from "vitest";
import { preparePersonalAttendancePhoto } from "./personalPhotoStamp";
import { lookupAttendanceAddress } from "./attendanceAddressClient";
import { processAttendanceImage } from "./imageProcessing";
vi.mock("./attendanceAddressClient", () => ({ lookupAttendanceAddress: vi.fn() }));
vi.mock("./imageProcessing", () => ({ processAttendanceImage: vi.fn() }));
const capture = { capturedAtClient: "2026-11-09T06:20:15.000Z", intendedType: "check_in" as const, capturedByName: "Nguyễn Văn An", capturedByUsername: "NV001" };
const location = { capturedAt: capture.capturedAtClient, latitude: 10.7769, longitude: 106.7009, accuracy: 8 };
const raw = { photo: new Blob(["photo"]), thumbnail: new Blob(["thumbnail"]), width: 1600, height: 1200, previewUrl: "blob:raw" };
beforeEach(() => { vi.clearAllMocks(); });
describe("personal photo address validation", () => {
  it("keeps evidence without inventing GPS when the device has no fix", async () => {
    vi.mocked(processAttendanceImage).mockResolvedValue(raw);
    const result = await preparePersonalAttendancePhoto(raw, capture);
    expect(result.stamp.latitude).toBeUndefined();
    expect(result.stamp.address).toContain("Cần xác minh");
    expect(result.stamp.capturedAt).toBe(capture.capturedAtClient);
    expect(result.stamp).toMatchObject({ capturedByName: "Nguyễn Văn An", capturedByUsername: "NV001" });
  });
  it("retains original GPS and capture time while offline without inventing an address", async () => {
    vi.mocked(lookupAttendanceAddress).mockResolvedValue({ status: "unavailable" });
    vi.mocked(processAttendanceImage).mockResolvedValue(raw);
    const result = await preparePersonalAttendancePhoto(raw, capture, location);
    expect(result.stamp.address).toContain("GPS 10.776900, 106.700900");
    expect(result.stamp.capturedAt).toBe(capture.capturedAtClient);
    expect(processAttendanceImage).toHaveBeenCalledOnce();
  });
  it("passes original capture time and real address to both-derivative processing", async () => {
    vi.mocked(lookupAttendanceAddress).mockResolvedValue({ status: "resolved", address: "12 Nguyễn Huệ, TP. Hồ Chí Minh" });
    vi.mocked(processAttendanceImage).mockResolvedValue(raw);
    const result = await preparePersonalAttendancePhoto(raw, capture, location, true);
    expect(processAttendanceImage).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ capturedAt: capture.capturedAtClient, address: "12 Nguyễn Huệ, TP. Hồ Chí Minh", latitude: location.latitude, longitude: location.longitude }));
    expect(result.stamp).toMatchObject({ version: 1, capturedAt: capture.capturedAtClient });
  });
});
