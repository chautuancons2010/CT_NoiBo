"use client";

import { AlertTriangle, ArrowRight, Camera, CheckCircle2, Clock3, FilePlus2, HardHat, ShieldAlert, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ProjectAssignment, ProjectProgressNode, ProjectUpdate } from "@/features/projects/types/projectTypes";
import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";

import styles from "./PackageWorkspace.module.css";
import type { PackageWorkspaceSection } from "./WorkspaceNav";

function deadlineLabel(deadline?: string, today?: string) {
  if (!deadline) return "Chưa đặt hạn";
  const delta = Math.round((new Date(`${deadline}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000);
  if (delta < 0) return `Quá hạn ${Math.abs(delta)} ngày`;
  if (delta === 0) return "Hạn hôm nay";
  if (delta === 1) return "Hạn ngày mai";
  return `Còn ${delta} ngày`;
}

export function PackageTodayWorkspace({
  projectId,
  today,
  nodes,
  roster,
  sessions,
  updates,
  selectedWorksiteId,
  canFieldUpdate,
  canOpenAttendance,
  onNavigate
}: {
  projectId: string;
  today: string;
  nodes: ProjectProgressNode[];
  roster: ProjectAssignment[];
  sessions: WorkerAttendanceSession[];
  updates: ProjectUpdate[];
  selectedWorksiteId?: string;
  canFieldUpdate: boolean;
  canOpenAttendance: boolean;
  onNavigate: (section: PackageWorkspaceSection, options?: { mode?: "field-update" | "report-issue"; task?: string }) => void;
}) {
  const filteredRoster = useMemo(() => roster.filter((item) => !selectedWorksiteId || item.worksiteId === selectedWorksiteId), [roster, selectedWorksiteId]);
  const filteredSessions = useMemo(() => sessions.filter((item) => item.date === today && (!selectedWorksiteId || item.worksiteId === selectedWorksiteId)), [sessions, selectedWorksiteId, today]);
  const filteredUpdates = useMemo(() => updates.filter((item) => !selectedWorksiteId || item.worksiteId === selectedWorksiteId), [selectedWorksiteId, updates]);
  const attention = useMemo(() => nodes.filter((node) => {
    if (node.status === "blocked") return true;
    if (!node.deadline || node.status === "completed" || node.status === "cancelled") return false;
    return node.deadline <= today || node.status === "in_progress";
  }).slice(0, 6), [nodes, today]);
  const issues = filteredUpdates.filter((update) => update.issue && !["resolved", "closed"].includes(update.issue.status)).slice(0, 4);
  const attendanceDone = filteredSessions.some((session) => session.status === "submitted" || session.status === "locked");
  return (
    <section className={styles.todayWorkspace}>
      <header className={styles.todayHeading}>
        <h2>Hôm nay</h2>
        <time dateTime={today}>{new Date(`${today}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}</time>
      </header>

      <div className={styles.todayGrid}>
        <section className={styles.todayPrimary}>
          <div className={styles.todaySectionTitle}><div><HardHat aria-hidden="true" size={19} /><h3>Công việc ưu tiên</h3></div><span>{attention.length}</span></div>
          <div className={styles.todayTaskList}>
            {attention.map((node) => (
              <article className={styles.todayTask} data-status={node.status} key={node.id}>
                <div className={styles.todayTaskMain}>
                  <div><strong>{node.name}</strong><span>{node.assigneeName ?? "Chưa phân công"}</span></div>
                  <StatusBadge tone={node.status === "blocked" ? "error" : "info"}>{node.status === "blocked" ? "Đang vướng" : `${node.completionPercent}%`}</StatusBadge>
                </div>
                <div className={styles.todayTaskMeta}><span className={node.deadline && node.deadline < today ? styles.dangerText : undefined}><Clock3 aria-hidden="true" size={15} />{deadlineLabel(node.deadline, today)}</span></div>
                {canFieldUpdate ? <div className={styles.todayTaskActions}><button data-action="update" onClick={() => onNavigate("progress", { mode: "field-update", task: node.id })} type="button"><FilePlus2 aria-hidden="true" size={16} />Cập nhật</button><button data-action="issue" onClick={() => onNavigate("progress", { mode: "report-issue", task: node.id })} type="button"><ShieldAlert aria-hidden="true" size={16} />Báo vướng</button></div> : null}
              </article>
            ))}
            {!attention.length ? <div className={styles.todayClear}><CheckCircle2 size={22} /><strong>Không có việc quá hạn hoặc đang vướng</strong></div> : null}
          </div>
          <button className={styles.todayMoreLink} onClick={() => onNavigate("progress")} type="button">Xem tất cả công việc <ArrowRight size={16} /></button>
        </section>

        <aside className={styles.todayAside}>
          <section className={styles.todayCard}>
            <div className={styles.todaySectionTitle}><div><UsersRound aria-hidden="true" size={19} /><h3>Nhân lực</h3></div><span>{filteredRoster.length}</span></div>
            {canOpenAttendance ? <Link className={styles.todayPrimaryAction} href={`/worker-attendance/today?projectId=${projectId}${selectedWorksiteId ? `&worksiteId=${selectedWorksiteId}` : ""}`}><Camera size={17} />{attendanceDone ? "Xem điểm danh" : "Điểm danh nhanh"}</Link> : null}
          </section>
          <section className={styles.todayCard}>
            <div className={styles.todaySectionTitle}><div><AlertTriangle aria-hidden="true" size={19} /><h3>Vướng mắc mở</h3></div><span>{issues.length}</span></div>
            <div className={styles.todayIssueList}>{issues.map((update) => <article key={update.id}><strong>{update.title}</strong><span>{update.issue?.severity === "critical" ? "Dừng thi công" : update.issue?.severity === "medium" ? "Cảnh báo sớm" : "Theo dõi"}</span></article>)}{!issues.length ? <p>Không có vướng mắc đang mở</p> : null}</div>
          </section>
        </aside>
      </div>

    </section>
  );
}
