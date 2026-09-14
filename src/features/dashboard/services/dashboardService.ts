import "server-only";

import { getAttendanceDashboard } from "@/features/attendance/services/attendanceRepository";
import { normalizeAttention } from "@/features/dashboard/attention";
import {
  canUseDashboardProfile,
  dashboardProfiles,
  enabledWidgetsFor,
  resolveDashboardProfile,
  visibleQuickActions
} from "@/features/dashboard/registry";
import type {
  AttentionPriority,
  DashboardItem,
  DashboardProfileKey,
  DashboardReadModel,
  DashboardWidgetData,
  DashboardWidgetKey,
  DashboardWidgetResult
} from "@/features/dashboard/types";
import { getDashboard as getImportExportDashboard } from "@/features/import-export/services/importExportRepository";
import { getProjectMonitoring } from "@/features/projects/services/projectUpdateRepository";
import { listApprovalCases } from "@/features/shared-platforms/services/approvalRepository";
import { listAuditLogs } from "@/features/shared-platforms/services/auditRepository";
import { listNotifications } from "@/features/shared-platforms/services/notificationRepository";
import { resolvePlatformIdentity } from "@/features/shared-platforms/services/platformIdentity";
import { listExceptions } from "@/features/timesheets/services/timesheetRepository";
import { getWarehouseDashboard } from "@/features/warehouse/services/warehouseRepository";
import { AppError } from "@/lib/api/errors";
import { can, type AuthenticatedUser } from "@/lib/auth/permissions";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { readSettingsGroup } from "@/services/system-settings/systemSettingsService";

