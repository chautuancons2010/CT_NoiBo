// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { defaultSystemSettings } from "@/config/systemSettings";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/services/system-settings/systemSettingsService", () => ({ readModuleSettings: mocks.read }));
vi.mock("@/lib/testing/policy.mjs", () => ({ stagingAuthorized: () => true, sessionCookieNames: () => ({ access: "test-access", refresh: "test-refresh" }) }));
import { proxy } from "@/proxy";

describe("module request gate", () => {
  beforeEach(() => { mocks.read.mockReset(); mocks.read.mockResolvedValue({ ...defaultSystemSettings.modules, warehouse: false }); });

  it.each(["GET", "POST", "PATCH", "DELETE"])("blocks a locked module API for %s", async (method) => {
    const response = await proxy(new NextRequest("http://localhost/api/v1/warehouse/receipts/123", { method }));
    expect(response.status).toBe(423);
    expect((await response.json()).error.code).toBe("MODULE_LOCKED");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("redirects direct page and RSC requests before rendering a locked module", async () => {
    const response = await proxy(new NextRequest("http://localhost/warehouse/inventory?_rsc=123", { headers: { RSC: "1" } }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/module-locked?module=warehouse");
  });

  it("allows the next request immediately after the module is reopened", async () => {
    const request = () => new NextRequest("http://localhost/api/v1/items");
    expect((await proxy(request())).status).toBe(423);
    mocks.read.mockResolvedValue(defaultSystemSettings.modules);
    expect((await proxy(request())).headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["/system-admin/modules", "/api/v1/modules/warehouse", "/api/v1/system-settings/modules", "/module-locked?module=warehouse", "/dashboard"])("keeps recovery route %s independent of module availability", async (path) => {
    mocks.read.mockRejectedValue(new Error("offline"));
    expect((await proxy(new NextRequest(`http://localhost${path}`))).status).toBe(200);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("does not reenable locked modules when the settings database fails", async () => {
    mocks.read.mockRejectedValue(new Error("offline"));
    expect((await proxy(new NextRequest("http://localhost/api/v1/items"))).status).toBe(503);
  });
});
