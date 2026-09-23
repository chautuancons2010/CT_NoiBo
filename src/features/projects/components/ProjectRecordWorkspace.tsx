import { Building2, CalendarDays, ClipboardList, UserRound } from "lucide-react";

import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ProjectDetail } from "@/features/projects/types/projectTypes";

export function ProjectRecordWorkspace({ project }: { project: ProjectDetail }) {
  const fields = [
    { label: "Mã gói", value: project.code, icon: ClipboardList },
    { label: "Khách hàng", value: project.customerName ?? "Chưa có", icon: Building2 },
    { label: "Người phụ trách", value: project.projectManagerName ?? "Chưa phân công", icon: UserRound },
    { label: "Ngày bắt đầu", value: project.startDate, icon: CalendarDays },
    { label: "Kết thúc dự kiến", value: project.expectedEndDate ?? "Chưa xác định", icon: CalendarDays },
    { label: "Kết thúc thực tế", value: project.actualEndDate ?? "Chưa có", icon: CalendarDays }
  ];

  return <Card className="project-record-workspace">
    <header className="project-record-workspace__header"><div><span>Thông tin gói</span><h2>Hồ sơ</h2></div><StatusBadge>{project.code}</StatusBadge></header>
    <dl className="project-record-workspace__facts">{fields.map((field) => {
      const Icon = field.icon;
      return <div key={field.label}><dt><Icon aria-hidden="true" size={16} /> {field.label}</dt><dd>{field.value}</dd></div>;
    })}</dl>
    {project.summary || project.note ? <div className="project-record-workspace__note"><span>Nội dung</span><p>{project.summary ?? project.note}</p></div> : null}
  </Card>;
}
