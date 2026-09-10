import Link from "next/link";
import type { ReactNode } from "react";

import { routeMetaByPath } from "@/config/routeRegistry";
import { cn } from "@/lib/utils/cn";

const settingsRoutes = [
  "/settings/organization",
  "/settings/attendance",
  "/settings/roles",
  "/settings/permissions",
  "/settings/approval-workflows",
  "/settings/export-templates",
  "/settings/integrations",
  "/settings/audit-log"
] as const;

export interface SettingsShellProps {
  activePath: (typeof settingsRoutes)[number] | "/settings/users";
  children: ReactNode;
}

export function SettingsShell({ activePath, children }: SettingsShellProps) {
  return (
    <div className="settings-shell">
      <aside className="settings-subnav" aria-label="Điều hướng cài đặt">
        <h2>Hệ thống</h2>
        <nav>
          <Link className={cn(activePath === "/settings/users" && "is-active")} href="/settings/users">
            Người dùng
          </Link>
          {settingsRoutes.map((href) => (
            <Link className={cn(activePath === href && "is-active")} href={href} key={href}>
              {routeMetaByPath[href].title}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="settings-shell__content">{children}</div>
    </div>
  );
}
