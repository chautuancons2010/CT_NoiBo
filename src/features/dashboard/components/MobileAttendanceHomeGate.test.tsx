import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Permission } from "@/lib/auth/permissions";

const state = vi.hoisted(() => ({ mobile: null as boolean | null, permissions: ["worker_attendance.create", "dashboard.view"] as Permission[], replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock("@/lib/ui/useMobileViewport", () => ({ useMobileViewport: () => state.mobile }));
vi.mock("@/components/providers/CurrentUserProvider", () => ({ useCurrentUser: () => ({ id: "engineer", username: "engineer", displayName: "Giám sát", status: "active", permissions: state.permissions }) }));
import { MobileAttendanceHomeGate } from "./MobileAttendanceHomeGate";
afterEach(cleanup);
beforeEach(() => { state.mobile = null; state.permissions = ["worker_attendance.create", "dashboard.view"]; state.replace.mockReset(); });
const page = () => render(<MobileAttendanceHomeGate><h1>Thống kê công trường</h1></MobileAttendanceHomeGate>);
describe("supervisor mobile dashboard entry", () => {
  it("does not flash site charts before the viewport is known", () => {
    page();
    expect(screen.queryByRole("heading", { name: "Thống kê công trường" })).not.toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
  });
  it("replaces a saved mobile dashboard session with Personal", () => {
    state.mobile = true;
    page();
    expect(screen.queryByRole("heading", { name: "Thống kê công trường" })).not.toBeInTheDocument();
    expect(state.replace).toHaveBeenCalledWith("/personal");
  });
  it("preserves the supervisor dashboard on desktop", () => {
    state.mobile = false;
    page();
    expect(screen.getByRole("heading", { name: "Thống kê công trường" })).toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
  });
  it("preserves a different role dashboard on a phone", () => {
    state.mobile = true; state.permissions = ["attendance.view_all", "dashboard.view"];
    page();
    expect(screen.getByRole("heading", { name: "Thống kê công trường" })).toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
  });
});
