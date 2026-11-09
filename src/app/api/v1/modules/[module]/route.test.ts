// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSystemSettings } from "@/config/systemSettings";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

const mocks = vi.hoisted(() => ({ user: vi.fn(), read: vi.fn(), publish: vi.fn() }));
vi.mock("@/services/auth/getRequestUser", () => ({ getRequestUser: mocks.user }));
vi.mock("@/services/system-settings/systemSettingsService", () => ({ readModuleSettings: mocks.read, publishSettingsGroup: mocks.publish }));
import { PATCH } from "./route";

const admin: AuthenticatedUser = { id: "admin", username: "admin", displayName: "Admin", email: "admin@example.com", status: "active", permissions: ["system_admin.access", "module.manage"] };
const update = (module = "warehouse", payload: unknown = { enabled: false }) => PATCH(new Request(`http://localhost/api/v1/modules/${module}`, { method: "PATCH", body: JSON.stringify(payload) }), { params: Promise.resolve({ module }) });

describe("admin module locking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue(admin);
    mocks.read.mockResolvedValue({ ...defaultSystemSettings.modules, projects: false });
    mocks.publish.mockImplementation(async ({ value }) => ({ value, version: 2 }));
  });

  it.each([null, { ...admin, permissions: ["system_admin.access"] }, { ...admin, permissions: ["module.manage"] }, { ...admin, status: "disabled" }])("rejects an unauthorized or disabled actor", async (actor) => {
    mocks.user.mockResolvedValue(actor);
    const response = await update();
    expect(response.status).toBe(actor ? 403 : 401);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it("publishes the selected lock with the actor and preserves other saved locks", async () => {
    expect((await update()).status).toBe(200);
    expect(mocks.publish).toHaveBeenCalledWith({ group: "modules", actorId: "admin", value: { ...defaultSystemSettings.modules, projects: false, warehouse: false } });
  });

  it("allows reopening HR and does not provide a lock for the administration console", async () => {
    expect((await update("human_resources", { enabled: true })).status).toBe(200);
    expect((await update("system")).status).toBe(404);
    expect(mocks.publish).toHaveBeenCalledTimes(1);
  });

  it.each([{ enabled: "false" }, { enabled: false, other: true }, {}])("rejects invalid lock commands", async (payload) => {
    expect((await update("warehouse", payload)).status).toBe(400);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});
