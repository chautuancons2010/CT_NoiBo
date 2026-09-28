"use client";

import { ArrowUpRight, CalendarDays, MapPin, Plus, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Select } from "@/components/shared/FormControls";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ProjectHealth, ProjectStatus, ProjectSummary } from "@/features/projects/types/projectTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

import styles from "./ProjectPortfolioWorkspace.module.css";

type PortfolioGroup = "active" | "upcoming" | "completed";

const statusMeta: Record<ProjectStatus, { label: string; tone: "info" | "success" | "warning" | "neutral" }> = {
  preparing: { label: "Chuẩn bị", tone: "info" },
  active: { label: "Đang thi công", tone: "success" },
  paused: { label: "Tạm dừng", tone: "warning" },
  completed: { label: "Hoàn thành", tone: "success" },
  closed: { label: "Đã đóng", tone: "neutral" }
};

const healthMeta: Record<ProjectHealth, { label: string; tone: "success" | "warning" | "error" | "neutral" }> = {
  on_track: { label: "Đúng kế hoạch", tone: "success" },
  at_risk: { label: "Có rủi ro", tone: "warning" },
  delayed: { label: "Chậm tiến độ", tone: "error" },
  paused: { label: "Tạm dừng", tone: "warning" },
  completed: { label: "Hoàn thành", tone: "success" }
};

function groupFor(project: ProjectSummary): PortfolioGroup {
  if (project.status === "preparing") return "upcoming";
  if (project.status === "completed" || project.status === "closed") return "completed";
  return "active";
}

function shortDate(value?: string) {
  if (!value) return "—";
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

  const counts = useMemo(() => ({
    active: projects.filter((project) => groupFor(project) === "active").length,
    upcoming: projects.filter((project) => groupFor(project) === "upcoming").length,
    completed: projects.filter((project) => groupFor(project) === "completed").length
  }), [projects]);

  return (
    <div className={styles.portfolio}>
      <section className={styles.commandBar} aria-label="Điều khiển gói công trường">
        <label className={styles.search}>
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">Tìm gói công trường</span>
          <input aria-label="Tìm gói công trường" onChange={(event) => setQuery(event.target.value)} placeholder="Mã gói, tên gói, khách hàng, phụ trách" type="search" value={query} />
        </label>
        <Select
          label="Trạng thái gói"
          labelHidden
          onChange={(event) => setGroup(event.target.value as PortfolioGroup | "all")}
          options={[
            { value: "all", label: "Tất cả gói" },
            { value: "active", label: "Đang thi công" },
            { value: "upcoming", label: "Chuẩn bị" },
            { value: "completed", label: "Đã hoàn thành" }
          ]}
          value={group}
        />
        <Link href="/projects/new"><Button leftIcon={<Plus aria-hidden="true" size={17} />} variant="primary">Tạo gói</Button></Link>
      </section>

      {!loading && !error ? (
        <dl className={styles.summary}>
          <button aria-pressed={group === "active"} onClick={() => setGroup(group === "active" ? "all" : "active")} type="button"><dt>Đang thi công</dt><dd>{counts.active}</dd></button>
          <button aria-pressed={group === "upcoming"} onClick={() => setGroup(group === "upcoming" ? "all" : "upcoming")} type="button"><dt>Chuẩn bị</dt><dd>{counts.upcoming}</dd></button>
          <button aria-pressed={group === "completed"} onClick={() => setGroup(group === "completed" ? "all" : "completed")} type="button"><dt>Đã hoàn thành</dt><dd>{counts.completed}</dd></button>
        </dl>
      ) : null}

      {loading ? <LoadingState /> : error ? <ErrorState action={<Button onClick={() => void load()} variant="secondary">Tải lại</Button>} description={error} /> : filtered.length === 0 ? <EmptyState title="Không có gói phù hợp" /> : (
        <section className={styles.list} aria-label="Danh sách gói công trường">
          <header className={styles.listHeader}>
            <span>Gói công trường</span>
            <span>Vận hành</span>
            <span>Thời gian</span>
            <span>Tình trạng</span>
            <span />
          </header>
          {filtered.map((project) => <ProjectRow key={project.id} project={project} />)}
        </section>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  const status = statusMeta[project.status];
  const health = healthMeta[project.health];

  return (
    <Link className={styles.row} href={`/projects/${project.id}/progress`}>
      <div className={styles.identity}>
        <span>{project.code}</span>
        <strong>{project.name}</strong>
        <small>{project.customerName ?? "Chưa có khách hàng"}</small>
      </div>
      <div className={styles.operations}>
        <span><MapPin aria-hidden="true" size={15} /> {project.worksiteCount} công trường</span>
        <span><UsersRound aria-hidden="true" size={15} /> {project.currentPeople} nhân sự</span>
        <small>{project.projectManagerName ?? "Chưa phân công phụ trách"}</small>
      </div>
      <div className={styles.dates}>
        <CalendarDays aria-hidden="true" size={16} />
        <span><strong>{shortDate(project.startDate)}</strong><small>{shortDate(project.expectedEndDate ?? project.actualEndDate)}</small></span>
      </div>
      <div className={styles.statuses}>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <StatusBadge tone={health.tone}>{health.label}</StatusBadge>
      </div>
      <span className={styles.open}>Điều hành <ArrowUpRight aria-hidden="true" size={17} /></span>
    </Link>
  );
}
