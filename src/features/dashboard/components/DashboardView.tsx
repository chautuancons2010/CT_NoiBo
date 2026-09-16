"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  PackageSearch,
  Plus,
  RefreshCw,
  Users,
  type LucideIcon
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { OperationalSection } from "@/components/shared/Workbench";
import { dataVisualizationPalette, semanticChartColors } from "@/config/dataVisualization";
import type {
  AttentionPriority,
  DashboardItem,
  DashboardChart,
  DashboardMetric,
  DashboardProfileKey,
  DashboardReadModel,
  DashboardWidgetKey,
  DashboardWidgetResult
} from "@/features/dashboard/types";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

interface ApiBody {
  ok: boolean;
  data?: DashboardReadModel;
  error?: { message: string };
}

const priorityLabels: Record<AttentionPriority, string> = {
  CRITICAL: "Khẩn cấp", HIGH: "Ưu tiên cao", MEDIUM: "Cần lưu ý", LOW: "Theo dõi", INFO: "Thông tin"
};

const queueKeys = new Set<DashboardWidgetKey>([
  "employee_today", "supervisor_today", "my_approvals", "timesheet_exceptions",
  "project_attention", "warehouse_low_stock", "shipment_attention"
]);
const activityKeys = new Set<DashboardWidgetKey>(["recent_activity", "recent_notifications"]);

interface OverviewMetric extends DashboardMetric {
  id: string;
  group: string;
}

type DashboardAccent = "green" | "blue" | "purple" | "amber" | "coral" | "teal";

function metricVisual(metric: OverviewMetric): { accent: DashboardAccent; Icon: LucideIcon } {
  const context = `${metric.label} ${metric.group}`.toLocaleLowerCase("vi");
  if (/nhân sự|nhân viên|hồ sơ|hr/.test(context)) return { accent: "green", Icon: Users };
  if (/chấm công|ca làm|phiên hôm nay|điểm danh/.test(context)) return { accent: "blue", Icon: Clock3 };
  if (/dự án|công trường|vấn đề/.test(context)) return { accent: "purple", Icon: FolderKanban };
  if (/cảnh báo|chú ý|ngoại lệ|sắp hết|hết hàng/.test(context) || metric.tone === "error") return { accent: "coral", Icon: AlertTriangle };
  if (/kho|hàng|lô hàng|vận chuyển|thông quan|phiếu/.test(context)) return { accent: "amber", Icon: PackageSearch };
  if (/thông báo|chưa đọc/.test(context)) return { accent: "teal", Icon: Bell };
  return { accent: "blue", Icon: ClipboardCheck };
}

function quickActionIcon(label: string): LucideIcon {
  const normalized = label.toLocaleLowerCase("vi");
  if (/nhân viên|nhân sự/.test(normalized)) return Users;
  if (/dự án|cập nhật/.test(normalized)) return FolderKanban;
  if (/phiếu|lô hàng|kho/.test(normalized)) return PackageSearch;
  if (/điểm danh|chấm công/.test(normalized)) return Clock3;
  if (/đơn|duyệt/.test(normalized)) return ClipboardCheck;
  return Plus;
}

function collectOverviewMetrics(widgets: DashboardWidgetResult[]): OverviewMetric[] {
  return widgets.flatMap((widget) =>
    (widget.data?.metrics ?? []).map((metric, index) => ({
      ...metric,
      group: widget.label,
      id: `${widget.key}-${metric.label}-${index}`
    }))
  );
}

