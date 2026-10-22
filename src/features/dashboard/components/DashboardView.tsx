"use client";

import { ArrowUpRight, CheckCircle2, ClipboardCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/shared/Button";
import { ModuleLauncher } from "@/components/shared/ModuleLauncher";
import { PersonalWorkspaceCards } from "@/features/workspace/PersonalWorkspaceCards";
import { DashboardPageTemplate } from "@/components/shared/PageLayouts";
import { LoadingState } from "@/components/shared/States";
import { PageHeader } from "@/components/shared/PageHeader";
import type { DashboardChart, DashboardReadModel } from "@/features/dashboard/types";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

import { ModuleChart } from "./ModuleChart";
import styles from "./DashboardView.module.css";

const attentionCategories: Record<string, string> = {
  approval: "Phê duyệt", attendance: "Chấm công", attendance_follow_up: "Chấm công",
  worker_attendance: "Điểm danh", timesheet: "Bảng công", project_issue: "Công trường",
  warehouse_item: "Kho", shipment: "Lô hàng", notification: "Thông báo",
  hr_task: "Nhân sự", payroll: "Bảng lương"
};

export function DashboardView({ initialModel }: { initialModel?: DashboardReadModel }) {
  const [model, setModel] = useState(initialModel);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/v1/dashboard", { cache: "no-store", signal });
    const body = await response.json() as { data?: DashboardReadModel; error?: { message: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải Dashboard.");
    setModel(body.data);
    setError("");
  }, []);
  useDomainReconciliation("dashboard", load);
  useEffect(() => {
    if (initialModel) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải Dashboard.");
    }), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [initialModel, load]);

  async function refresh() {
    setRefreshing(true);
    try { await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể cập nhật Dashboard."); }
    finally { setRefreshing(false); }
  }

  if (!model && !error) return <LoadingState description="" title="Đang tải Dashboard" />;
  const widgets = model?.widgets ?? [];
  const firstMetrics = widgets.flatMap((widget) => widget.data?.metrics?.[0] ?? []);
  const metrics = [...firstMetrics, ...widgets.flatMap((widget) => widget.data?.metrics?.slice(1) ?? [])].slice(0, 5);
  const availableCharts = widgets.flatMap((widget) => widget.data?.charts ?? []).filter((chart) => chart.series.some((entry) => Number.isFinite(entry.value) && entry.value !== 0));
  const meaningfulCharts = availableCharts.filter((chart) => chart.series.reduce((sum, entry) => sum + Math.abs(entry.value), 0) > 1).length
    ? availableCharts.filter((chart) => chart.series.reduce((sum, entry) => sum + Math.abs(entry.value), 0) > 1)
    : availableCharts;
  const overviewChart = meaningfulCharts.find((chart) => chart.kind === "line")
    ?? meaningfulCharts.find((chart) => chart.kind !== "donut" && !(chart.unit === "%" && chart.series.length === 1))
    ?? meaningfulCharts[0];
  const secondaryChart = meaningfulCharts.find((chart) => chart.key !== overviewChart?.key && chart.unit === "%" && chart.series.length === 1)
    ?? meaningfulCharts.find((chart) => chart.key !== overviewChart?.key && chart.kind === "donut")
    ?? meaningfulCharts.find((chart) => chart.key !== overviewChart?.key);
  const attention = model?.attention ?? [];
  const activity = widgets.filter((widget) => widget.key === "recent_activity" || widget.key === "recent_notifications").flatMap((widget) => widget.data?.items ?? []).slice(0, 5);
  const seen = new Set<string>();
  const allWorkItems = [...attention, ...widgets.filter((widget) => widget.key !== "recent_activity" && widget.key !== "recent_notifications").flatMap((widget) => widget.data?.items ?? [])].filter((item) => {
    const key = `${item.type}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const workItems = allWorkItems.slice(0, 6);
  const workCategories = new Map<string, number>();
  allWorkItems.forEach((item) => {
    const label = attentionCategories[item.type] ?? "Khác";
    workCategories.set(label, (workCategories.get(label) ?? 0) + 1);
  });
  const workChart: DashboardChart = { key: "dashboard-work-by-category", title: "Công việc theo nhóm", kind: "bar", unit: "việc", series: [...workCategories].map(([label, value]) => ({ label, value })) };
  const charts = overviewChart?.unit === "%" && overviewChart.series.length === 1 && !secondaryChart && workCategories.size
    ? [workChart, overviewChart]
    : [overviewChart, secondaryChart].filter((chart) => chart !== undefined);
  const failed = widgets.some((widget) => widget.status === "error");
  const failedLabels = widgets.filter((widget) => widget.status === "error").map((widget) => widget.label);
  const title = "Tổng quan";

  return <>
    <PageHeader action={<div className={styles.headingActions}>{model?.generatedAt ? <time dateTime={model.generatedAt}>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(model.generatedAt))}</time> : null}<Button disabled={refreshing} leftIcon={<RefreshCw aria-hidden="true" className={refreshing ? styles.spinning : undefined} size={16} />} onClick={() => void refresh()} size="sm">{refreshing ? "Đang cập nhật" : "Cập nhật"}</Button></div>} title={title} />
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <section aria-label={title} className={styles.analytics}>
      {metrics.length ? <div className={styles.metrics}>{metrics.map((metric, index) => {
        const content = <><span aria-hidden="true" className={styles.metricIcon}><svg className={styles.metricRing} viewBox="0 0 64 64"><circle className={styles.metricRingTrack} cx="32" cy="32" fill="none" r="25" strokeWidth="6" /><circle cx="32" cy="32" fill="none" pathLength="100" r="25" stroke="currentColor" strokeDasharray="74 26" strokeLinecap="round" strokeWidth="6" transform="rotate(-75 32 32)" /></svg><ArrowUpRight className={styles.metricGlyph} size={23} strokeWidth={1.7} /></span><span className={styles.metricContent}><strong>{typeof metric.value === "number" ? new Intl.NumberFormat("vi-VN").format(metric.value) : metric.value}</strong><span>{metric.label}</span></span></>;
        return metric.href ? <Link className={styles.metric} data-accent={index % 5} data-dashboard-metric data-metric-label={metric.label} data-metric-value={metric.value} data-tone={metric.tone ?? "neutral"} data-value-kind={typeof metric.value} href={metric.href} key={`${metric.label}-${index}`} prefetch={false}>{content}</Link> : <div className={styles.metric} data-accent={index % 5} data-dashboard-metric data-metric-label={metric.label} data-metric-value={metric.value} data-tone={metric.tone ?? "neutral"} data-value-kind={typeof metric.value} key={`${metric.label}-${index}`}>{content}</div>;
      })}</div> : null}
      {charts.length ? <div className={styles.chartGrid}>{charts.map((chart) => <ModuleChart chart={chart} key={chart.key} />)}</div> : null}
      <div className={styles.workspace} data-has-activity={Boolean(activity.length)}>
      <section aria-labelledby="dashboard-attention-title" className={styles.attention} data-dashboard-panel>
        <header className={styles.chartHeader}><h2 id="dashboard-attention-title">Cần xử lý</h2><span>{seen.size} việc</span></header>
        {workItems.length ? <div className={styles.attentionList}>{workItems.map((item) => <Link className={styles.attentionItem} data-priority={item.priority ?? "LOW"} href={item.href} key={`${item.type}-${item.id}`} prefetch={false}>
          <span aria-hidden="true" className={styles.workIcon}><ClipboardCheck size={18} /></span>
          <span className={styles.workIdentity}>
          <span className={styles.attentionCategory}>{attentionCategories[item.type] ?? "Cần xử lý"}</span>
          <strong>{item.title}</strong>
          {item.context && item.context !== "—" ? <span className={styles.attentionContext}>{item.context}</span> : null}
          </span>
          <span className={styles.workMeta}>
            {item.dueOrAge ? <small className={styles.workDate}>{item.dueOrAge}</small> : null}
            {item.priority === "HIGH" || item.priority === "CRITICAL" ? <span className={styles.priority}>{item.priority === "CRITICAL" ? "Khẩn cấp" : "Ưu tiên cao"}</span> : null}
          </span>
          <ArrowUpRight aria-hidden="true" size={16} />
        </Link>)}</div> : <div className={styles.empty}><CheckCircle2 aria-hidden="true" size={28} /><span>Không có việc cần xử lý</span></div>}
      </section>
      {activity.length ? <section className={styles.attention} data-dashboard-panel><header className={styles.chartHeader}><h2>{widgets.some((widget) => widget.key === "recent_activity" && widget.data?.items?.length) ? "Hoạt động gần đây" : "Thông báo gần đây"}</h2></header><div className={styles.attentionList}>{activity.map((item) => <Link className={styles.activityItem} href={item.href} key={`${item.type}-${item.id}`} prefetch={false}><span aria-hidden="true" className={styles.activityDot} /><strong>{item.title}</strong>{item.dueOrAge ? <time>{item.dueOrAge}</time> : null}<ArrowUpRight aria-hidden="true" size={16} /></Link>)}</div></section> : null}
      </div>
      {failed ? <div className={styles.error} role="alert"><span>Chưa tải được: {failedLabels.join(", ")}.</span><Button disabled={refreshing} onClick={() => void refresh()} size="sm">Thử lại</Button></div> : null}
    </section>
  </>;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return <DashboardPageTemplate className={styles.page}>
    <div className={styles.launcher} data-dashboard-applications><ModuleLauncher /></div>
    {children}
    <PersonalWorkspaceCards />
  </DashboardPageTemplate>;
}

export function DashboardAnalyticsFallback() {
  return <LoadingState title="Đang tải Dashboard" />;
}
