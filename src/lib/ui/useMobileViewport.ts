"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") {
    window.addEventListener("resize", onChange);
    return () => window.removeEventListener("resize", onChange);
  }
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function snapshot() {
  return typeof window.matchMedia === "function" ? window.matchMedia(MOBILE_QUERY).matches : window.innerWidth <= 767;
}

export function useMobileViewport(): boolean | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
