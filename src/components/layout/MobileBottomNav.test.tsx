import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileBottomNav } from "./MobileBottomNav";
import { defaultSystemSettings } from "@/config/systemSettings";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

vi.mock("@/components/providers/SystemSettingsProvider", () => ({ useSystemSettings: () => ({ settings: defaultSystemSettings }) }));
vi.mock("./MobileNavigationContext", () => ({ useMobileNavigation: () => ({ override: { items: [{ href: "/projects/one/today", label: "Công trường hôm nay", icon: "HardHat" }, { href: "/projects/one/team", label: "Đội ngũ", icon: "Users" }] } }) }));
vi.mock("./MobileAppLauncher", () => ({ MobileAppLauncher: () => <button>Ứng dụng</button> }));
const user: AuthenticatedUser = { id: "supervisor", username: "supervisor", displayName: "Giám sát", email: "supervisor@example.com", status: "active", permissions: ["project.view", "worker_attendance.view", "worker_attendance.create", "attendance.self.view"] };

describe("persistent mobile navigation", () => {
  it("keeps role destinations when a project registers its local shortcuts", () => {
    const view = render(<MobileBottomNav pathname="/personal" user={user}/>);
    const destinations = () => screen.getAllByRole("link").map(link => ({ href: link.getAttribute("href"), label: link.textContent }));
    const personal = destinations();
    expect(personal.map(item => item.href)).toEqual(["/personal", "/worker-attendance/today", "/projects", "/attendance/history"]);
    view.rerender(<MobileBottomNav pathname="/projects/one/team" user={user}/>);
    expect(destinations()).toEqual(personal);
    expect(screen.getByRole("link", { name: "Gói" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Đội ngũ" })).not.toBeInTheDocument();
    view.rerender(<MobileBottomNav pathname="/worker-attendance/sessions/one" user={user}/>);
    expect(destinations()).toEqual(personal);
    expect(screen.getByRole("link", { name: "Điểm danh" })).toHaveAttribute("aria-current", "page");
  });
});