function formatAge(iso: string): string {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

function approvalPriority(hours: number): AttentionPriority {
  if (hours >= 72) return "HIGH";
  if (hours >= 24) return "MEDIUM";
  return "LOW";
}

async function loadApprovals(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  const cases = await listApprovalCases(user, "pending");
  return {
    metrics: [{ label: "Chờ duyệt", value: cases.length, href: "/approvals/pending", tone: cases.length ? "warning" : "success" }],
    items: cases.slice(0, 8).map((item) => ({
      id: item.id,
      type: "approval",
      title: item.referenceNumber,
      context: `${item.requesterName} · ${item.summary}`,
      priority: approvalPriority(item.waitingHours),
      dueOrAge: formatAge(item.submittedAt),
      href: `/approvals/${item.id}`,
      status: "Chờ duyệt"
    }))
  };
}

async function loadEmployeeToday(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  const dashboard = await getAttendanceDashboard(user);
  const nextLabel = dashboard.nextAction === "check_in" ? "Chấm vào" : dashboard.nextAction === "check_out" ? "Chấm ra" : "Đã hoàn tất";
  const items: DashboardItem[] = dashboard.incompletePreviousDate ? [{
    id: dashboard.incompletePreviousDate,
    type: "attendance",
    title: "Thiếu lượt chấm ra",
    context: dashboard.incompletePreviousDate,
    priority: "HIGH",
    href: `/attendance/history/${dashboard.incompletePreviousDate}`,
    status: "Cần xử lý"
  }] : [];
  return {
    metrics: [
      { label: "Ca làm", value: `${dashboard.policy.shiftStart}–${dashboard.policy.shiftEnd}` },
      { label: "Trạng thái", value: nextLabel, tone: dashboard.nextAction === "completed" ? "success" : "info" }
    ],
    items,
    state: { primaryAction: nextLabel, primaryHref: "/attendance", employeeName: dashboard.employeeName }
  };
}

function localDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function loadSupervisorToday(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  const client = getSupabaseServiceClient();
  if (!client) throw new AppError("SERVER_ERROR", "Supabase chưa được cấu hình.");
  const identity = await resolvePlatformIdentity(client, user);
  if (!identity.employeeId) throw new AppError("PERMISSION_DENIED", "Tài khoản chưa liên kết nhân viên.");
  const { data: assignments, error } = await client.from("project_assignments")
    .select("project_id,worksite_id,projects(code,name),worksites(name)")
    .eq("employee_id", identity.employeeId).eq("status", "active");
  if (error) throw new AppError("SERVER_ERROR", "Không thể đọc công trường được phân công.");
  const projectIds = [...new Set((assignments ?? []).map((item) => String(item.project_id)))];
  const [{ count: expected }, { data: sessions }] = await Promise.all([
    projectIds.length ? client.from("project_assignments").select("employee_id", { count: "exact", head: true }).in("project_id", projectIds).eq("status", "active") : Promise.resolve({ count: 0 }),
    client.from("worker_attendance_sessions").select("id,status,project_name_snapshot,worksite_name_snapshot").eq("supervisor_employee_id", identity.employeeId).eq("attendance_date", localDate()).order("created_at", { ascending: false })
  ]);
  const assignment = assignments?.[0] as Record<string, unknown> | undefined;
  const project = (Array.isArray(assignment?.projects) ? assignment?.projects[0] : assignment?.projects) as Record<string, unknown> | undefined;
  const worksite = (Array.isArray(assignment?.worksites) ? assignment?.worksites[0] : assignment?.worksites) as Record<string, unknown> | undefined;
  return {
    metrics: [
      { label: "Công trường", value: worksite?.name ? String(worksite.name) : project?.name ? String(project.name) : "Chưa phân công" },
      { label: "Nhân sự dự kiến", value: expected ?? 0 },
      { label: "Phiên hôm nay", value: sessions?.length ?? 0, tone: sessions?.length ? "success" : "warning" }
    ],
    items: (sessions ?? []).slice(0, 6).map((session) => ({ id: String(session.id), type: "worker_attendance", title: String(session.worksite_name_snapshot), context: String(session.project_name_snapshot), href: `/worker-attendance/sessions/${session.id}`, status: String(session.status), priority: session.status === "needs_review" ? "HIGH" : "INFO" })),
    state: { primaryAction: "Điểm danh hôm nay", primaryHref: "/worker-attendance/today" }
  };
}

async function loadTimesheetExceptions(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  const exceptions = (await listExceptions(user)).filter((item) => item.status === "open");
  return {
    metrics: [{ label: "Ngoại lệ đang mở", value: exceptions.length, href: "/timesheets/exceptions", tone: exceptions.length ? "warning" : "success" }],
    items: exceptions.slice(0, 8).map((item) => ({ id: item.id, type: "timesheet", title: `${item.employeeCode} · ${item.employeeName}`, context: `${item.workDate} · ${item.type}`, priority: item.severity === "high" ? "HIGH" : "MEDIUM", href: "/timesheets/exceptions", status: "Cần xử lý" }))
  };
}

async function loadProjectAttention(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  const summary = await getProjectMonitoring(user);
  return {
    metrics: [
      { label: "Đang hoạt động", value: summary.active, href: "/project-monitoring" },
      { label: "Có rủi ro", value: summary.atRisk + summary.delayed, href: "/project-monitoring", tone: summary.atRisk + summary.delayed ? "warning" : "success" },
      { label: "Vấn đề mức cao", value: summary.attention.filter((item) => item.severity === "critical" || item.severity === "high").length, href: "/project-monitoring/issues", tone: "error" }
    ],
    items: summary.attention.slice(0, 8).map((item) => ({ id: item.id, type: "project_issue", title: item.title, context: item.projectName, priority: item.severity === "critical" ? "CRITICAL" : item.severity === "high" ? "HIGH" : item.severity === "medium" ? "MEDIUM" : "LOW", dueOrAge: formatAge(item.createdAt), href: `/projects/${item.projectId}/updates/${item.sourceUpdateId}`, status: item.status }))
  };
}

async function loadWarehouse(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  const summary = await getWarehouseDashboard(user);
  return {
    metrics: [
      { label: "Phiếu chờ xử lý", value: summary.pendingDocuments, href: "/warehouse", tone: summary.pendingDocuments ? "warning" : "success" },
      { label: "Sắp hết", value: summary.lowStock, href: "/warehouse/inventory?status=low_stock", tone: summary.lowStock ? "warning" : "success" },
      { label: "Hết hàng", value: summary.outOfStock, href: "/warehouse/inventory?status=out_of_stock", tone: summary.outOfStock ? "error" : "success" }
    ],
    items: summary.lowStockItems.slice(0, 8).map((item) => ({ id: `${item.warehouseId}:${item.itemId}`, type: "warehouse_item", title: `${item.itemCode} · ${item.itemName}`, context: item.warehouseName, priority: item.status === "out_of_stock" ? "HIGH" : "MEDIUM", href: `/warehouse/items/${item.itemId}`, status: item.status === "out_of_stock" ? "Hết hàng" : "Sắp hết" }))
  };
}

async function loadShipments(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  const summary = await getImportExportDashboard(user);
  return {
    metrics: [
      { label: "Sắp về", value: summary.upcoming, href: "/import-export/shipments" },
      { label: "Đang vận chuyển", value: summary.inTransit, href: "/import-export/shipments" },
      { label: "Đang thông quan", value: summary.customsProcessing, href: "/import-export/shipments" },
      { label: "Chờ nhập kho", value: summary.awaitingReceipt, href: "/import-export/shipments" },
      { label: "Cần chú ý", value: summary.attentionCount, href: "/import-export/shipments", tone: summary.attentionCount ? "warning" : "success" }
    ],
    items: summary.needsAttention.slice(0, 8).flatMap(({ shipment, flags }) => flags.map((flag) => ({ id: `${shipment.id}:${flag.code}`, type: "shipment", title: shipment.shipmentNumber, context: flag.label, priority: flag.code === "customs_issue" ? "HIGH" as const : flag.code === "eta_delayed" || flag.code === "document_missing" ? "MEDIUM" as const : "LOW" as const, href: `/import-export/shipments/${shipment.id}/overview`, status: "Cần chú ý" })))
  };
}

async function loadHrSummary(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  if (!can(user.permissions, "employee.view")) throw new AppError("PERMISSION_DENIED");
  const client = getSupabaseServiceClient();
  if (!client) throw new AppError("SERVER_ERROR", "Supabase chưa được cấu hình.");
  const [active, probation, incomplete, pendingHr] = await Promise.all([
    client.from("employees").select("id", { count: "exact", head: true }).eq("employment_status", "active"),
    client.from("employees").select("id", { count: "exact", head: true }).eq("employment_status", "probation"),
    client.from("employees").select("id", { count: "exact", head: true }).lt("profile_completeness", 100).in("employment_status", ["active", "probation", "pending_onboarding"]),
    client.from("employees").select("id", { count: "exact", head: true }).eq("profile_status", "pending_hr_completion")
  ]);
  if ([active, probation, incomplete, pendingHr].some((result) => result.error)) throw new AppError("SERVER_ERROR", "Không thể tải tổng quan nhân sự.");
  return {
    metrics: [
      { label: "Đang làm việc", value: active.count ?? 0, href: "/employees?status=active" },
      { label: "Thử việc", value: probation.count ?? 0, href: "/employees?status=probation" },
      { label: "Hồ sơ chưa hoàn thiện", value: incomplete.count ?? 0, href: "/employees?profile=incomplete", tone: incomplete.count ? "warning" : "success" },
      { label: "Chờ HR hoàn thiện", value: pendingHr.count ?? 0, href: "/employees?profile=pending_hr_completion", tone: pendingHr.count ? "warning" : "success" }
    ]
  };
}

async function loadRecentActivity(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  const { entries } = await listAuditLogs(user, { page: 1 });
  return { items: entries.slice(0, 8).map((entry) => ({ id: entry.id, type: entry.entityType, title: `${entry.actorName} · ${entry.actionLabel}`, context: entry.entityReference ? String(entry.entityReference) : `${entry.entityType} ${entry.entityId}`, dueOrAge: formatAge(entry.happenedAt), href: `/settings/audit-log?q=${encodeURIComponent(entry.entityId)}`, status: entry.severity === "critical" ? "Quan trọng" : undefined })) };
}

async function loadNotifications(user: AuthenticatedUser): Promise<DashboardWidgetData> {
  const notifications = await listNotifications(user, { unreadOnly: true, limit: 8 });
  return {
    metrics: [{ label: "Chưa đọc", value: notifications.length, href: "/notifications/unread", tone: notifications.length ? "info" : "success" }],
    items: notifications.map((item) => ({ id: item.id, type: "notification", title: item.title, context: item.message, priority: item.priority === "critical" ? "CRITICAL" : item.priority === "important" ? "MEDIUM" : "INFO", dueOrAge: formatAge(item.createdAt), href: item.deepLink ?? "/notifications", status: "Chưa đọc" }))
  };
}

const loaders: Record<DashboardWidgetKey, (user: AuthenticatedUser) => Promise<DashboardWidgetData>> = {
  employee_today: loadEmployeeToday,
  supervisor_today: loadSupervisorToday,
  my_approvals: loadApprovals,
  timesheet_exceptions: loadTimesheetExceptions,
  project_attention: loadProjectAttention,
  warehouse_low_stock: loadWarehouse,
  shipment_attention: loadShipments,
  hr_summary: loadHrSummary,
  recent_activity: loadRecentActivity,
  recent_notifications: loadNotifications,
  quick_actions: async (user) => ({ actions: visibleQuickActions(user) })
};

export async function getDashboardReadModel(user: AuthenticatedUser, requestedProfile?: DashboardProfileKey, requestedWidget?: DashboardWidgetKey): Promise<DashboardReadModel> {
  const settings = await readSettingsGroup("dashboard");
  const contextual = resolveDashboardProfile(user, settings);
  const profile = requestedProfile && canUseDashboardProfile(user, requestedProfile) ? requestedProfile : contextual;
  const enabled = enabledWidgetsFor(user, profile, settings);
  const definitions = requestedWidget ? enabled.filter((definition) => definition.key === requestedWidget) : enabled;
  const settled = await Promise.allSettled(definitions.map((definition) => loaders[definition.key](user)));
  const widgets: DashboardWidgetResult[] = settled.map((result, index) => ({
    key: definitions[index].key,
    label: definitions[index].label,
    status: result.status === "fulfilled" ? "ready" : "error",
    data: result.status === "fulfilled" ? result.value : undefined,
    error: result.status === "rejected" ? `Không thể tải ${definitions[index].label.toLocaleLowerCase("vi")}.` : undefined
  }));
  const attention = normalizeAttention(widgets.flatMap((widget) => widget.status === "ready" ? widget.data?.items?.filter((item) => item.priority && item.priority !== "INFO") ?? [] : []));
  return {
    profile,
    profileLabel: dashboardProfiles.find((item) => item.key === profile)?.label ?? "Tổng quan",
    generatedAt: new Date().toISOString(),
    widgets,
    attention
  };
}
