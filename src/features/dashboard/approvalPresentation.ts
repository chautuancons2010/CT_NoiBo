import type { ApprovalCase } from "@/features/shared-platforms/types";
import type { DashboardItem } from "@/features/dashboard/types";
import { hasRequesterName } from "@/features/shared-platforms/services/approvalIdentity";
import { formatBusinessDate } from "@/lib/time/timezone";

const days = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

export function approvalDashboardItem(item: ApprovalCase, age: string): DashboardItem {
  const metadata = item.metadata;
  const start = typeof metadata.startDate === "string" ? metadata.startDate : undefined;
  const end = typeof metadata.endDate === "string" ? metadata.endDate : undefined;
  const period = start ? `${formatBusinessDate(start)}${end && end !== start ? ` – ${formatBusinessDate(end)}` : ""}` : undefined;
  const hasDays = typeof metadata.days === "number" || typeof metadata.days === "string" && metadata.days.trim() !== "";
  const count = hasDays ? Number(metadata.days) : NaN;
  const summary = item.domainType === "LEAVE" && typeof metadata.leaveType === "string" && Number.isFinite(count)
    ? `${metadata.leaveType} · ${days.format(count)} ngày` : item.summary;
  const named = hasRequesterName(item.requesterName);
  return {
    id: item.id, type: "approval", title: named ? item.requesterName : item.referenceNumber,
    reference: named ? item.referenceNumber : undefined, ageHours: item.waitingHours,
    context: [summary, period].filter(Boolean).join(" · "),
    priority: item.waitingHours >= 72 ? "HIGH" : item.waitingHours >= 24 ? "MEDIUM" : "LOW",
    dueOrAge: `Chờ ${age}`, href: `/approvals/${item.id}`, status: "Chờ duyệt"
  };
}
