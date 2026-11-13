vi.mock("@/config/featureRelease", async (importOriginal) => ({ ...await importOriginal<typeof import("@/config/featureRelease")>(), attendanceOnlyRelease: false, isReleasedFeaturePath: () => true }));
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it("contains only the current module navigation in the sidebar", () => {
    const onCollapsedChange = vi.fn();
    render(<AppRail collapsed={false} onCollapsedChange={onCollapsedChange} pathname="/employees" user={user} />);

    expect(screen.getByRole("complementary", { name: "Điều hướng Nhân sự" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mở danh sách ứng dụng" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nhân viên" })).toHaveAttribute("href", "/employees");

    fireEvent.click(screen.getByRole("button", { name: "Thu gọn điều hướng" }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("keeps each function directly accessible when the rail is collapsed", () => {
    render(<AppRail collapsed onCollapsedChange={vi.fn()} pathname="/employees" user={user} />);
    expect(screen.getByRole("link", {name:"Nhân viên"})).toHaveAttribute("href","/employees");
    expect(screen.getByRole("link", {name:"Phòng ban"})).toHaveAttribute("href","/employees/departments");
    fireEvent.focus(screen.getByRole("link",{name:"Nhân viên"}));
    expect(screen.getByRole("tooltip",{name:"Nhân viên"})).toBeInTheDocument();
  });

  it("preserves the full HR function list on its dashboard and employee records", async () => {
    const manager: AuthenticatedUser={...user,permissions:["dashboard.view","employee.view","contract.view","insurance.view","attendance.view_all","shift.view"]};
    const view=render(<AppRail collapsed={false} onCollapsedChange={vi.fn()} pathname="/dashboard" user={manager} />);
    for(const name of ["Nhân viên","Phòng ban","Hợp đồng","Bảo hiểm xã hội","Bảng công","Cấu hình chấm công"]) expect(screen.getByRole("link",{name})).toBeInTheDocument();
    view.rerender(<AppRail collapsed={false} onCollapsedChange={vi.fn()} pathname="/employees/employee-id/profile" user={manager} />);
    await waitFor(()=>expect(screen.getByRole("link",{name:"Nhân viên"})).toHaveAttribute("aria-current","page"));
    expect(screen.getByRole("link",{name:"Bảng công"})).toBeInTheDocument();
  });

  it("keeps a sole authorized function directly accessible without a group toggle", () => {
    render(<AppRail collapsed={false} onCollapsedChange={vi.fn()} pathname="/employees/departments" user={{ ...user, permissions: ["department.manage"] }} />);
    expect(screen.getByRole("link", { name: "Phòng ban" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Danh mục" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nhân viên" })).not.toBeInTheDocument();
  });

  it("lists each authorized application once with the restored ERP navigation", () => {
    render(<AppRail collapsed={false} onCollapsedChange={vi.fn()} pathname="/employees" user={{ ...user, permissions: ["employee.view", "warehouse.view", "payroll.view", "project.view"] }} />);
    expect(screen.getAllByRole("link", { name: "Kho" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Kế toán" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Gói / Công trường" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Nhân viên" })).toBeInTheDocument();
  });
});
