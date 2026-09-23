"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  PackageSearch,
  Plus,
  RefreshCw,
  Save,
  StickyNote,
  Trash2,
  Users,
  type LucideIcon
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import { Button } from "@/components/shared/Button";
import { AnalyticsCard, ChartCard, MetricCard } from "@/components/shared/DashboardCards";
import { DashboardPageTemplate } from "@/components/shared/PageLayouts";
import { ModuleLauncher } from "@/components/shared/ModuleLauncher";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/States";
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
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";

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
  "project_attention", "warehouse_low_stock", "shipment_attention", "accounting_summary"
]);
const activityKeys = new Set<DashboardWidgetKey>(["recent_notifications"]);

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

function pickMetrics(metrics: OverviewMetric[], context: string): OverviewMetric[] {
  if (context === "hr") return metrics.filter((metric) => metric.id.startsWith("hr_summary-")).slice(0, 5);
  if (context === "warehouse") return metrics.filter((metric) => metric.id.startsWith("warehouse_low_stock-")).slice(0, 4);
  if (context === "import_export") return metrics.filter((metric) => metric.id.startsWith("shipment_attention-")).slice(0, 5);
  if (context === "accounting") return metrics.filter((metric) => metric.id.startsWith("accounting_summary-")).slice(0, 4);
  if (context !== "global" && context !== "management") return metrics.slice(0, 5);
  const preferred = [
    ["hr_summary", "Tổng nhân viên"], ["attendance_overview", "Có mặt hôm nay"],
    ["project_attention", "Có rủi ro"], ["warehouse_low_stock", "Sắp hết"],
    ["shipment_attention", "Đang vận chuyển"], ["my_approvals", "Chờ duyệt"]
  ];
  return preferred.flatMap(([key, label]) => metrics.find((metric) => metric.id.startsWith(`${key}-`) && metric.label === label) ?? []).slice(0, 6);
}

