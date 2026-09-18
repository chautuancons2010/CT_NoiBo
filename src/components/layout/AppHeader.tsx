"use client";

import { useEffect } from "react";

import { getRouteMeta } from "@/config/routeRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { UserMenu } from "@/components/shared/UserMenu";
import { QuickCreateMenu } from "@/components/layout/QuickCreateMenu";
import { AppLogo } from "@/components/layout/AppLogo";
import { useBranding } from "@/components/providers/SystemSettingsProvider";
import { NotificationBell } from "@/features/shared-platforms/components/NotificationBell";
import { MessageBell } from "@/features/messaging/MessageBell";
import { CommandPalette } from "@/features/search/components/CommandPalette";
import type { RealtimeConnectionState } from "@/lib/realtime/coordinator";
import { can } from "@/lib/auth/permissions";

export interface AppHeaderProps {
  pathname: string;
  user: AuthenticatedUser;
  connectionState: RealtimeConnectionState;
}

const connectionLabels: Record<RealtimeConnectionState, string> = {
  connected: "",
  connecting: "",
  reconnecting: "Đang thử kết nối lại…",
  degraded: "Kết nối realtime không ổn định",
  offline: "Mất kết nối"
};

export function AppHeader({ pathname, user, connectionState }: AppHeaderProps) {
  const branding = useBranding();
  const meta = getRouteMeta(pathname);

  useEffect(() => {
    document.title = `${meta.title} | ${branding.systemName}`;
  }, [branding.systemName, meta.title]);

  return (
    <header className="app-header">
      <div className="app-header__mobile-logo"><AppLogo compact /></div>
      <div className="app-header__search"><CommandPalette user={user} /></div>
      <div className="app-header__actions">
        <QuickCreateMenu user={user} />
        {connectionLabels[connectionState] ? (
          <span aria-label={connectionLabels[connectionState]} className={`connection-status is-${connectionState}`} title={connectionLabels[connectionState]}>
            <i aria-hidden="true" /><span>{connectionLabels[connectionState]}</span>
          </span>
        ) : null}
        {can(user.permissions, "chat.access") ? <MessageBell /> : null}
        <NotificationBell accountId={user.id} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
