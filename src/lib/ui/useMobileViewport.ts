"use client";

import { useCallback, useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(query: string, onChange: () => void) {
  if (typeof window.matchMedia !== "function") {
    window.addEventListener("resize", onChange);
    return () => window.removeEventListener("resize", onChange);
  }
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function snapshot(query: string) {
  return typeof window.matchMedia === "function" ? window.matchMedia(query).matches : window.innerWidth <= 767;
}

export function useMobileViewport(query = MOBILE_QUERY): boolean | null {
  const listen = useCallback((onChange: () => void) => subscribe(query, onChange), [query]);
  const read = useCallback(() => snapshot(query), [query]);
  return useSyncExternalStore(listen, read, () => null);
}