function MetricStrip({ metrics }: { metrics: OverviewMetric[] }) {
  if (!metrics.length) return null;

  return (
    <section aria-label="Chỉ số tổng quan" className="dashboard-overview">
      <dl className="dashboard-overview__grid">
        {metrics.slice(0, 6).map((metric) => {
          const { accent, Icon } = metricVisual(metric);
          return (
            <MetricCard accent={accent} key={metric.id}>
              <span className="dashboard-overview__icon"><Icon aria-hidden="true" size={17} /></span>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
              <span className="dashboard-overview__note">{metric.group}</span>
              {metric.href ? <Link aria-label={`Mở ${metric.label}`} href={metric.href}><ArrowRight aria-hidden="true" size={15} /></Link> : null}
            </MetricCard>
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

function CircularAnalytics({ metrics }: { metrics: OverviewMetric[] }) {
  const numericMetrics = metrics.flatMap((metric) => {
    const numericValue = typeof metric.value === "number" ? metric.value : Number(metric.value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? [{ ...metric, numericValue }] : [];
  }).slice(0, 4);

  if (numericMetrics.length < 2) return null;

  const total = numericMetrics.reduce((sum, metric) => sum + metric.numericValue, 0);
  const segments = numericMetrics.map((metric, index) => {
    const shareFor = (value: number) => total > 0 ? value / total * 100 : 100 / numericMetrics.length;
    const start = numericMetrics.slice(0, index).reduce((sum, item) => sum + shareFor(item.numericValue), 0);
    const end = start + shareFor(metric.numericValue);
    return `${dataVisualizationPalette[index % dataVisualizationPalette.length]} ${start}% ${end}%`;
  });
  const style = { "--dashboard-donut": `conic-gradient(${segments.join(", ")})` } as CSSProperties;

  return (
    <AnalyticsCard className="dashboard-radial">
      <header><BarChart3 aria-hidden="true" size={17} /><h2>Phân bổ chỉ số</h2></header>
      <div className="dashboard-radial__content">
        <div
          aria-label={numericMetrics.map((metric) => `${metric.label}: ${metric.value}`).join(", ")}
          className="dashboard-radial__chart"
          role="img"
          style={style}
        >
          <span><strong>{total.toLocaleString("vi-VN")}</strong><small>Tổng</small></span>
        </div>
        <ul>
          {numericMetrics.map((metric, index) => (
            <li key={metric.id}>
              <i aria-hidden="true" style={{ background: dataVisualizationPalette[index % dataVisualizationPalette.length] }} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </AnalyticsCard>
  );
}

function CircularDataChart({ chart }: { chart: DashboardChart }) {
  const series = chart.series.filter((item) => Number.isFinite(item.value) && item.value >= 0).slice(0, 6);
  if (series.length < 2) return null;
  const total = series.reduce((sum, item) => sum + item.value, 0);
  const segments = series.map((item, index) => {
    const shareFor = (value: number) => total > 0 ? value / total * 100 : 100 / series.length;
    const start = series.slice(0, index).reduce((sum, current) => sum + shareFor(current.value), 0);
    return `${item.tone ? semanticChartColors[item.tone] : dataVisualizationPalette[index % dataVisualizationPalette.length]} ${start}% ${start + shareFor(item.value)}%`;
  });
  const style = { "--dashboard-donut": `conic-gradient(${segments.join(", ")})` } as CSSProperties;

  return (
    <AnalyticsCard className="dashboard-radial">
      <header><BarChart3 aria-hidden="true" size={17} /><h2>{chart.title}</h2></header>
      <div className="dashboard-radial__content">
        <div aria-label={series.map((item) => `${item.label}: ${item.value}`).join(", ")} className="dashboard-radial__chart" role="img" style={style}>
          <span><strong>{total.toLocaleString("vi-VN")}</strong><small>Tổng</small></span>
        </div>
        <ul>
          {series.map((item, index) => (
            <li key={item.label}>
              <i aria-hidden="true" style={{ background: item.tone ? semanticChartColors[item.tone] : dataVisualizationPalette[index % dataVisualizationPalette.length] }} />
              <span>{item.label}</span><strong>{item.value.toLocaleString("vi-VN")}</strong>
            </li>
          ))}
        </ul>
      </div>
    </AnalyticsCard>
  );
}

function DataChart({ chart }: { chart: DashboardChart }) {
  const safeSeries = chart.series.filter((item) => Number.isFinite(item.value) && item.value >= 0);
  if (!safeSeries.length) return null;
  const maximum = Math.max(...safeSeries.map((item) => item.value), 1);

  if (chart.kind === "line") {
    const points = safeSeries.map((item, index) => ({
      x: 30 + index * (440 / Math.max(1, safeSeries.length - 1)),
      y: 112 - item.value / maximum * 82,
      item
    }));
    return <ChartCard className="dashboard-data-chart--line">
      <header><BarChart3 aria-hidden="true" size={17} /><h2>{chart.title}</h2></header>
      <div className="dashboard-line-chart" role="img" aria-label={`${chart.title}: ${safeSeries.map((item) => `${item.label} ${item.value}`).join(", ")}`}>
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 500 140"><path className="dashboard-line-chart__baseline" d="M30 112H470" /><polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} />{points.map((point) => <circle cx={point.x} cy={point.y} key={point.item.label} r="4"><title>{point.item.label}: {point.item.value}</title></circle>)}</svg>
        <div>{safeSeries.map((item) => <span key={item.label}>{item.label}</span>)}</div>
      </div>
    </ChartCard>;
  }

  return (
    <ChartCard>
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
    </ChartCard>
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
      {items.map((item, index) => (
        <li data-priority={item.priority?.toLocaleLowerCase("vi") ?? "normal"} key={`${item.type}-${item.id}-${item.href}-${index}`}>
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

function BriefingSection({ widget, onRetry, excludedItems, variant = "default", showMetrics = true }: { widget: DashboardWidgetResult; onRetry: (key: DashboardWidgetKey) => void; excludedItems: ReadonlySet<string>; variant?: "default" | "timeline"; showMetrics?: boolean }) {
  if (widget.status === "error") {
    return <OperationalSection className="dashboard-briefing operational-section--error dashboard-widget--compact" title={widget.label}><div className="widget-error" role="status"><AlertTriangle aria-hidden="true" size={17} /><span>Không thể tải dữ liệu</span><Button onClick={() => onRetry(widget.key)} size="sm">Thử lại</Button></div></OperationalSection>;
  }
  if (!widget.data) {
    return <OperationalSection className="dashboard-briefing operational-section--loading" title={widget.label}><div className="widget-skeleton"><span /><span /></div></OperationalSection>;
  }

  const data = widget.data;
  const items = (data.items ?? []).filter((item) => !excludedItems.has(`${item.type}:${item.id}`));
  const metrics = showMetrics ? (data.metrics ?? []).filter((metric) => metric.value !== 0 && metric.value !== "0") : [];
  const primaryAction = typeof data.state?.primaryAction === "string" ? data.state.primaryAction : undefined;
  const primaryHref = typeof data.state?.primaryHref === "string" ? data.state.primaryHref : undefined;

  if (!metrics.length && !items.length && !(primaryAction && primaryHref)) return null;

  return (
    <OperationalSection className="dashboard-briefing" title={widget.label}>
      {metrics.length ? <dl className="dashboard-metrics">{metrics.map((metric) => (
        <div className="dashboard-metric" key={`${metric.label}-${metric.href ?? "metric"}`}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
          {metric.href ? <Link aria-label={`Mở ${metric.label}`} href={metric.href}><ArrowRight aria-hidden="true" size={15} /></Link> : null}
        </div>
      ))}</dl> : null}
      {primaryAction && primaryHref ? <Link className="dashboard-primary-action" href={primaryHref}>{primaryAction}<ArrowRight aria-hidden="true" size={17} /></Link> : null}
      {items.length ? <WorkItems items={items} variant={variant} /> : null}
    </OperationalSection>
  );
}

type PersonalTodo = { id: string; title: string; dueDate?: string; priority: "low" | "medium" | "high"; completed: boolean };

function PersonalNoteWidget() {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/v1/workspace/note", { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error(body.error?.message);
          setNote(body.data.content ?? "");
        })
        .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Không thể tải ghi chú."); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, []);

  async function saveNote() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/v1/workspace/note", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: note }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setSaved(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể lưu ghi chú."); }
    finally { setSaving(false); }
  }

  return (
    <section className="dashboard-note">
      <header><span><StickyNote aria-hidden="true" size={17} /><h2>Ghi chú nhanh</h2></span><Button disabled={saved || saving} leftIcon={<Save aria-hidden="true" size={15} />} onClick={() => void saveNote()} size="sm" variant="ghost">Lưu</Button></header>
      <textarea aria-label="Ghi chú cá nhân" onChange={(event) => { setNote(event.target.value); setSaved(false); }} placeholder="Ghi lại việc cần nhớ…" value={note} />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}

function PersonalTodoWidget() {
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTodos = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/v1/workspace/todos", { cache: "no-store", signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setTodos(body.data ?? []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadTodos(controller.signal).catch((reason) => {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Không thể tải việc cá nhân.");
    }), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadTodos]);

  async function createTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget, form = new FormData(formElement);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/v1/workspace/todos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.get("title"), dueDate: form.get("dueDate") || undefined, priority: form.get("priority") }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setTodos((current) => [body.data, ...current]);
      formElement.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tạo việc cá nhân."); }
    finally { setBusy(false); }
  }

  async function patchTodo(todo: PersonalTodo, patch: Partial<Pick<PersonalTodo, "completed" | "title" | "dueDate" | "priority">>) {
    const response = await fetch(`/api/v1/workspace/todos/${todo.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message ?? "Không thể cập nhật việc cá nhân."); return; }
    setTodos((current) => current.map((item) => item.id === todo.id ? body.data : item));
  }

  async function removeTodo(todo: PersonalTodo) {
    const response = await fetch(`/api/v1/workspace/todos/${todo.id}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message ?? "Không thể xóa việc cá nhân."); return; }
    setTodos((current) => current.filter((item) => item.id !== todo.id));
  }

  return (
    <OperationalSection className="dashboard-personal-todos" title="Việc cá nhân">
      <form className="dashboard-personal-todos__form" onSubmit={createTodo}>
        <input aria-label="Tên việc" className="input" maxLength={240} name="title" placeholder="Thêm việc" required />
        <input aria-label="Hạn hoàn thành" className="input" name="dueDate" type="date" />
        <select aria-label="Mức ưu tiên" className="select" defaultValue="medium" name="priority"><option value="low">Thấp</option><option value="medium">Vừa</option><option value="high">Cao</option></select>
        <Button aria-label="Thêm việc" disabled={busy} size="sm" type="submit" variant="soft"><Plus size={15} /></Button>
      </form>
      <ul className="dashboard-personal-todos__list">
        {todos.slice(0, 8).map((todo) => <li className={todo.completed ? "is-complete" : ""} key={todo.id}><input aria-label={todo.completed ? "Mở lại việc" : "Hoàn thành việc"} checked={todo.completed} onChange={() => void patchTodo(todo, { completed: !todo.completed })} type="checkbox" /><span><strong>{todo.title}</strong><small>{todo.dueDate ?? "Không có hạn"} · {todo.priority === "high" ? "Cao" : todo.priority === "low" ? "Thấp" : "Vừa"}</small></span><button aria-label="Xóa việc" onClick={() => void removeTodo(todo)} type="button"><Trash2 size={15} /></button></li>)}
        {!todos.length ? <li className="dashboard-personal-todos__empty">Chưa có việc cá nhân.</li> : null}
      </ul>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </OperationalSection>
  );
}

function RealtimeClock() {
  const [now, setNow] = useState<Date>();
  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1_000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, []);
  return <time dateTime={now?.toISOString()}>{now ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(now) : "--:--:--"}</time>;
}

export function DashboardView({ profile, scope }: { profile?: DashboardProfileKey; scope?: "global" }) {
  const currentUser = useCurrentUser();
  const [model, setModel] = useState<DashboardReadModel>();
  const [error, setError] = useState("");
  const [widgetPreferences, setWidgetPreferences] = useState<{ visibility: Record<string, boolean>; order: string[] }>({ visibility: {}, order: [] });
  const endpoint = useMemo(() => `/api/v1/dashboard${scope === "global" ? "?scope=global" : profile ? `?profile=${profile}` : ""}`, [profile, scope]);

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(endpoint, { cache: "no-store", signal });
    const body = await response.json() as ApiBody;
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải bản tin vận hành.");
    setError(""); setModel(body.data);
  }, [endpoint]);
  useDomainReconciliation("dashboard", load);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setError("Dashboard tải quá lâu. Vui lòng thử lại.");
    }, 12_000);
    const timer = window.setTimeout(() => { void load(controller.signal).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "Không thể tải bản tin vận hành.");
    }).finally(() => window.clearTimeout(timeout)); }, 0);
    return () => { window.clearTimeout(timer); window.clearTimeout(timeout); controller.abort(); };
  }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/workspace/preferences", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json();
      setWidgetPreferences({ visibility: body.data?.dashboardWidgetVisibility ?? {}, order: body.data?.dashboardWidgetOrder ?? [] });
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

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

  if (!model && !error) return <LoadingState description="" title="Đang tải Dashboard" />;
  if (error) return <div className="dashboard-load-error"><AlertTriangle aria-hidden="true" size={20} /><span>{error}</span><Button leftIcon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => void load()}>Thử lại</Button></div>;
  if (!model) return null;

  const attentionIds = new Set(model.attention.map((item) => `${item.type}:${item.id}`));
  const visibleWidgets = model.widgets.filter((widget) => widget.key !== "quick_actions" && widgetPreferences.visibility[widget.key] !== false).sort((first, second) => {
    const firstIndex = widgetPreferences.order.indexOf(first.key), secondIndex = widgetPreferences.order.indexOf(second.key);
    if (firstIndex >= 0 && secondIndex >= 0) return firstIndex - secondIndex;
    if (firstIndex >= 0) return -1;
    if (secondIndex >= 0) return 1;
    return 0;
  });
  const quickActions = model.widgets.find((widget) => widget.key === "quick_actions")?.data?.actions ?? [];
  const overviewMetrics = collectOverviewMetrics(visibleWidgets);
  const context = scope === "global" ? "global" : profile ?? model.profile;
  const displayedMetrics = pickMetrics(overviewMetrics, context);
  const allCharts = visibleWidgets.flatMap((widget) => widget.data?.charts ?? []);
  const trendChart = allCharts.find((chart) => chart.kind === "line") ?? allCharts[0];
  const donutChart = allCharts.find((chart) => chart.key !== trendChart?.key && chart.series.length > 1);
  const hasVisualizations = Boolean(trendChart || donutChart) || hasAnalyticsData(displayedMetrics);
  const featuredActions = quickActions.slice(0, 4);
  const queueWidgets = visibleWidgets.filter((widget) => queueKeys.has(widget.key));
  const activityWidgets = visibleWidgets.filter((widget) => activityKeys.has(widget.key));
  const notificationWidget = activityWidgets.find((widget) => widget.key === "recent_notifications");
  const operationalKeys = new Set<DashboardWidgetKey>(["warehouse_low_stock", "project_attention", "hr_summary", "attendance_overview", "shipment_attention", "accounting_summary"]);
  const operationalWidgets = visibleWidgets.filter((widget) => operationalKeys.has(widget.key));
  const taskWidgets = queueWidgets.filter((widget) => !operationalKeys.has(widget.key));
  const pendingCount = model.attention.length;
  const formattedDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "full" }).format(new Date(model.generatedAt));

  return (
    <DashboardPageTemplate className={model.profile === "supervisor" ? "dashboard-page--supervisor" : undefined}>
      <header className="dashboard-heading">
        <div>
          <h1>Chào, {currentUser.displayName}</h1>
          <span className="dashboard-eyebrow">Hôm nay bạn có {pendingCount} việc cần xử lý.</span>
        </div>
        <div className="dashboard-date-card"><CalendarDays aria-hidden="true" size={18} /><span><strong>{formattedDate}</strong><small><RealtimeClock /> · {model.profileLabel}</small></span></div>
      </header>
      <ModuleLauncher />
      {quickActions.length ? (
        <nav aria-label="Tác vụ thường dùng" className="dashboard-command-bar">
          <strong>Tác vụ nhanh</strong>
          <div>
            {featuredActions.map((action, index) => {
              const ActionIcon = quickActionIcon(action.label);
              return <Link className={`button dashboard-quick-action ${index === 0 ? "button--primary" : "button--secondary"}`} href={action.href} key={action.key}><ActionIcon aria-hidden="true" size={15} />{action.label}</Link>;
            })}
          </div>
        </nav>
      ) : null}
      <MetricStrip metrics={displayedMetrics} />
      <section aria-label="Không gian cá nhân" className="dashboard-personal-grid">
        <OperationalSection className="dashboard-attention" meta={model.attention.length ? <StatusBadge tone="warning">{model.attention.length} mục</StatusBadge> : <StatusBadge tone="success">Ổn định</StatusBadge>} title="Việc cần làm">
          {model.attention.length ? <WorkItems items={model.attention.slice(0, 6)} /> : <p className="dashboard-stable">Không có ngoại lệ cần xử lý.</p>}
        </OperationalSection>
        <PersonalTodoWidget />
        <PersonalNoteWidget />
        {notificationWidget ? <BriefingSection excludedItems={new Set()} onRetry={(key) => void retryWidget(key)} variant="timeline" widget={notificationWidget} /> : null}
      </section>
      {hasVisualizations ? <section aria-label="Phân tích vận hành" className="dashboard-visuals">
          <div className="dashboard-section-heading"><h2>Phân tích vận hành</h2></div>
          <div className="dashboard-chart-grid">
            {trendChart ? <DataChart chart={trendChart} /> : <AnalyticsPanel metrics={displayedMetrics} />}
            {donutChart ? <CircularDataChart chart={donutChart} /> : hasAnalyticsData(displayedMetrics) ? <CircularAnalytics metrics={displayedMetrics} /> : null}
          </div>
        </section> : null}
      {operationalWidgets.length ? <section className="dashboard-operations" aria-labelledby="dashboard-operations-title">
        <div className="dashboard-section-heading"><h2 id="dashboard-operations-title">Tình hình theo phân hệ</h2></div>
        <div className="dashboard-operations-grid">
          {operationalWidgets.map((widget) => <BriefingSection excludedItems={attentionIds} key={widget.key} onRetry={(key) => void retryWidget(key)} widget={widget} />)}
        </div>
      </section> : null}
      <div className="dashboard-bottom-grid dashboard-bottom-grid--single">
        <div className="dashboard-bottom-grid__main">
          {taskWidgets.map((widget) => <BriefingSection excludedItems={attentionIds} key={widget.key} onRetry={(key) => void retryWidget(key)} widget={widget} />)}
        </div>
      </div>
    </DashboardPageTemplate>
  );
}
