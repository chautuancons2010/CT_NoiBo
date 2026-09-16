import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppHeader } from "@/components/layout/AppHeader";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

vi.mock("@/components/providers/SystemSettingsProvider", () => ({
  useBranding: () => ({ systemName: "Hệ thống nội bộ Châu Tuấn" })
}));
vi.mock("@/components/layout/AppLogo", () => ({
  AppLogo: () => <span aria-label="Châu Tuấn" />
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
  it("does not render the module or current route title", () => {
    render(<AppHeader connectionState="connected" pathname="/dashboard" user={user} />);
    expect(screen.queryByText("Tổng quan")).not.toBeInTheDocument();
    expect(screen.getByText("Đồng bộ tức thời")).toBeInTheDocument();
    expect(screen.getByText("Tìm kiếm")).toBeInTheDocument();
  });
});
