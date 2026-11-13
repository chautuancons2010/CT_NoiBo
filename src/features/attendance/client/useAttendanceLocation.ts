"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AttendanceCoordinates } from "../types/attendanceTypes";
import { captureAttendanceLocation } from "./locationCapture";

export function useAttendanceLocation(targetAccuracyMeters = 30) {
  const latest = useRef<AttendanceCoordinates | undefined>(undefined);
  const active = useRef<AbortController | undefined>(undefined);
  const generation = useRef(0);
  const [coordinates, setCoordinates] = useState<AttendanceCoordinates>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cancel = useCallback(() => { generation.current++; active.current?.abort(); active.current = undefined; setBusy(false); }, []);
  useEffect(() => () => { generation.current++; active.current?.abort(); }, []);

  const request = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const id = ++generation.current;
    latest.current = undefined; setCoordinates(undefined); setError(""); setBusy(true);
    const accept = (position: AttendanceCoordinates) => {
      if (generation.current !== id) return;
      latest.current = position; setCoordinates(position);
    };
    try {
      // Request the device directly in the click handler, including on iOS. Do
      // not wait for storage, reverse geocoding or a permissions query first.
      const position = await captureAttendanceLocation(navigator.geolocation, window.isSecureContext, { targetAccuracyMeters: Math.min(30, targetAccuracyMeters), maxWaitMs: 12_000, signal: controller.signal, onPosition: accept });
      accept(position);
      return generation.current === id ? position : undefined;
    } catch (caught) {
      if (generation.current === id && !(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "Chưa lấy được vị trí thiết bị.");
      return undefined;
    } finally { if (generation.current === id) { active.current = undefined; setBusy(false); } }
  }, [targetAccuracyMeters]);

  return { coordinates, latest, busy, error, request, cancel };
}
