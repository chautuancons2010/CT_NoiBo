import { payrollWorkflow } from "./payrollWorkflow";
import type { PayrollInputEmployee } from "./payrollRules";
import type { PayrollDetail } from "./types";

export type PayrollWorkspaceFilter = "all" | "attention" | "ready" | "pending" | "delivered";
export type PayrollSourceEmployee = PayrollInputEmployee & {
  issues: ReturnType<typeof payrollWorkflow>["inputIssues"];
  statusLabel: string;
  actionLabel: string;
  actionHref: string;
};

const issueLabels: Record<string, string> = {
  salary: "Thiếu hồ sơ lương", daily: "Thiếu công ngày", mismatch: "Lệch ngày công",
  scheduled: "Thiếu công chuẩn", excess: "Vượt công chuẩn", unlocked: "Công chưa chốt", exceptions: "Công cần kiểm tra", empty: "Chưa tổng hợp công"
};

export function payrollWorkspace(data: PayrollDetail) {
  const flow = payrollWorkflow(data);
  const issues = !data.readiness && !flow.locked ? [...flow.inputIssues, { code: "source_missing", label: "Chưa có dữ liệu đối chiếu" }] : flow.inputIssues;
  const sourceId = data.syncTimesheetPeriodId ?? data.timesheetPeriodId ?? data.readiness?.timesheetId;
  const sourceHref = sourceId ? `/timesheets/periods/${sourceId}` : "/timesheets";
  const sourceEmployees: PayrollSourceEmployee[] = (data.readiness?.employees ?? []).map(employee => {
    const employeeIssues = flow.inputIssues.filter(issue => !issue.employeeId || issue.employeeId === employee.employeeId);
    const salaryIssue = employeeIssues.some(issue => issue.code === "salary");
    const firstIssue = salaryIssue ? "salary" : employeeIssues[0]?.code;
    return { ...employee, issues: employeeIssues, statusLabel: firstIssue ? issueLabels[firstIssue] ?? "Cần kiểm tra" : "Đủ dữ liệu",
      actionLabel: salaryIssue ? "Hồ sơ lương" : employeeIssues.length ? "Đối chiếu công" : "Xem công",
      actionHref: salaryIssue ? "/accounting/salaries" : sourceId ? `${sourceHref}/employees/${employee.employeeId}` : sourceHref };
  });
  const sourceReady = sourceEmployees.filter(employee => !employee.issues.length).length;
  const deliveryAvailable = data.deliveryTrackingAvailable !== false;
  const delivered = data.lines.filter(line => line.deliveryStatus === "delivered").length;
  const failed = data.lines.filter(line => line.deliveryStatus === "failed");
  const lineAttention = new Set(data.lines.filter(line => line.netSalary < 0 || line.deliveryStatus === "failed" || line.deliveryReady === false || flow.inputIssues.some(issue => !issue.employeeId || issue.employeeId === line.employeeId)).map(line => line.employeeId));
  const checkCount = issues.length + Number(Boolean(data.syncIssue)) + Number(flow.needsRecalculation) + flow.negativeLines.length;
  const employeeCount = data.lines.length || sourceEmployees.length;
  const sourceMode = data.lines.length === 0;
  const currentStage = !flow.inputReady && !flow.locked ? 0 : data.status === "draft" || flow.needsRecalculation && !flow.locked ? 1 : !flow.locked ? 2 : 3;
  const allDelivered = data.lines.length > 0 && deliveryAvailable && delivered === data.lines.length;
  const steps = [
    { label: "Đối chiếu công", complete: flow.inputReady || flow.locked, attention: currentStage === 0 && checkCount > 0 },
    { label: "Tính lương", complete: data.status !== "draft" && (!flow.needsRecalculation || flow.locked), attention: currentStage === 1 && flow.needsRecalculation },
    { label: "Duyệt lương", complete: flow.locked, attention: false },
    { label: "Gửi phiếu", complete: allDelivered, attention: failed.length > 0 }
  ];
  const filters = sourceMode
    ? [{ value: "all", label: `Tất cả ${sourceEmployees.length}` }, { value: "attention", label: `Cần xử lý ${sourceEmployees.length - sourceReady}` }, { value: "ready", label: `Đủ dữ liệu ${sourceReady}` }]
    : [{ value: "all", label: `Tất cả ${data.lines.length}` }, { value: "attention", label: `Cần xử lý ${lineAttention.size}` },
      ...(deliveryAvailable ? [{ value: "pending", label: `Chưa gửi ${data.lines.length - delivered}` }, { value: "delivered", label: `Đã gửi ${delivered}` }] : [])];
  return { flow, issues, sourceId, sourceHref, sourceEmployees, sourceReady, sourceMode, employeeCount, delivered, failed, deliveryAvailable, lineAttention, checkCount, currentStage, steps, filters };
}
