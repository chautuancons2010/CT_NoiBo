import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captureAttendanceLocation } from "./locationCapture";

const position = { coords: { latitude: 10.7769, longitude: 106.7009, accuracy: 25 }, timestamp: Date.parse("2026-10-05T01:00:00Z") } as GeolocationPosition;
const failure = (code: number) => ({ code }) as GeolocationPositionError;
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(position.timestamp); });
afterEach(() => vi.useRealTimers());

describe("attendance GPS capture", () => {
  it.each([0.001, 1000])("converts a fresh provider timestamp unit without inventing a capture instant (%s)", async factor => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ ...position, timestamp: position.timestamp * factor }));
    await expect(captureAttendanceLocation({getCurrentPosition} as unknown as Geolocation,true)).resolves.toMatchObject({capturedAt:"2026-10-05T01:00:00.000Z"});
  });
  it("gets fresh high accuracy coordinates", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success(position));
    await expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).resolves.toEqual({ latitude: 10.7769, longitude: 106.7009, accuracy: 25, capturedAt: "2026-10-05T01:00:00.000Z" });
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 });
  });

  it("returns the best available accuracy after refinement so callers can record it for review", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ ...position, coords: { ...position.coords, accuracy: 20000 } }));
    const assertion = expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).resolves.toMatchObject({ accuracy: 20000, capturedAt: "2026-10-05T01:00:00.000Z" });
    await vi.advanceTimersByTimeAsync(35_000);
    await assertion;
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 });
  });

  it("keeps denied permission explicit and does not repeat the request", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => error(failure(1)));
    await expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).rejects.toMatchObject({ code: "denied" });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("reports a timeout when neither positioning mode can obtain a fix", async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => error(failure(3)));
    const assertion = expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(35_000);
    await assertion;
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("rejects insecure contexts and missing browser support without fabricating coordinates", async () => {
    const getCurrentPosition = vi.fn();
    await expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, false)).rejects.toMatchObject({ code: "insecure" });
    await expect(captureAttendanceLocation(undefined, true)).rejects.toMatchObject({ code: "unsupported" });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("never accepts an invalid coordinate returned by a device", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ ...position, coords: { ...position.coords, latitude: NaN } }));
    const assertion = expect(captureAttendanceLocation({ getCurrentPosition } as unknown as Geolocation, true)).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(35_000);
    await assertion;
  });

  it("stops the GPS watcher and deadline when capture is cancelled", async () => {
    const controller = new AbortController(), clearWatch = vi.fn();
    const geo = { watchPosition: vi.fn(() => 42), clearWatch, getCurrentPosition: vi.fn() } as unknown as Geolocation;
    const assertion = expect(captureAttendanceLocation(geo, true, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await assertion;
    expect(clearWatch).toHaveBeenCalledWith(42);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("waits for a precise fresh fix and stops watching when it arrives", async () => {
    let receive!: PositionCallback;
    const clearWatch = vi.fn();
    const geo = { watchPosition: vi.fn(callback => { receive = callback; return 77; }), clearWatch, getCurrentPosition: vi.fn() } as unknown as Geolocation;
    const captured = captureAttendanceLocation(geo, true, { targetAccuracyMeters: 50 });
    receive({ ...position, coords: { ...position.coords, accuracy: 8000 } });
    await vi.advanceTimersByTimeAsync(500);
    receive({ ...position, timestamp: Date.now(), coords: { ...position.coords, accuracy: 12 } });
    await expect(captured).resolves.toMatchObject({ accuracy: 12 });
    expect(clearWatch).toHaveBeenCalledWith(77);
    expect(vi.getTimerCount()).toBe(0);
  });
});
