import type { ProjectStatus, ProjectSummary } from "@/features/projects/types/projectTypes";

export const projectStatusPresentation: Record<ProjectStatus, { label: string; tone: "info" | "success" | "warning" | "neutral" }> = {
  active: { label: "Đang thực hiện", tone: "success" },
  preparing: { label: "Sắp tới", tone: "info" },
  paused: { label: "Tạm dừng", tone: "warning" },
  completed: { label: "Hoàn thành", tone: "success" },
  closed: { label: "Đã đóng", tone: "neutral" }
};
export function portfolioStatus(value: string | null): ProjectStatus | "" {
  return value && Object.hasOwn(projectStatusPresentation, value) ? value as ProjectStatus : "";
}
function searchText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLocaleLowerCase("vi-VN");
}
export function projectIsOverdue(project: ProjectSummary, today: string) {
  return Boolean(project.expectedEndDate && project.expectedEndDate < today && project.status !== "completed" && project.status !== "closed");
}
export function filterPortfolio(projects: readonly ProjectSummary[], query: string, status: ProjectStatus | "", today: string) {
  const terms = searchText(query).trim().split(/\s+/).filter(Boolean);
  const order: Record<ProjectStatus, number> = { active: 0, paused: 1, preparing: 2, completed: 3, closed: 4 };
  return projects.filter(project => {
    if (status && project.status !== status) return false;
    const text = searchText([project.code, project.name, project.customerName, project.projectManagerName].filter(Boolean).join(" "));
    return terms.every(term => text.includes(term));
  }).sort((left, right) => order[left.status] - order[right.status]
    || Number(projectIsOverdue(right, today)) - Number(projectIsOverdue(left, today))
    || (left.expectedEndDate ?? "9999").localeCompare(right.expectedEndDate ?? "9999")
    || left.name.localeCompare(right.name, "vi", { numeric: true }));
}
