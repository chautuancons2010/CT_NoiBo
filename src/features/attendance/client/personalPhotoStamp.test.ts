import { beforeEach, describe, expect, it, vi } from "vitest";
import { preparePersonalAttendancePhoto } from "./personalPhotoStamp";
import { lookupAttendanceAddress } from "./attendanceAddressClient";
import { processAttendanceImage } from "./imageProcessing";
vi.mock("./attendanceAddressClient", () => ({ lookupAttendanceAddress: vi.fn() }));
vi.mock("./imageProcessing", () => ({ processAttendanceImage: vi.fn() }));
const capture = { capturedAtClient: "2026-11-09T06:20:15.000Z", intendedType: "check_in" as const };
const location = { capturedAt: capture.capturedAtClient, latitude: 10.7769, longitude: 106.7009, accuracy: 8 };
const raw = { photo: new Blob(["photo"]), thumbnail: new Blob(["thumbnail"]), width: 1600, height: 1200, previewUrl: "blob:raw" };
beforeEach(() => { vi.clearAllMocks(); });
describe("personal photo address validation", () => {
  it("requires actual GPS and does not invent a worksite address", async () => {
    await expect(preparePersonalAttendancePhoto(raw, capture)).rejects.toMatchObject({ code: "LOCATION_REQUIRED" });
    expect(processAttendanceImage).not.toHaveBeenCalled();
  });
  it("requires a resolved street address before encoding", async () => {
    vi.mocked(lookupAttendanceAddress).mockResolvedValue({ status: "unavailable" });
    await expect(preparePersonalAttendancePhoto(raw, capture, location)).rejects.toMatchObject({ code: "ADDRESS_REQUIRED" });
    expect(processAttendanceImage).not.toHaveBeenCalled();
  });
  it("passes original capture time and real address to both-derivative processing", async () => {
    vi.mocked(lookupAttendanceAddress).mockResolvedValue({ status: "resolved", address: "12 Nguyễn Huệ, TP. Hồ Chí Minh" });
    vi.mocked(processAttendanceImage).mockResolvedValue(raw);
    const result = await preparePersonalAttendancePhoto(raw, capture, location, true);
    expect(processAttendanceImage).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ capturedAt: capture.capturedAtClient, address: "12 Nguyễn Huệ, TP. Hồ Chí Minh", latitude: location.latitude, longitude: location.longitude }));
    expect(result.stamp).toMatchObject({ version: 1, capturedAt: capture.capturedAtClient });
  });
});
