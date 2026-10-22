import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import { LeaveRequestDetail } from "./LeaveRequestDetail";
import type { LeaveRequest } from "@/features/leave/types/leaveTypes";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const viewport = vi.hoisted(() => ({ mobile: true }));
vi.mock("@/lib/ui/useMobileViewport", () => ({ useMobileViewport: () => viewport.mobile }));

afterEach(() => { vi.unstubAllGlobals(); viewport.mobile = true; });

const request: LeaveRequest = {
  id: "request-1", requestNumber: "TEST-LV-0001", employeeId: "employee-1", employeeCode: "NV01",
  employeeName: "—", departmentName: "—", positionName: "", leaveTypeId: "leave-type-1",
  leaveTypeName: "Nghỉ phép năm", deductsBalance: true, startDate: "2026-09-21", endDate: "2026-09-21",
  startDayPart: "full_day", endDayPart: "full_day", calculatedDays: 1, reason: "Nghỉ cá nhân",
  status: "pending_approval", version: 1, createdAt: "2026-09-19T08:00:00.000Z",
  warnings: [], approvalSteps: [], attachments: []
};

describe("mobile personal leave", () => {
  it("requests a leave detail within the employee's own scope", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Không tìm thấy đơn nghỉ." } }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<CurrentUserProvider user={{ id: "account-1", displayName: "Nhân viên", username: "employee", email: "employee@example.com", status: "active", permissions: ["leave.self.view"] }}><LeaveRequestDetail id="request-1" /></CurrentUserProvider>);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/leave-requests/request-1?scope=self", { cache: "no-store" }));
  });

  it("omits reference codes, empty fields and approval actions without a pending step", async () => {
    viewport.mobile = false;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: request }) }));
    render(<CurrentUserProvider user={{ id: "account-1", displayName: "Quản lý", username: "manager", email: "manager@example.com", status: "active", permissions: ["leave.approve_all"] }}><LeaveRequestDetail id="request-1" /></CurrentUserProvider>);

    expect(await screen.findByRole("heading", { name: "Nghỉ phép năm" })).toBeInTheDocument();
    expect(screen.getByText("21/09/2026")).toBeInTheDocument();
    expect(screen.queryByText("TEST-LV-0001")).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText("Chưa gửi duyệt.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Duyệt$/ })).not.toBeInTheDocument();
  });

  it("keeps approval actions when a real pending step exists", async () => {
    viewport.mobile = false;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {
      ...request,
      approvalSteps: [{ id: "step-1", stepOrder: 1, approverSource: "role", status: "pending" }]
    } }) }));
    render(<CurrentUserProvider user={{ id: "account-1", displayName: "Quản lý", username: "manager", email: "manager@example.com", status: "active", permissions: ["leave.approve_all"] }}><LeaveRequestDetail id="request-1" /></CurrentUserProvider>);

    expect(await screen.findByRole("button", { name: /^Duyệt$/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ý kiến" })).toBeInTheDocument();
  });
});
