import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page from "./page";

const { getEmployeeDataSetAsync } = vi.hoisted(() => ({ getEmployeeDataSetAsync: vi.fn() }));
vi.mock("@/services/auth/getRequestUser", () => ({ getRequestUser: async () => ({ id: "admin", displayName: "Quản trị viên", username: "admin", employeeId: null, status: "active", permissions: ["profile.view", "attendance.manage"] }) }));
vi.mock("@/features/employees/services/employeeRepository", () => ({ getEmployeeDataSetAsync }));
vi.mock("@/features/workspace/PersonalUiSettings", () => ({ PersonalUiSettings: () => null }));
vi.mock("@/features/auth/components/ChangePasswordForm", () => ({ ChangePasswordForm: () => <button>Đổi mật khẩu</button> }));
vi.mock("@/features/auth/components/LogoutButton", () => ({ LogoutButton: () => <button>Đăng xuất</button> }));

describe("account profile", () => {
  it("offers password change for a management account independently of employee records", async () => {
    render(await Page());
    expect(screen.getByRole("button", { name: "Đổi mật khẩu" })).toBeInTheDocument();
    expect(screen.getByText("admin", { selector: "small" })).toBeInTheDocument();
    expect(screen.getByText("Đang hoạt động")).toBeInTheDocument();
    expect(screen.queryByText(/chưa liên kết/)).not.toBeInTheDocument();
    expect(getEmployeeDataSetAsync).not.toHaveBeenCalled();
  });
});
