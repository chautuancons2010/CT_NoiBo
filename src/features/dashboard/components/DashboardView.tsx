"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { StatusBadge, type StatusBadgeTone } from "@/components/shared/StatusBadge";
import type { DashboardProfileKey, DashboardReadModel, DashboardWidgetKey, DashboardWidgetResult } from "@/features/dashboard/types";

interface ApiBody {
  ok: boolean;
  data?: DashboardReadModel;
  error?: { message: string };
}

const toneByPriority: Record<string, StatusBadgeTone> = {
  CRITICAL: "error",
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "info",
  INFO: "neutral"
};

function WidgetCard({ widget, onRetry }: { widget: DashboardWidgetResult; onRetry: (key: DashboardWidgetKey) => void }) {
  if (widget.status === "error") {
    return (
      <Card className="dashboard-widget dashboard-widget--error">
        <header><h2>{widget.label}</h2></header>
        <div className="widget-error" role="status">
          <AlertTriangle aria-hidden="true" size={18} />
          <span>{widget.error}</span>
          <Button onClick={() => onRetry(widget.key)} size="sm">Thử lại</Button>
        </div>
      </Card>
    );
  }

  if (!widget.data) {
    return (
      <Card aria-busy="true" className="dashboard-widget">
        <header><h2>{widget.label}</h2></header>
        <div className="widget-skeleton"><span /><span /><span /></div>
      </Card>
    );
  }

  const data = widget.data;
  const primaryAction = typeof data?.state?.primaryAction === "string" ? data.state.primaryAction : undefined;
  const primaryHref = typeof data?.state?.primaryHref === "string" ? data.state.primaryHref : undefined;
  return (
    <Card className={`dashboard-widget dashboard-widget--${widget.key}`}>
      <header><h2>{widget.label}</h2></header>
      {data?.metrics?.length ? (
        <div className="dashboard-metrics">
          {data.metrics.map((metric) => {
            const content = <><span>{metric.label}</span><strong>{metric.value}</strong></>;
            return metric.href ? <Link className="dashboard-metric" href={metric.href} key={`${metric.label}-${metric.href}`}>{content}</Link> : <div className="dashboard-metric" key={metric.label}>{content}</div>;
          })}
        </div>
      ) : null}
      {primaryAction && primaryHref ? <Link className="dashboard-primary-action" href={primaryHref}>{primaryAction}<ArrowRight aria-hidden="true" size={18} /></Link> : null}
      {data?.items?.length ? (
        <ul className="dashboard-worklist">
          {data.items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link href={item.href}>
                <span className="dashboard-worklist__main"><strong>{item.title}</strong>{item.context ? <small>{item.context}</small> : null}</span>
                <span className="dashboard-worklist__meta">{item.priority ? <StatusBadge tone={toneByPriority[item.priority]}>{item.priority}</StatusBadge> : null}{item.status ? <span>{item.status}</span> : null}{item.dueOrAge ? <time>{item.dueOrAge}</time> : null}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : data?.items ? <p className="dashboard-empty">Không có việc cần chú ý.</p> : null}
      {data?.actions?.length ? <div className="dashboard-actions">{data.actions.map((action) => <Link className="button button--secondary button--md" href={action.href} key={action.key}>{action.label}</Link>)}</div> : null}
    </Card>
  );
}

export function DashboardView({ profile }: { profile?: DashboardProfileKey }) {
  const [model, setModel] = useState<DashboardReadModel>();
  const [error, setError] = useState("");
  const endpoint = useMemo(() => `/api/v1/dashboard${profile ? `?profile=${profile}` : ""}`, [profile]);

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(endpoint, { cache: "no-store", signal });
    const body = await response.json() as ApiBody;
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải dashboard.");
    setError("");
    setModel(body.data);
  }, [endpoint]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void load(controller.signal).catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Không thể tải dashboard.");
      });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  async function retryWidget(key: DashboardWidgetKey) {
    const separator = endpoint.includes("?") ? "&" : "?";
    setModel((current) => current ? { ...current, widgets: current.widgets.map((widget) => widget.key === key ? { ...widget, status: "ready", data: undefined, error: undefined } : widget) } : current);
    try {
      const response = await fetch(`${endpoint}${separator}widget=${key}`, { cache: "no-store" });
      const body = await response.json() as ApiBody;
      const replacement = body.data?.widgets[0];
      if (!response.ok || !replacement) throw new Error(body.error?.message ?? "Không thể tải widget.");
      setModel((current) => current ? { ...current, widgets: current.widgets.map((widget) => widget.key === key ? replacement : widget) } : current);
    } catch {
      setModel((current) => current ? { ...current, widgets: current.widgets.map((widget) => widget.key === key ? { ...widget, status: "error", error: `Không thể tải ${widget.label.toLocaleLowerCase("vi")}.` } : widget) } : current);
    }
  }

  if (!model && !error) return <div className="dashboard-skeleton" aria-label="Đang tải dashboard"><span /><span /><span /></div>;
  if (error) return <Card className="dashboard-load-error"><AlertTriangle aria-hidden="true" size={20} /><span>{error}</span><Button leftIcon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => void load()}>Thử lại</Button></Card>;
  if (!model) return null;

  return (
    <div className="dashboard-page page-stack">
      <div className="dashboard-heading">
        <div><span className="dashboard-eyebrow"><CalendarDays aria-hidden="true" size={15} />{new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "full" }).format(new Date(model.generatedAt))}</span><h2>{model.profileLabel}</h2></div>
        <Link className="text-link" href="/search">Tìm kiếm toàn hệ thống</Link>
      </div>
      {model.attention.length ? (
        <Card className="dashboard-widget dashboard-attention">
          <header><h2>Việc cần xử lý</h2><StatusBadge tone="warning">{model.attention.length}</StatusBadge></header>
          <ul className="dashboard-worklist">{model.attention.map((item) => <li key={`attention-${item.type}-${item.id}`}><Link href={item.href}><span className="dashboard-worklist__main"><strong>{item.title}</strong>{item.context ? <small>{item.context}</small> : null}</span><span className="dashboard-worklist__meta">{item.priority ? <StatusBadge tone={toneByPriority[item.priority]}>{item.priority}</StatusBadge> : null}{item.dueOrAge ? <time>{item.dueOrAge}</time> : null}</span></Link></li>)}</ul>
        </Card>
      ) : <Card className="dashboard-no-attention">Không có việc cần chú ý.</Card>}
      <div className="dashboard-widget-grid">
        {model.widgets.map((widget) => <WidgetCard key={widget.key} onRetry={(key) => void retryWidget(key)} widget={widget} />)}
      </div>
    </div>
  );
}
