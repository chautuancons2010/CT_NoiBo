import { describe, expect, it, vi } from "vitest";

import { captureAttendanceLocation } from "./locationCapture";

const position = { coords: { latitude: 10.7769, longitude: 106.7009, accuracy: 25 }, timestamp: Date.parse("2026-10-05T01:00:00Z") } as GeolocationPosition;
const failure = (code: number) => ({ code }) as GeolocationPositionError;

describe("attendance GPS capture", () => {
  it("gets fresh high accuracy coordinates", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success(position));
    await expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).resolves.toEqual({ latitude: 10.7769, longitude: 106.7009, accuracy: 25, capturedAt: "2026-10-05T01:00:00.000Z" });
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 });
  });

  it("tries network positioning after GPS times out and preserves its accuracy", async () => {
    const getCurrentPosition = vi.fn().mockImplementationOnce((_success: PositionCallback, error: PositionErrorCallback) => error(failure(3))).mockImplementationOnce((success: PositionCallback) => success({ ...position, coords: { ...position.coords, accuracy: 20000 } }));
    await expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).resolves.toMatchObject({ accuracy: 20000 });
    expect(getCurrentPosition).toHaveBeenLastCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: false, timeout: 8_000, maximumAge: 0 });
  });

  it("keeps denied permission explicit and does not repeat the request", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => error(failure(1)));
    await expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).rejects.toMatchObject({ code: "denied" });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("reports a timeout when neither positioning mode can obtain a fix", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => error(failure(3)));
    await expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).rejects.toMatchObject({ code: "timeout" });
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("rejects insecure contexts and missing browser support without fabricating coordinates", async () => {
    const getCurrentPosition = vi.fn();
    await expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, false)).rejects.toMatchObject({ code: "insecure" });
    await expect(captureAttendanceLocation(undefined, true)).rejects.toMatchObject({ code: "unsupported" });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("never accepts an invalid coordinate returned by a device", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ ...position, coords: { ...position.coords, latitude: NaN } }));
    await expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).rejects.toMatchObject({ code: "unavailable" });
  });
});
