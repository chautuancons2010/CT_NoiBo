import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardReadModel } from "../types";
import { DashboardView } from "./DashboardView";
import { defaultSystemSettings } from "@/config/systemSettings";

const viewport = vi.hoisted(() => ({ mobile: false }));

vi.mock("@/components/providers/CurrentUserProvider", () => ({ useCurrentUser: () => ({ displayName: "Nguyễn Thị Mai", username: "mai" }) }));
vi.mock("@/components/providers/SystemSettingsProvider", () => ({ useSystemSettings: () => ({ settings: defaultSystemSettings }) }));
vi.mock("@/components/shared/ModuleLauncher", () => ({ ModuleLauncher: () => <section aria-label="Ứng dụng của tôi"><h2>Ứng dụng của tôi</h2><a href="/personal">Cá nhân</a></section> }));
vi.mock("@/lib/realtime/useDomainReconciliation", () => ({ useDomainReconciliation: () => undefined }));
vi.mock("@/lib/ui/useMobileViewport", () => ({ useMobileViewport: () => viewport.mobile }));
beforeEach(() => { viewport.mobile = false; });
afterEach(cleanup);

describe("dashboard greeting and panels", () => {
  it("filters the actual work queue by category and expands remaining records", () => {
    const model: DashboardReadModel = {
      profile: "management", profileLabel: "Điều hành", generatedAt: "2026-11-05T03:00:00Z", widgets: [],
      attention: Array.from({ length: 8 }, (_, index) => ({ id: String(index), type: index % 2 ? "warehouse_item" : "approval", title: `Công việc mẫu ${index + 1}`, href: `/projects/sample-${index}` }))
    };
    render(<DashboardView initialModel={model} />);
    expect(screen.queryByText("Công việc mẫu 7")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Xem thêm/ }));
    expect(screen.getByText("Công việc mẫu 8")).toBeInTheDocument();
    const warehouseFilter = screen.getByRole("button", { name: /^Kho/ });
    fireEvent.click(warehouseFilter);
    expect(warehouseFilter).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Công việc mẫu 1")).not.toBeInTheDocument();
    expect(screen.getByText("Công việc mẫu 8")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Tất cả/ }));
    expect(screen.getByText("Công việc mẫu 1")).toBeInTheDocument();
    expect(screen.queryByText("Công việc mẫu 7")).not.toBeInTheDocument();
  });
  it("keeps accounting reporting periods visible when no payroll has been closed yet", () => {
    const model: DashboardReadModel = {
      profile: "accounting", profileLabel: "Kế toán", generatedAt: "2026-10-16T01:00:00Z", attention: [],
      widgets: [{ key: "accounting_summary", label: "Kế toán", status: "ready", data: { charts: [
        { key: "payroll-fund", title: "Thực nhận đã chốt", context: "05/2026 – 10/2026", emptyLabel: "Chưa có kỳ lương đã chốt trong 6 tháng này", series: [] },
        { key: "payslip-status", title: "Tiếp nhận phiếu lương", emptyLabel: "Chưa có phiếu lương đã phát hành", series: [] }
      ] } }]
    };
    render(<DashboardView initialModel={model} />);
    expect(screen.getByRole("heading", { name: "Thực nhận đã chốt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tiếp nhận phiếu lương" })).toBeInTheDocument();
    expect(screen.getByText("05/2026 – 10/2026")).toBeInTheDocument();
  });
  it("names the active business area and omits activity from an older read model", () => {
    const model: DashboardReadModel = {
      profile: "management", profileLabel: "Điều hành", generatedAt: "2026-10-12T01:00:00Z", attention: [],
      widgets: [{ key: "recent_activity", label: "Hoạt động gần đây", status: "ready", data: { items: [{ id: "one", type: "audit", title: "Hoạt động cũ", href: "/settings/audit-log" }] } }]
    };
    render(<DashboardView initialModel={model} />);
    expect(screen.getByRole("heading", { name: "Điều hành", level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("Hoạt động gần đây")).not.toBeInTheDocument();
    expect(screen.queryByText("Hoạt động cũ")).not.toBeInTheDocument();
  });
  it.each([false, true])("shows role actions and metrics before the work queue with applications still available (mobile: %s)", (mobile) => {
    viewport.mobile = mobile;
    const model: DashboardReadModel = {
      profile: "hr", profileLabel: "Nhân sự", generatedAt: "2026-10-12T01:00:00Z", attention: [],
      shortcuts: [{ key: "attendance.photos", label: "Kiểm tra ảnh chấm công", href: "/attendance/today", icon: "Camera" }],
      widgets: [{ key: "hr_summary", label: "Nhân sự", status: "ready", data: { metrics: [{ label: "Tổng nhân viên", value: 50 }] } }]
    };
    const { container } = render(<DashboardView initialModel={model} />);
    const launcher = container.querySelector("[data-dashboard-applications]");
    const greeting = screen.getByRole("heading", { name: "Nhân sự", level: 1 });
    const overview = screen.getByText("Quy mô đội ngũ");
    const work = container.querySelector("[data-dashboard-panel]")!;
    expect(overview.compareDocumentPosition(work) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(overview.closest("details")).toBeNull();
    const shortcut = screen.getByRole("link", { name: "Kiểm tra ảnh chấm công" });
    expect(shortcut).toHaveAttribute("href", "/attendance/today");
    expect(shortcut.compareDocumentPosition(overview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(greeting.compareDocumentPosition(launcher!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("region", { name: "Ứng dụng của tôi" })).toBeVisible();
    expect(screen.getByText("Tổng nhân viên")).toBeInTheDocument();
  });

  it("keeps charts expanded and does not reserve an empty chart column", () => {
    const model: DashboardReadModel = { profile: "hr", profileLabel: "Nhân sự", generatedAt: "2026-11-09T03:00:00Z", attention: [], widgets: [{ key: "hr_summary", label: "Nhân sự", status: "ready", data: { charts: [{ key: "hr-by-department", title: "Cơ cấu phòng ban", series: [{ label: "Nhân sự", value: 8 }] }] } }] };
    render(<DashboardView initialModel={model} />);
    expect(screen.getByRole("heading", { name: "Cơ cấu phòng ban" }).closest("details")).toBeNull();
  });

});