function MetricStrip({ metrics }: { metrics: OverviewMetric[] }) {
  if (!metrics.length) return null;

  return (
    <section aria-label="Chỉ số tổng quan" className="dashboard-overview">
      <dl className="dashboard-overview__grid">
        {metrics.slice(0, 6).map((metric) => {
          const { accent, Icon } = metricVisual(metric);
          return (
            <div className={`dashboard-overview__metric dashboard-overview__metric--${accent}`} key={metric.id}>
              <span className="dashboard-overview__icon"><Icon aria-hidden="true" size={17} /></span>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
              <span className="dashboard-overview__note">{metric.group}</span>
              {metric.href ? <Link aria-label={`Mở ${metric.label}`} href={metric.href}><ArrowRight aria-hidden="true" size={15} /></Link> : null}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function AnalyticsPanel({ metrics }: { metrics: OverviewMetric[] }) {
  const grouped = new Map<string, Array<OverviewMetric & { numericValue: number }>>();
  for (const metric of metrics) {
    const numericValue = typeof metric.value === "number" ? metric.value : Number(metric.value);
    if (!Number.isFinite(numericValue) || numericValue < 0) continue;
    grouped.set(metric.group, [...(grouped.get(metric.group) ?? []), { ...metric, numericValue }]);
  }
  const [group, groupMetrics] = [...grouped.entries()].sort((first, second) => second[1].length - first[1].length)[0] ?? ["", []];
  const numericMetrics = groupMetrics.slice(0, 6);

  if (numericMetrics.length < 2) return null;
  const maximum = Math.max(...numericMetrics.map((metric) => metric.numericValue), 1);

  return (
    <section className="dashboard-analytics">
      <header><BarChart3 aria-hidden="true" size={17} /><h2>Phân bố · {group}</h2></header>
      <div className="dashboard-analytics__plot">
        {numericMetrics.map((metric) => (
          <div className="dashboard-analytics__row" key={metric.id} title={`${metric.label}: ${metric.value}`}>
            <div><span>{metric.label}</span><strong>{metric.value}</strong></div>
            <span aria-hidden="true" className="dashboard-analytics__track"><i style={{ width: `${Math.max(4, (metric.numericValue / maximum) * 100)}%` }} /></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function hasAnalyticsData(metrics: OverviewMetric[]): boolean {
  const counts = new Map<string, number>();
  for (const metric of metrics) {
    const value = typeof metric.value === "number" ? metric.value : Number(metric.value);
    if (Number.isFinite(value) && value >= 0) counts.set(metric.group, (counts.get(metric.group) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= 2);
}

function DataChart({ chart }: { chart: DashboardChart }) {
  const safeSeries = chart.series.filter((item) => Number.isFinite(item.value) && item.value >= 0);
  if (!safeSeries.length) return null;
  const maximum = Math.max(...safeSeries.map((item) => item.value), 1);

  return (
    <section className="dashboard-data-chart">
      <header><BarChart3 aria-hidden="true" size={17} /><h2>{chart.title}</h2></header>
      <div aria-label={chart.title} className="dashboard-data-chart__plot" role="img">
        {safeSeries.map((item, index) => {
          const color = item.tone ? semanticChartColors[item.tone] : dataVisualizationPalette[index % dataVisualizationPalette.length];
          return (
            <div className="dashboard-data-chart__row" key={item.label} title={`${item.label}: ${item.value.toLocaleString("vi-VN")}`}>
              <span>{item.label}</span>
              <div><i style={{ backgroundColor: color, width: `${Math.max(item.value ? 5 : 0, (item.value / maximum) * 100)}%` }} /></div>
              <strong>{item.value.toLocaleString("vi-VN")}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const localizedStatus: Record<string, string> = {
  open: "Đang mở",
  pending: "Đang chờ",
  needs_review: "Cần xem lại",
  resolved: "Đã xử lý",
  completed: "Hoàn tất"
};

function WorkItems({ items, variant = "default" }: { items: DashboardItem[]; variant?: "default" | "timeline" }) {
  return (
    <ul className={`dashboard-worklist${variant === "timeline" ? " dashboard-worklist--timeline" : ""}`}>
      {items.map((item) => (
        <li data-priority={item.priority?.toLocaleLowerCase("vi") ?? "normal"} key={`${item.type}-${item.id}`}>
          <Link href={item.href}>
            <span className="dashboard-worklist__main"><strong>{item.title}</strong>{item.context ? <small>{item.context}</small> : null}</span>
            <span className="dashboard-worklist__meta">
              {item.priority ? <span className={`dashboard-severity dashboard-severity--${item.priority.toLocaleLowerCase("vi")}`}>{priorityLabels[item.priority]}</span> : null}
              {item.status ? <span>{localizedStatus[item.status] ?? item.status}</span> : null}
              {item.dueOrAge ? <time>{item.dueOrAge}</time> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BriefingSection({ widget, onRetry, excludedItems, variant = "default" }: { widget: DashboardWidgetResult; onRetry: (key: DashboardWidgetKey) => void; excludedItems: ReadonlySet<string>; variant?: "default" | "timeline" }) {
  if (widget.status === "error") {
    return <OperationalSection className="operational-section--error dashboard-widget--compact" title={widget.label}><div className="widget-error" role="status"><AlertTriangle aria-hidden="true" size={17} /><span>Không thể tải dữ liệu</span><Button onClick={() => onRetry(widget.key)} size="sm">Thử lại</Button></div></OperationalSection>;
  }
  if (!widget.data) {
    return <OperationalSection className="operational-section--loading" title={widget.label}><div className="widget-skeleton"><span /><span /></div></OperationalSection>;
  }

  const data = widget.data;
  const items = (data.items ?? []).filter((item) => !excludedItems.has(`${item.type}:${item.id}`));
  const metrics = (data.metrics ?? []).filter((metric) => metric.value !== 0 && metric.value !== "0");
  const primaryAction = typeof data.state?.primaryAction === "string" ? data.state.primaryAction : undefined;
  const primaryHref = typeof data.state?.primaryHref === "string" ? data.state.primaryHref : undefined;

  if (!metrics.length && !items.length && !(primaryAction && primaryHref)) return null;

  return (
    <OperationalSection title={widget.label}>
      {metrics.length ? <dl className="dashboard-metrics">{metrics.map((metric) => <div className="dashboard-metric" key={`${metric.label}-${metric.href ?? "metric"}`}><dt>{metric.label}</dt><dd>{metric.value}</dd>{metric.href ? <Link href={metric.href}>Xem {metric.label.toLocaleLowerCase("vi")}</Link> : null}</div>)}</dl> : null}
      {primaryAction && primaryHref ? <Link className="dashboard-primary-action" href={primaryHref}>{primaryAction}<ArrowRight aria-hidden="true" size={17} /></Link> : null}
      {items.length ? <WorkItems items={items} variant={variant} /> : null}
    </OperationalSection>
  );
}

export function DashboardView({ profile }: { profile?: DashboardProfileKey }) {
  const [model, setModel] = useState<DashboardReadModel>();
  const [error, setError] = useState("");
  const endpoint = useMemo(() => `/api/v1/dashboard${profile ? `?profile=${profile}` : ""}`, [profile]);

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(endpoint, { cache: "no-store", signal });
    const body = await response.json() as ApiBody;
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải bản tin vận hành.");
    setError(""); setModel(body.data);
  }, [endpoint]);
  useDomainReconciliation("dashboard", load);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void load(controller.signal).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "Không thể tải bản tin vận hành.");
    }); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  async function retryWidget(key: DashboardWidgetKey) {
    const separator = endpoint.includes("?") ? "&" : "?";
    setModel((current) => current ? { ...current, widgets: current.widgets.map((widget) => widget.key === key ? { ...widget, status: "ready", data: undefined, error: undefined } : widget) } : current);
    try {
      const response = await fetch(`${endpoint}${separator}widget=${key}`, { cache: "no-store" });
      const body = await response.json() as ApiBody;
      const replacement = body.data?.widgets[0];
      if (!response.ok || !replacement) throw new Error(body.error?.message ?? "Không thể tải khu vực.");
      setModel((current) => current ? { ...current, widgets: current.widgets.map((widget) => widget.key === key ? replacement : widget) } : current);
    } catch {
      setModel((current) => current ? { ...current, widgets: current.widgets.map((widget) => widget.key === key ? { ...widget, status: "error", error: `Không thể tải ${widget.label.toLocaleLowerCase("vi")}.` } : widget) } : current);
    }
  }

  if (!model && !error) return <div className="dashboard-skeleton" aria-label="Đang tải bản tin vận hành"><span /><span /><span /></div>;
  if (error) return <div className="dashboard-load-error"><AlertTriangle aria-hidden="true" size={20} /><span>{error}</span><Button leftIcon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => void load()}>Thử lại</Button></div>;
  if (!model) return null;

  const attentionIds = new Set(model.attention.map((item) => `${item.type}:${item.id}`));
  const visibleWidgets = model.widgets.filter((widget) => widget.key !== "quick_actions");
  const quickActions = model.widgets.find((widget) => widget.key === "quick_actions")?.data?.actions ?? [];
  const overviewMetrics = collectOverviewMetrics(visibleWidgets);
  const charts = visibleWidgets.flatMap((widget) => widget.data?.charts ?? []);
  const hasVisualizations = charts.length > 0 || hasAnalyticsData(overviewMetrics);
  const featuredActions = quickActions.slice(0, 4);
  const additionalActions = quickActions.slice(4);
  const queueWidgets = visibleWidgets.filter((widget) => queueKeys.has(widget.key));
  const activityWidgets = visibleWidgets.filter((widget) => activityKeys.has(widget.key));
  const summaryWidgets = visibleWidgets.filter((widget) => !queueKeys.has(widget.key) && !activityKeys.has(widget.key));
  const zeroQueueWidgets = queueWidgets.filter((widget) => widget.status === "ready" && widget.data?.items?.length === 0 && (widget.data.metrics ?? []).every((metric) => metric.value === 0 || metric.value === "0"));

  return (
    <div className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <h1>Bản tin vận hành</h1>
          <span className="dashboard-eyebrow">{new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "full" }).format(new Date(model.generatedAt))} · {model.profileLabel}</span>
        </div>
        <Link className="dashboard-search-link" href="/search">Tìm trong hệ thống</Link>
      </header>
      {quickActions.length ? (
        <nav aria-label="Tác vụ thường dùng" className="dashboard-command-bar">
          <strong>Tác vụ nhanh</strong>
          <div>
            {featuredActions.map((action, index) => {
              const ActionIcon = quickActionIcon(action.label);
              return <Link className={`button dashboard-quick-action ${index === 0 ? "button--primary" : "button--secondary"}`} href={action.href} key={action.key}><ActionIcon aria-hidden="true" size={15} />{action.label}</Link>;
            })}
            {additionalActions.length ? <DropdownMenu label="Mở thêm tác vụ" trigger={<span className="dashboard-more-actions">Thêm tác vụ <ChevronDown aria-hidden="true" size={14} /></span>}>{additionalActions.map((action) => <Link href={action.href} key={action.key}>{action.label}</Link>)}</DropdownMenu> : null}
          </div>
        </nav>
      ) : null}
      <MetricStrip metrics={overviewMetrics} />
      <div className={`dashboard-primary-grid${hasVisualizations ? "" : " has-no-visualization"}`}>
        {hasVisualizations ? <section aria-label="Tổng quan trực quan" className="dashboard-visuals">
          <div className="dashboard-column-heading"><h2>Tổng quan trực quan</h2></div>
          <div className="dashboard-chart-grid">
            <AnalyticsPanel metrics={overviewMetrics} />
            {charts.slice(0, 2).map((chart) => <DataChart chart={chart} key={chart.key} />)}
          </div>
        </section> : null}
        <OperationalSection className="dashboard-attention" meta={model.attention.length ? <StatusBadge tone="warning">{model.attention.length} mục</StatusBadge> : <StatusBadge tone="success">Ổn định</StatusBadge>} title="Cần xử lý">
          {model.attention.length ? <WorkItems items={model.attention} /> : <p className="dashboard-stable">Không có ngoại lệ cần xử lý.</p>}
        </OperationalSection>
      </div>
      <div className="dashboard-secondary-grid">
        <section aria-label="Công việc của tôi" className="dashboard-queue">
          <div className="dashboard-column-heading"><h2>Công việc của tôi</h2></div>
          {zeroQueueWidgets.length ? <dl className="dashboard-zero-summary">{zeroQueueWidgets.map((widget) => <div key={widget.key}><dt>{widget.label}</dt><dd>0</dd></div>)}</dl> : null}
          {queueWidgets.map((widget) => <BriefingSection excludedItems={attentionIds} key={widget.key} onRetry={(key) => void retryWidget(key)} widget={widget} />)}
          {!queueWidgets.length ? <p className="dashboard-empty-inline">Không có hàng đợi phù hợp với quyền hiện tại.</p> : null}
        </section>
        <aside className="dashboard-activity" aria-label="Hoạt động và tổng hợp">
          <div className="dashboard-column-heading"><h2>Hoạt động gần đây</h2></div>
          {activityWidgets.map((widget) => <BriefingSection excludedItems={attentionIds} key={widget.key} onRetry={(key) => void retryWidget(key)} variant="timeline" widget={widget} />)}
          {summaryWidgets.map((widget) => <BriefingSection excludedItems={attentionIds} key={widget.key} onRetry={(key) => void retryWidget(key)} widget={widget} />)}
          {!activityWidgets.length && !summaryWidgets.length ? <p className="dashboard-empty-inline">Chưa có dữ liệu tổng hợp phù hợp.</p> : null}
        </aside>
      </div>
    </div>
  );
}
