"use client";

import { useEffect } from "react";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { moduleSettingsSchema } from "@/config/systemSettings";

export function useModuleAvailability(pathname: string) {
  const { updateGroup } = useSystemSettings();
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await fetch("/api/v1/modules", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const body = await response.json();
        const parsed = moduleSettingsSchema.safeParse(body.data?.modules);
        if (!controller.signal.aborted && parsed.success) updateGroup("modules", parsed.data);
      } catch {
        // Keep the last known state; the server still checks every module request.
      } finally {
        pending = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, updateGroup]);
}
