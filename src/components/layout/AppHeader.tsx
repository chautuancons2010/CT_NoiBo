"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Grid3X3 } from "lucide-react";

import { getRouteMeta } from "@/config/routeRegistry";
import { applicationForPath } from "@/config/moduleRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { UserMenu } from "@/components/shared/UserMenu";
import { AppLogo } from "@/components/layout/AppLogo";
import { useBranding } from "@/components/providers/SystemSettingsProvider";
import { NotificationBell } from "@/features/shared-platforms/components/NotificationBell";
import { CommandPalette } from "@/features/search/components/CommandPalette";
import { QuickCreateMenu } from "@/components/layout/QuickCreateMenu";
import type { RealtimeConnectionState } from "@/lib/realtime/coordinator";

export interface AppHeaderProps {
  pathname: string;
  user: AuthenticatedUser;
  connectionState: RealtimeConnectionState;
}

const connectionLabels: Record<RealtimeConnectionState, string> = {
  connected: "Đồng bộ tức thời",
  connecting: "Đang kết nối",
  reconnecting: "Đang kết nối lại",
  degraded: "Đồng bộ dự phòng",
  offline: "Đang ngoại tuyến"
};

export function AppHeader({ pathname, user, connectionState }: AppHeaderProps) {
  const branding = useBranding();
  const meta = getRouteMeta(pathname);
  const application = applicationForPath(pathname);

  useEffect(() => {
    document.title = `${meta.title} | ${branding.systemName}`;
  }, [branding.systemName, meta.title]);

  return (
    <header className="app-header">
      <div className="app-header__mobile-logo"><AppLogo compact /></div>
      <div className="app-header__title">
        <span>{application.label}</span>
        <h1>{meta.title}</h1>
      </div>
      <div className="app-header__search"><CommandPalette user={user} /></div>
      <div className="app-header__actions">
        <QuickCreateMenu user={user} />
        <Link aria-label="Mở không gian làm việc" className="icon-link app-switcher" href="/workspace" title="Không gian làm việc">
          <Grid3X3 aria-hidden="true" size={19} />
        </Link>
        <span aria-label={connectionLabels[connectionState]} className={`connection-status is-${connectionState}`} title={connectionLabels[connectionState]}>
          <i aria-hidden="true" />
        </span>
        <NotificationBell accountId={user.id} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
