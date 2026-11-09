import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PayrollDetail, PayrollLine } from "../types";
import { PayrollDetailConsole } from "./PayrollDetailConsole";
vi.mock("@/components/shared/DataTable", () => ({ DataTable: ({ data, columns, actions, ariaLabel = "Lương nhân viên" }: { data: Array<PayrollLine & { employeeId: string }>; columns: Array<{ id: string; cell?: (item: PayrollLine) => unknown }>; actions?: (item: PayrollLine) => unknown; ariaLabel?: string }) => <table aria-label={ariaLabel}><tbody>{data.map(item => <tr key={item.id ?? item.employeeId}>{columns.map(column => <td key={column.id}>{column.cell?.(item) as React.ReactNode}</td>)}<td>{actions?.(item) as React.ReactNode}</td></tr>)}</tbody></table> }));
const permissions = { calculate: true, edit: true, lock: true, publish: true, export: true };
const employee = { employeeId: "employee-1", employeeCode: "NV01", employeeName: "Nguyễn Minh Anh", scheduledWorkdays: 22, actualWorkdays: 20, annualLeaveDays: 2, businessTripDays: 0, businessTripExtraDays: 0, dailyCount: 30, dailyWorkdays: 20, salaryHistoryId: "salary-1", contractSalary: 22_000_000, allowance: 1_000_000, bonus: 0, deduction: 0 };
const line: PayrollLine = { id: "line-1", employeeId: employee.employeeId, employeeCode: employee.employeeCode, employeeName: employee.employeeName, workDays: 20, baseSalary: 20_000_000, allowance: 1_000_000, bonus: 0, deduction: 0, netSalary: 21_000_000, rowVersion: 1, calculation: { salaryHistoryId: "salary-1" }, deliveryReady: true, deliveryAccount: { id: "recipient-1", username: "nv01", displayName: employee.employeeName } };
function period(status: PayrollDetail["status"] = "calculated"): PayrollDetail { return { id: "payroll-1", periodMonth: "2026-09-01", timesheetPeriodId: "timesheet-1", status, rowVersion: 2, lineCount: status === "draft" ? 0 : 1, grossTotal: 21_000_000, deductionTotal: 0, netTotal: 21_000_000, updatedAt: "2026-10-17T00:00:00Z", lines: status === "draft" ? [] : [{ ...line }], readiness: { timesheetId: "timesheet-1", timesheetName: "Tháng 09/2026", timesheetStatus: "locked", timesheetVersion: 1, calculatedTimesheetVersion: status === "draft" ? undefined : 1, payBasis: "actual", employees: [employee], openHighExceptions: 0 } }; }
const response = (data: PayrollDetail) => ({ ok: true, json: async () => ({ data }) });
async function openSend(scope: "all" | "individual") {
  fireEvent.click(await screen.findByRole("button", { name: "Gửi phiếu lương" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: scope === "all" ? "Gửi tất cả nhân viên" : "Chọn tài khoản nhận" }));
  const dialog = await screen.findByRole("dialog", { name: "Gửi phiếu lương" });
  await within(dialog).findByRole("combobox", { name: "Người nhận" });
  return dialog;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("simple accountant approval", () => {
  it("approves salary once, enables Excel, then sends everyone from the dropdown", async () => {
    let current = period(); const actions: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      if (init?.method !== "PATCH") return response(current);
      const payload = JSON.parse(String(init.body)); actions.push(payload);
      if (payload.action === "approve_salary") current = { ...current, status: "locked", rowVersion: 4 };
      if (payload.action === "publish") current = { ...current, status: "published", rowVersion: 5, lines: [{ ...line, payslipStatus: "published", payslipId: "slip-1", deliveryStatus: "delivered" }] };
      return response(current);
    }));
    render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    const approve = await screen.findByRole("button", { name: "Duyệt lương" });
    expect(screen.queryByRole("button", { name: "Xuất Excel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Khóa bảng lương" })).not.toBeInTheDocument();
    fireEvent.click(approve);
    expect(await screen.findByRole("link", { name: "Xuất Excel" })).toHaveAttribute("href", "/api/v1/accounting/payroll/payroll-1/export");
    fireEvent.click(screen.getByRole("button", { name: "Thao tác bảng lương" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Mở lại điều chỉnh" }));
    const reopen = await screen.findByRole("dialog");
    expect(within(reopen).queryByText("Phiếu đã gửi sẽ được thu hồi")).not.toBeInTheDocument();
    fireEvent.click(within(reopen).getByRole("button", { name: "Hủy" }));
    const send = await openSend("all");
    fireEvent.click(within(send).getByRole("button", { name: "Gửi 1 phiếu" }));
    await within(send).findByText("Kết quả gửi phiếu");
    expect(actions.map(item => [item.action, item.rowVersion])).toEqual([["approve_salary", 2], ["publish", 4]]);
  });
  it("selects one employee directly in the searchable dropdown", async () => {
    const current = period("locked"), actions: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      if (init?.method !== "PATCH") return response(current);
      actions.push(JSON.parse(String(init.body)));
      return response({ ...current, lines: [{ ...line, payslipStatus: "published", deliveryStatus: "delivered" }] });
    }));
    render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    const send = await openSend("individual");
    fireEvent.click(within(send).getByRole("combobox", { name: "Tài khoản nhận phiếu" }));
    fireEvent.click(await screen.findByRole("option", { name: /NV01/ }));
    fireEvent.click(within(send).getByRole("button", { name: "Gửi 1 phiếu" }));
    await waitFor(() => expect(actions).toEqual([{ action: "publish_employee", employeeId: employee.employeeId, rowVersion: 2 }]));
  });
  it("blocks approval when HR source data is incomplete", async () => {
    const current = period("draft"); current.readiness!.employees = [{ ...employee, salaryHistoryId: undefined, dailyCount: 0 }];
    vi.stubGlobal("fetch", vi.fn(async () => response(current)));
    render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    fireEvent.click(await screen.findByRole("button", { name: "Thao tác bảng lương" }));
    expect(await screen.findByRole("menuitem", { name: "Duyệt lương" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Thao tác bảng lương" }));
    expect(within(screen.getByRole("table", { name: "Nhân viên từ bảng công" })).getByText("Thiếu hồ sơ lương")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Tổng hợp bảng lương" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu (2)" }));
    const checks = await screen.findByRole("dialog", { name: "Dữ liệu cần kiểm tra" });
    expect(within(checks).getByText("Thiếu hồ sơ lương hiệu lực")).toBeInTheDocument();
    expect(within(checks).getByRole("link", { name: "Mở hồ sơ lương" })).toHaveAttribute("href", "/accounting/salaries");
    expect(screen.queryByRole("button", { name: "Gửi phiếu lương" })).not.toBeInTheDocument();
  });
  it("edits approved unsent salary and preserves values after a conflict", async () => {
    const fetchMock = vi.fn(async (_url, init) => init?.method === "PATCH" ? { ok: false, json: async () => ({ error: { message: "Kỳ lương vừa được cập nhật." } }) } : response(period("locked")));
    vi.stubGlobal("fetch", fetchMock); render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    fireEvent.click(await screen.findByRole("button", { name: "Thao tác lương Nguyễn Minh Anh" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Chỉnh sửa" }));
    const dialog = await screen.findByRole("dialog"), allowance = within(dialog).getByLabelText(/Phụ cấp/);
    fireEvent.change(allowance, { target: { value: "2500000" } });
    fireEvent.change(within(dialog).getByLabelText(/Lý do điều chỉnh/), { target: { value: "Điều chỉnh tiền ăn" } });
    fireEvent.submit(dialog.querySelector("form")!);
    expect(await within(dialog).findByText("Kỳ lương vừa được cập nhật.")).toBeInTheDocument();
    expect(allowance).toHaveValue(2_500_000);
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Lưu thay đổi" })).toBeEnabled());
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== "PATCH")).toHaveLength(2);
  });
  it("blocks bulk and individual delivery to missing accounts", async () => {
    const current = period("locked"); current.lines[0].deliveryReady = false;
    vi.stubGlobal("fetch", vi.fn(async () => response(current)));
    render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    const send = await openSend("all");
    expect(within(send).getByRole("button", { name: "Gửi 1 phiếu" })).toBeDisabled();
    expect(within(send).getByRole("status")).toHaveTextContent("1 nhân viên chưa có tài khoản hoạt động");
  });
  it("retries delivery without creating a new version", async () => {
    const current = period("published"); current.lines[0] = { ...line, payslipStatus: "published", payslipId: "slip-1", payslipVersion: 1, deliveryStatus: "failed" };
    const actions: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      if (init?.method !== "PATCH") return response(current);
      actions.push(JSON.parse(String(init.body)));
      return response({ ...current, lines: [{ ...current.lines[0], deliveryStatus: "delivered" }] });
    }));
    render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    const send = await openSend("individual");
    fireEvent.click(within(send).getByRole("combobox", { name: "Tài khoản nhận phiếu" }));
    fireEvent.click(await screen.findByRole("option", { name: /NV01/ }));
    fireEvent.click(within(send).getByRole("button", { name: "Gửi lại 1 phiếu" }));
    await waitFor(() => expect(actions).toEqual([{ action: "retry_delivery", rowVersion: 2, employeeId: employee.employeeId }]));
    expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).not.toBeInTheDocument();
  });
  it("shows source employees and filters reconciliation problems before calculation", async () => {
    const current = period("draft");
    current.readiness!.employees = [{ ...employee, dailyWorkdays: 19 }, { ...employee, employeeId: "employee-2", employeeCode: "NV02", employeeName: "Trần Bình" }];
    vi.stubGlobal("fetch", vi.fn(async () => response(current)));
    render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    const table = await screen.findByRole("table", { name: "Nhân viên từ bảng công" });
    expect(within(table).getByRole("link", { name: "Đối chiếu công" })).toHaveAttribute("href", "/timesheets/periods/timesheet-1/employees/employee-1");
    expect(within(table).getByText("Trần Bình")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Lọc nhân viên kỳ lương" })).getByRole("button", { name: "Cần xử lý 1" }));
    expect(within(table).queryByText("Trần Bình")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thao tác bảng lương" }));
    expect(await screen.findByRole("menuitem", { name: "Duyệt lương" })).toBeDisabled();
  });
  it("keeps salary lines visible after approving from the source readiness filter", async () => {
    let current = period("draft");
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => { if (init?.method === "PATCH") current = period("locked"); return response(current); }));
    render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    await screen.findByRole("table", { name: "Nhân viên từ bảng công" });
    fireEvent.click(within(screen.getByRole("navigation", { name: "Lọc nhân viên kỳ lương" })).getByRole("button", { name: "Đủ dữ liệu 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Duyệt lương" }));
    const table = await screen.findByRole("table", { name: "Lương nhân viên" });
    expect(within(table).getByText(employee.employeeName)).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Lọc nhân viên kỳ lương" })).getByRole("button", { name: "Tất cả 1" })).toHaveAttribute("aria-pressed", "true");
  });
  it("opens supplementary period data without losing the employee filter", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(period("draft"))));
    render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    await screen.findByRole("table", { name: "Nhân viên từ bảng công" });
    fireEvent.click(within(screen.getByRole("navigation", { name: "Lọc nhân viên kỳ lương" })).getByRole("button", { name: "Đủ dữ liệu 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Thông tin kỳ lương" }));
    const details = await screen.findByRole("dialog", { name: "Thông tin kỳ lương" });
    expect(within(details).getByText("Công thực tế")).toBeInTheDocument();
    expect(within(details).getByRole("link", { name: "Tháng 09/2026" })).toHaveAttribute("href", "/timesheets/periods/timesheet-1");
    fireEvent.click(within(details).getByRole("button", { name: "Đóng" }));
    expect(within(screen.getByRole("navigation", { name: "Lọc nhân viên kỳ lương" })).getByRole("button", { name: "Đủ dữ liệu 1" })).toHaveAttribute("aria-pressed", "true");
  });
  it("updates stale salary before offering approval", async () => {
    let current = period(); current.readiness!.timesheetVersion = 2;
    const actions: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      if (init?.method === "PATCH") { actions.push(JSON.parse(String(init.body))); current = period(); }
      return response(current);
    }));
    render(<PayrollDetailConsole id="payroll-1" permissions={permissions} />);
    fireEvent.click(await screen.findByRole("button", { name: "Cập nhật lương" }));
    expect(await screen.findByRole("button", { name: "Duyệt lương" })).toBeEnabled();
    expect(actions).toEqual([{ action: "calculate", payBasis: "actual", rowVersion: 2 }]);
  });
});
