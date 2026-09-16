import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultSystemSettings } from "@/config/systemSettings";
import { WorkspaceView } from "@/features/workspace/WorkspaceView";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

const warehouseUser: AuthenticatedUser = {
  id: "user-1",
  displayName: "Nguyễn Văn Cường",
  username: "cuong",
  email: "cuong@example.com",
  status: "active",
  permissions: ["warehouse.view"]
};

describe("WorkspaceView", () => {
  it("renders accessible and locked applications without exposing a locked link", () => {
    render(
      <WorkspaceView
        modules={defaultSystemSettings.modules}
        navigation={defaultSystemSettings.navigation}
        today="Thứ ba, 15 tháng 9"
        user={warehouseUser}
      />
    );

    expect(screen.getByRole("link", { name: "Kho" })).toHaveAttribute("href", "/warehouse");
    expect(screen.queryByRole("link", { name: "Nhân sự" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nhân sự" }));
    expect(screen.getByRole("status")).toHaveTextContent("không có quyền truy cập ứng dụng Nhân sự");
  });
});
