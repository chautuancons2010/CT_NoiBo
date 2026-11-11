import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppHeader } from "@/components/layout/AppHeader";
vi.mock("@/components/layout/ApplicationChrome.module.css", () => ({ default: { header: "chrome-header" } }));
import type { AuthenticatedUser } from "@/lib/auth/permissions";

vi.mock("@/components/providers/SystemSettingsProvider", () => ({
  useBranding: () => ({ systemName: "Hệ thống nội bộ Châu Tuấn" }),
  useOrganizationSettings: () => ({ shortName: "Châu Tuấn" })
}));
vi.mock("@/components/layout/AppLogo", () => ({
  AppLogo: () => <span aria-label="Châu Tuấn" />
}));
vi.mock("@/components/layout/MobileAppLauncher", () => ({
  MobileAppLauncher: () => <button aria-label="Mở Ứng dụng của tôi" />
}));
vi.mock("@/features/search/components/CommandPalette", () => ({
  CommandPalette: () => <button>Tìm kiếm</button>
}));
vi.mock("@/features/shared-platforms/components/NotificationBell", () => ({
  NotificationBell: () => <button>Thông báo</button>
}));
vi.mock("@/components/shared/UserMenu", () => ({
  UserMenu: () => <button>Tài khoản</button>
}));

const user: AuthenticatedUser = { id: "account-1", displayName: "Nguyễn Thị Thúy Hằng", username: "thuyhang", email: "hang@example.com", status: "active", permissions: [] };

describe("AppHeader", () => {
  it("renders the brand without a duplicate launcher on a mobile root screen", () => {
    render(<AppHeader connectionState="connected" pathname="/dashboard" user={user} />);
    expect(screen.getByText("Châu Tuấn")).toBeInTheDocument();
    expect(screen.queryByText("Đồng bộ tức thời")).not.toBeInTheDocument();
    expect(screen.getByText("Tìm kiếm")).toBeInTheDocument();
    expect(within(document.querySelector(".app-header__mobile-leading") as HTMLElement).queryByRole("button", { name: "Mở Ứng dụng của tôi" })).not.toBeInTheDocument();
  });

  it("omits the duplicate launcher on non-dashboard screens", () => {
    render(<AppHeader connectionState="connected" pathname="/employees" user={user} />);
    expect(screen.getByRole("navigation", { name: "Vị trí hiện tại" })).toHaveTextContent("Nhân viên");
    expect(within(document.querySelector(".app-header__desktop-leading") as HTMLElement).queryByRole("button", { name: "Mở Ứng dụng của tôi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thu gọn điều hướng" })).not.toBeInTheDocument();
  });

  it.each(["/projects", "/projects/project-one/team", "/settings/attendance", "/worker-attendance/today"])("keeps the same mobile brand toolbar on %s", (pathname) => {
    render(<AppHeader backHrefOverride="/projects" connectionState="connected" pathname={pathname} user={user} />);
    const leading = document.querySelector(".app-header__mobile-leading") as HTMLElement;
    expect(within(leading).queryByRole("button", { name: "Mở Ứng dụng của tôi" })).not.toBeInTheDocument();
    expect(within(leading).getByLabelText("Châu Tuấn")).toBeInTheDocument();
    expect(within(leading).getByText("Châu Tuấn")).toBeInTheDocument();
    expect(within(leading).queryByRole("link", { name: "Quay lại" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thông báo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tài khoản" })).toBeInTheDocument();
    expect(document.querySelector(".app-header__mobile-menu")).toBeNull();
  });

  it("only shows realtime state when the connection needs attention", () => {
    const { rerender } = render(<AppHeader connectionState="reconnecting" pathname="/dashboard" user={user} />);
    expect(screen.getByText("Đang thử kết nối lại…")).toBeInTheDocument();
    rerender(<AppHeader connectionState="offline" pathname="/dashboard" user={user} />);
    expect(screen.getByText("Mất kết nối")).toBeInTheDocument();
  });
});
