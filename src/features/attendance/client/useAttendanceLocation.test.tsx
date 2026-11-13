import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAttendanceLocation } from "./useAttendanceLocation";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("requests fresh device location on every click and never reuses the prior location after denial", async () => {
  vi.stubGlobal("isSecureContext", true);
  const getCurrentPosition = vi.fn().mockImplementationOnce(success => success({ coords: { latitude: 10, longitude: 106, accuracy: 8 }, timestamp: Date.now() })).mockImplementationOnce((_success, failed) => failed({ code: 1 }));
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  const { result } = renderHook(() => useAttendanceLocation());
  await act(async () => { await result.current.request(); });
  expect(result.current.coordinates).toMatchObject({ latitude: 10, accuracy: 8 });
  await act(async () => { await result.current.request(); });
  expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  expect(result.current.coordinates).toBeUndefined();
  expect(result.current.error).toContain("quyền vị trí");
  expect(result.current.busy).toBe(false);
});

it("lets the user cancel a stalled iPhone request and releases controls within the bounded deadline", async () => {
  vi.useFakeTimers(); vi.stubGlobal("isSecureContext", true);
  const clearWatch = vi.fn();
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { watchPosition: vi.fn(() => 7), clearWatch, getCurrentPosition: vi.fn() } });
  const { result } = renderHook(() => useAttendanceLocation());
  let pending: Promise<unknown>;
  act(() => { pending = result.current.request(); });
  expect(result.current.busy).toBe(true);
  await act(async () => { result.current.cancel(); await pending; });
  expect(clearWatch).toHaveBeenCalledWith(7);expect(result.current.busy).toBe(false);
  act(() => { pending = result.current.request(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(12_001); await pending; });
  expect(result.current.busy).toBe(false);expect(result.current.error).toContain("GPS");
});
