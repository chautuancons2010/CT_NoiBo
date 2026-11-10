import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileAppLauncher } from "./MobileAppLauncher";
import { defaultSystemSettings } from "@/config/systemSettings";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

const state = vi.hoisted(() => ({ pathname: "/projects/one/team" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@/components/providers/SystemSettingsProvider", () => ({ useSystemSettings: () => ({ settings: defaultSystemSettings }) }));
vi.mock("./MobileNavigationContext", () => ({ useOptionalMobileNavigation: () => null }));
vi.mock("@/components/shared/Overlays", () => ({ Drawer: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <section role="dialog">{children}</section> : null }));
const user: AuthenticatedUser = { id: "supervisor", username: "supervisor", displayName: "Giám sát", email: "supervisor@example.com", status: "active", permissions: ["project.view", "worker_attendance.create", "worker_attendance.view", "attendance.self.view", "payslip.self.view", "leave.self.view"] };
beforeEach(() => { state.pathname = "/projects/one/team"; });
function open(actor = user) { render(<MobileAppLauncher user={actor}/>); fireEvent.click(screen.getByRole("button", { name: "Mở Ứng dụng của tôi" })); }

describe("personal utilities in the application sheet", () => {
  it("keeps history, own payslips and leave reachable while a project is open", () => {
    open();
    expect(screen.getByRole("link", { name: "Lịch công của tôi" })).toHaveAttribute("href", "/attendance/history");
    expect(screen.getByRole("link", { name: "Phiếu lương của tôi" })).toHaveAttribute("href", "/personal/payslips");
    expect(screen.getByRole("link", { name: "Nghỉ phép" })).toHaveAttribute("href", "/leave");
  });
  it("shows each utility only once on the personal home", () => {
    state.pathname = "/personal"; open();
    for (const name of ["Lịch công của tôi", "Phiếu lương của tôi", "Nghỉ phép"]) expect(screen.getAllByRole("link", { name })).toHaveLength(1);
  });
  it("filters personal utilities by the actual account permissions", () => {
    open({ ...user, permissions: ["project.view"] });
    expect(screen.queryByRole("link", { name: "Phiếu lương của tôi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nghỉ phép" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Lịch công của tôi" })).not.toBeInTheDocument();
  });
});
