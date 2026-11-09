import { describe, expect, it } from "vitest";
import { payrollWorkspace } from "./payrollWorkspace";
import type { PayrollDetail } from "./types";

const employee = { employeeId: "employee-1", employeeCode: "NV01", employeeName: "Nhân viên", scheduledWorkdays: 26, actualWorkdays: 24, annualLeaveDays: 0, businessTripDays: 0, businessTripExtraDays: 0, dailyCount: 31, dailyWorkdays: 24, salaryHistoryId: "salary-1", contractSalary: 26_000_000, allowance: 1_000_000, bonus: 0, deduction: 0 };
function fixture(): PayrollDetail { return { id: "payroll-1", periodMonth: "2026-05-01", timesheetPeriodId: "timesheet-1", status: "draft", rowVersion: 1, updatedAt: "2026-11-07T01:00:00Z", lineCount: 0, grossTotal: 0, netTotal: 0, deductionTotal: 0, lines: [], readiness: { timesheetId: "timesheet-1", timesheetStatus: "locked", timesheetVersion: 1, payBasis: "actual", employees: [employee], openHighExceptions: 0 } }; }

describe("payroll workspace data and next actions", () => {
  it("uses real source employees before any salary line exists without calculating take-home pay", () => {
    const data = fixture(); const view = payrollWorkspace(data);
    expect(view).toMatchObject({ sourceMode: true, employeeCount: 1, sourceReady: 1, currentStage: 1, checkCount: 0 });
    expect(view.sourceEmployees[0]).toMatchObject({ employeeId: "employee-1", contractSalary: 26_000_000, statusLabel: "Đủ dữ liệu" });
    expect(view.sourceEmployees[0]).not.toHaveProperty("netSalary");
    expect(data.lines).toEqual([]); expect(data.netTotal).toBe(0);
  });
  it("identifies mismatched workdays and links straight to that employee's reconciliation", () => {
    const data = fixture(); data.readiness!.employees = [{ ...employee, dailyWorkdays: 23 }];
    const view = payrollWorkspace(data);
    expect(view).toMatchObject({ sourceReady: 0, currentStage: 0, checkCount: 1 });
    expect(view.sourceEmployees[0]).toMatchObject({ actualWorkdays: 24, dailyWorkdays: 23, statusLabel: "Lệch ngày công", actionLabel: "Đối chiếu công", actionHref: "/timesheets/periods/timesheet-1/employees/employee-1" });
    expect(view.steps[0]).toMatchObject({ complete: false, attention: true });
  });
  it("routes missing salary setup to salary records and includes period-wide blockers", () => {
    const data = fixture(); data.readiness!.timesheetStatus = "open"; data.readiness!.employees = [{ ...employee, salaryHistoryId: undefined }];
    const view = payrollWorkspace(data);
    expect(view.sourceReady).toBe(0);
    expect(view.sourceEmployees[0]).toMatchObject({ actionHref: "/accounting/salaries", actionLabel: "Hồ sơ lương", statusLabel: "Thiếu hồ sơ lương" });
    expect(view.checkCount).toBe(2);
  });
  it("does not claim a missing readiness response is ready for approval", () => {
    const data = fixture(); data.readiness = undefined; data.timesheetPeriodId = undefined;
    const view = payrollWorkspace(data);
    expect(view.checkCount).toBe(1); expect(view.flow.inputReady).toBe(false);
    expect(view.issues).toEqual([{ code: "source_missing", label: "Chưa có dữ liệu đối chiếu" }]);
    expect(view.sourceHref).toBe("/timesheets");
  });
  it("counts actual deliveries separately from issued payslips and never marks unknown delivery as complete", () => {
    const data = fixture(); data.status = "published"; data.lines = [{ ...employee, id: "line-1", workDays: 24, baseSalary: 24_000_000, netSalary: 25_000_000, rowVersion: 1, payslipStatus: "published", deliveryStatus: "failed" }];
    const view = payrollWorkspace(data);
    expect(view.flow.sent).toBe(1); expect(view.delivered).toBe(0);
    expect(view.failed).toHaveLength(1); expect(view.lineAttention.has(employee.employeeId)).toBe(true);
    expect(view.steps[3]).toMatchObject({ complete: false, attention: true });
    data.deliveryTrackingAvailable = false; expect(payrollWorkspace(data).steps[3].complete).toBe(false);
  });
});
