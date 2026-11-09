import { beforeEach, describe, expect, it, vi } from "vitest";

const getClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServiceClient: getClient }));
import { defaultSystemSettings } from "@/config/systemSettings";
import { readModuleSettings, readSettingsGroup, resetLocalSystemSettingsForTests } from "./systemSettingsService";

describe("authoritative module settings", () => {
  beforeEach(() => { getClient.mockReset(); resetLocalSystemSettingsForTests(); });

  function databaseResult(result: unknown) {
    const read = vi.fn().mockResolvedValue(result);
    getClient.mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ abortSignal: () => ({ maybeSingle: read }) }) }) }) });
    return read;
  }

  it("observes locks from another server worker without using the settings cache", async () => {
    const read = databaseResult({ data: { value: defaultSystemSettings.modules }, error: null });
    expect((await readSettingsGroup("modules")).warehouse).toBe(true);
    read.mockResolvedValue({ data: { value: { ...defaultSystemSettings.modules, warehouse: false } }, error: null });
    expect((await readSettingsGroup("modules")).warehouse).toBe(false);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it.each([
    { data: null, error: { code: "UNAVAILABLE" } },
    { data: null, error: null },
    { data: { value: { warehouse: false } }, error: null }
  ])("does not replace unavailable or invalid settings with enabled defaults", async (result) => {
    databaseResult(result);
    await expect(readModuleSettings()).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 503 });
  });

  it("upgrades old stored settings without losing any existing locks", async () => {
    const legacy = Object.fromEntries(Object.entries(defaultSystemSettings.modules).filter(([key]) => !["accounting", "operations"].includes(key)));
    databaseResult({ data: { value: { ...legacy, warehouse: false } }, error: null });
    expect(await readModuleSettings()).toMatchObject({ warehouse: false, accounting: true, operations: true });
  });

  it("shares a short request snapshot and refreshes it after five seconds", async () => {
    vi.useFakeTimers();
    try {
      const read = databaseResult({ data: { value: defaultSystemSettings.modules }, error: null });
      await readModuleSettings({ maxAgeMs: 5000 });
      await readModuleSettings({ maxAgeMs: 5000 });
      expect(read).toHaveBeenCalledTimes(1);
      read.mockResolvedValue({ data: { value: { ...defaultSystemSettings.modules, attendance: false } }, error: null });
      vi.advanceTimersByTime(5001);
      expect((await readModuleSettings({ maxAgeMs: 5000 })).attendance).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it("keeps a recently verified lock during a temporary database failure", async () => {
    const read = databaseResult({ data: { value: { ...defaultSystemSettings.modules, attendance: false } }, error: null });
    await readModuleSettings();
    read.mockResolvedValue({ data: null, error: { code: "UNAVAILABLE" } });
    expect((await readModuleSettings({ allowStaleOnError: true })).attendance).toBe(false);
    await expect(readModuleSettings()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
