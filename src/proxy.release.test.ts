// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { defaultSystemSettings } from "@/config/systemSettings";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/services/system-settings/systemSettingsService", () => ({ readModuleSettings: mocks.read }));
vi.mock("@/lib/testing/policy.mjs", () => ({ testSupervisorLoginOnly: () => false, stagingAuthorized: () => true, sessionCookieNames: () => ({ access: "access", refresh: "refresh", session: "session" }) }));
import { proxy } from "./proxy";

function actor(role: string, status = "active") {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ account: { status, account_roles: [{ roles: { code: role } }] } }] }));
}
const request = (path: string, method = "GET") => new NextRequest(`http://localhost${path}`, { method, headers: { cookie: "access=access-token; session=verified-session" } });
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-key");
  mocks.read.mockReset();
  mocks.read.mockResolvedValue({ ...defaultSystemSettings.modules, attendance: false, human_resources: false, warehouse: false });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("role release gate", () => {
  it("admits admin before reading module configuration, including a configuration outage", async () => {
    actor("admin"); mocks.read.mockRejectedValue(new Error("settings unavailable"));
    for (const path of ["/warehouse", "/api/v1/warehouse/receipts", "/accounting/payroll", "/employees", "/system-admin"]) expect((await proxy(request(path))).status).toBe(200);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("lets HR reach its existing page and API authorization without an added module lock", async () => {
    actor("hr");
    for (const path of ["/employees", "/personal", "/attendance/today", "/api/v1/worker-attendance/sessions"]) expect((await proxy(request(path))).status).toBe(200);
    expect(mocks.read).not.toHaveBeenCalled();
    for (const path of ["/projects", "/warehouse", "/system-admin", "/messages"]) expect((await proxy(request(path))).status).toBe(200);
    for (const path of ["/api/v1/projects", "/api/v1/worker-attendance/sessions", "/api/v1/warehouse/receipts"]) expect((await proxy(request(path, "POST"))).status).toBe(200);
  });
  it("does not grant an admin bypass to a disabled account", async () => {
    actor("admin", "disabled");
    expect((await proxy(request("/api/v1/warehouse/receipts"))).status).toBe(423);
  });
});
