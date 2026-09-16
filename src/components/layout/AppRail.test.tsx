import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppRail } from "@/components/layout/AppRail";
import { defaultSystemSettings } from "@/config/systemSettings";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

vi.mock("@/components/providers/SystemSettingsProvider", () => ({
  useSystemSettings: () => ({ settings: defaultSystemSettings })
}));

vi.mock("@/components/layout/AppLogo", () => ({
  AppLogo: () => <a href="/dashboard">Châu Tuấn</a>
}));

const user: AuthenticatedUser = {
  id: "account-1",
  displayName: "Nguyễn Văn Cường",
  username: "cuong",
  email: "cuong@example.com",
  status: "active",
  permissions: ["employee.view"]
};

describe("AppRail", () => {
  it("contains the launcher and current module navigation in one sidebar", () => {
    const onCollapsedChange = vi.fn();
    render(<AppRail collapsed={false} onCollapsedChange={onCollapsedChange} pathname="/employees" user={user} />);

    expect(screen.getByRole("complementary", { name: "Điều hướng Nhân sự" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở danh sách ứng dụng" })).toHaveAttribute("href", "/workspace");
    expect(screen.getByRole("link", { name: "Nhân viên" })).toHaveAttribute("href", "/employees");

    fireEvent.click(screen.getByRole("button", { name: "Thu gọn điều hướng" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });
});
