"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarDays, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { visibleApplications, visibleApplicationShortcuts } from "@/config/moduleRegistry";
import type { ModuleSettings, NavigationSettings } from "@/config/systemSettings";
import { navigationIconMap } from "@/components/layout/icons";
import { visibleQuickActions } from "@/features/dashboard/registry";
import type { DashboardItem, DashboardReadModel } from "@/features/dashboard/types";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

export function WorkspaceView({
  user,
  modules,
  navigation,
  today
}: {
  user: AuthenticatedUser;
  modules: ModuleSettings;
  navigation: NavigationSettings;
  today: string;
}) {
  const availableModules = visibleApplications(user, modules);
  const quickActions = visibleQuickActions(user).slice(0, 5);
  const [attention, setAttention] = useState<DashboardItem[]>();

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/dashboard", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<{ data?: DashboardReadModel }>)
      .then((body) => setAttention(body.data?.attention ?? []))
      .catch(() => setAttention([]));
    return () => controller.abort();
  }, []);

  return (
    <div className="workspace-page page-stack">
      <section className="workspace-hero">
        <div className="workspace-hero__copy">
          <span className="workspace-kicker"><Sparkles aria-hidden="true" size={16} /> Không gian làm việc</span>
          <h2>Xin chào, {user.displayName}</h2>
          <span className="workspace-date"><CalendarDays aria-hidden="true" size={16} /> {today}</span>
          <Link className="workspace-search" href="/search">
            <Search aria-hidden="true" size={19} />
            <span>Tìm chức năng, dự án, nhân viên, hàng hóa...</span>
            <kbd>⌘ K</kbd>
          </Link>
        </div>
        <div aria-hidden="true" className="workspace-hero__geometry"><i /><i /><i /></div>
      </section>

      {attention?.length ? (
        <section className="workspace-section workspace-attention">
          <header><h3>Việc cần xử lý</h3><span>{attention.length} việc</span></header>
          <div>{attention.slice(0, 6).map((item) => <Link href={item.href} key={`${item.type}-${item.id}`}><AlertCircle aria-hidden="true" size={18} /><span><strong>{item.title}</strong>{item.context ? <small>{item.context}</small> : null}</span><ArrowRight aria-hidden="true" size={16} /></Link>)}</div>
        </section>
      ) : null}

      <section className="workspace-section">
        <header><h3>Ứng dụng của tôi</h3><span>{availableModules.length} ứng dụng</span></header>
        <div className="workspace-grid">
          {availableModules.map((module) => {
            const Icon = navigationIconMap[module.icon];
            const shortcuts = visibleApplicationShortcuts(module, user, modules, navigation).slice(0, 3);
            return (
              <article className={`workspace-module workspace-module--${module.tone}`} key={module.id}>
                <Link className="workspace-module__main" href={module.defaultRoute}>
                  <span className="workspace-module__icon"><Icon aria-hidden="true" size={25} /></span>
                  <strong>{module.label}</strong>
                  <ArrowRight aria-hidden="true" className="workspace-module__arrow" size={18} />
                </Link>
                {shortcuts.length ? <div className="workspace-module__shortcuts">{shortcuts.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</div> : null}
              </article>
            );
          })}
        </div>
      </section>

      {quickActions.length ? (
        <section className="workspace-section workspace-quick-actions">
          <header><h3>Lối tắt</h3></header>
          <div>{quickActions.map((action) => <Link href={action.href} key={action.key}>{action.label}<ArrowRight aria-hidden="true" size={15} /></Link>)}</div>
        </section>
      ) : null}
    </div>
  );
}
