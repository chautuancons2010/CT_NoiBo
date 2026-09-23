"use client";

import { ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, MapPin, Plus, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Select } from "@/components/shared/FormControls";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ProjectStatus, ProjectSummary } from "@/features/projects/types/projectTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

type PortfolioGroup = "active" | "upcoming" | "completed";

const statusMeta: Record<ProjectStatus, { label: string; tone: "info" | "success" | "warning" | "neutral" }> = {
  preparing: { label: "Sắp tới", tone: "info" },
  active: { label: "Đang thực hiện", tone: "success" },
  paused: { label: "Tạm dừng", tone: "warning" },
  completed: { label: "Hoàn thành", tone: "success" },
  closed: { label: "Đã đóng", tone: "neutral" }
};

const groupMeta: Record<PortfolioGroup, { title: string; icon: typeof BriefcaseBusiness; tone: string }> = {
  active: { title: "Đang thực hiện", icon: BriefcaseBusiness, tone: "mint" },
  upcoming: { title: "Sắp tới", icon: Clock3, tone: "amber" },
  completed: { title: "Đã hoàn thành", icon: CheckCircle2, tone: "lavender" }
};

function groupFor(project: ProjectSummary): PortfolioGroup {
  if (project.status === "preparing") return "upcoming";
  if (project.status === "completed" || project.status === "closed") return "completed";
  return "active";
}

function shortDate(value?: string) {
  if (!value) return "Chưa xác định";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

export function ProjectPortfolioWorkspace() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<PortfolioGroup | "all">("all");

  const load = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/v1/projects", { cache: "no-store", signal: controller.signal });
      const body = await response.json() as { data?: ProjectSummary[]; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải danh sách gói.");
      setProjects(body.data);
    } catch (reason) {
      setError(reason instanceof DOMException && reason.name === "AbortError" ? "Máy chủ chưa phản hồi." : reason instanceof Error ? reason.message : "Không thể tải danh sách gói.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useDomainReconciliation("projects", load);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi-VN");
    return projects.filter((project) => {
      const matchesGroup = group === "all" || group === groupFor(project);
      const matchesSearch = !term || [project.code, project.name, project.customerName, project.projectManagerName]
        .some((value) => value?.toLocaleLowerCase("vi-VN").includes(term));
      return matchesGroup && matchesSearch;
    });
  }, [group, projects, query]);

  const grouped = useMemo(() => ({
    active: filtered.filter((project) => groupFor(project) === "active"),
    upcoming: filtered.filter((project) => groupFor(project) === "upcoming"),
    completed: filtered.filter((project) => groupFor(project) === "completed")
  }), [filtered]);

  return <div className="project-portfolio">
    <section className="project-portfolio__toolbar" aria-label="Công cụ danh sách gói">
      <div className="project-portfolio__search">
        <Search aria-hidden="true" size={18} />
        <input aria-label="Tìm gói" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên gói, khách hàng" type="search" value={query} />
      </div>
      <Select
        label="Nhóm gói"
        labelHidden
        onChange={(event) => setGroup(event.target.value as PortfolioGroup | "all")}
        options={[
          { value: "all", label: "Tất cả nhóm" },
          { value: "active", label: "Đang thực hiện" },
          { value: "upcoming", label: "Sắp tới" },
          { value: "completed", label: "Đã hoàn thành" }
        ]}
        value={group}
      />
      <Link href="/projects/new"><Button leftIcon={<Plus aria-hidden="true" size={17} />} variant="primary">Tạo gói</Button></Link>
    </section>

    {loading ? <LoadingState /> : error ? <ErrorState action={<Button onClick={() => void load()} variant="secondary">Tải lại</Button>} description={error} /> : filtered.length === 0 ? <EmptyState title="Chưa có gói phù hợp" /> : (
      <div className="project-portfolio__groups">
        {(["active", "upcoming", "completed"] as const).map((key) => {
          const items = grouped[key];
          if (!items.length) return null;
          const meta = groupMeta[key];
          const Icon = meta.icon;
          return <section className={`project-package-group project-package-group--${meta.tone}`} key={key}>
            <header className="project-package-group__header">
              <div><span className="project-package-group__icon"><Icon aria-hidden="true" size={18} /></span><h2>{meta.title}</h2></div>
              <span>{items.length} gói</span>
            </header>
            <div className="project-package-list">{items.map((project) => <ProjectRow key={project.id} project={project} />)}</div>
          </section>;
        })}
      </div>
    )}
  </div>;
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  const meta = statusMeta[project.status];
  return <Link className="project-package-row" href={`/projects/${project.id}/progress`}>
    <div className="project-package-row__identity"><span>{project.code}</span><strong>{project.name}</strong><small>{project.customerName ?? "Chưa có khách hàng"}</small></div>
    <div className="project-package-row__meta"><span><MapPin aria-hidden="true" size={15} />{project.worksiteCount} công trường</span><span><UsersRound aria-hidden="true" size={15} />{project.currentPeople} nhân sự</span></div>
    <div className="project-package-row__dates"><CalendarDays aria-hidden="true" size={15} /><span>{shortDate(project.startDate)}<small>{shortDate(project.expectedEndDate ?? project.actualEndDate)}</small></span></div>
    <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
    <span className="project-package-row__open">Mở gói <ArrowRight aria-hidden="true" size={17} /></span>
  </Link>;
}
