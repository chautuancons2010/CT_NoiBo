import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "./UserMenu";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ clearSupabaseRealtimeAuthentication: vi.fn() }));

describe("UserMenu", () => {
  it("exposes own password security without requiring employee or user-management permissions", () => {
    render(<UserMenu user={{ id: "standalone", displayName: "Quản trị", username: "admin", email: "admin@example.invalid", status: "active", employeeId: null, permissions: ["profile.view"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Tài khoản" }));
    expect(screen.getByRole("menuitem", { name: "Đổi mật khẩu" })).toHaveAttribute("href", "/profile/password");
    expect(screen.queryByText("Thiết lập tài khoản")).not.toBeInTheDocument();
  });
});
