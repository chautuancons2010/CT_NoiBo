"use client";

import { CalendarDays, MapPin } from "lucide-react";

import { Select } from "@/components/shared/FormControls";
import { EntityContextHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ProjectDetail, ProjectStatus } from "@/features/projects/types/projectTypes";
import { formatBusinessDate } from "@/lib/time/timezone";

import styles from "./PackageWorkspace.module.css";

const statusMap: Record<ProjectStatus, { label: string; tone: "info" | "success" | "warning" | "neutral" }> = {
  preparing: { label: "Chuẩn bị", tone: "info" },
  active: { label: "Đang thi công", tone: "success" },
  paused: { label: "Tạm dừng", tone: "warning" },
  completed: { label: "Hoàn thành", tone: "success" },
  closed: { label: "Đã đóng", tone: "neutral" }
};

export function PackageContextHeader({
  project,
  selectedWorksiteId,
  onWorksiteChange
}: {
  project: ProjectDetail;
  completionPercent?: number;
  canManageWorksites: boolean;
  canUpdateHealth: boolean;
  selectedWorksiteId?: string;
  onWorksiteChange: (worksiteId?: string) => void;
}) {
  const status = statusMap[project.status];
  const activeWorksites = project.worksites.filter((site) => site.status === "active");
  const selectedWorksite = activeWorksites.find((site) => site.id === selectedWorksiteId);

  return (
    <EntityContextHeader
      className={styles.contextHeader}
      meta={<dl className={styles.contextMeta}>
        <div>
          <dt><MapPin aria-hidden="true" size={16} /><span className="sr-only">Công trường</span></dt>
          <dd className={styles.worksiteSwitcher}>
            <Select
              aria-label="Chọn công trường"
              label="Công trường"
              labelHidden
              onChange={(event) => onWorksiteChange(event.target.value || undefined)}
              options={activeWorksites.map((site) => ({ value: site.id, label: site.name }))}
              placeholder="Tất cả công trường"
              value={selectedWorksite?.id ?? ""}
            />
          </dd>
        </div>
        <div>
          <dt><CalendarDays aria-hidden="true" size={16} /><span className="sr-only">Thời gian</span></dt>
          <dd>{formatBusinessDate(project.startDate)} – {project.expectedEndDate ? formatBusinessDate(project.expectedEndDate) : "Chưa xác định"}</dd>
        </div>
      </dl>}
      status={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      title={project.name}
    />
  );
}
