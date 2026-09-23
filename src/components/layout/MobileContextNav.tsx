"use client";

import Link from "next/link";

import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { applicationForPath, visibleApplicationShortcuts } from "@/config/moduleRegistry";
import { isNavigationItemActive } from "@/config/navigation";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

export function MobileContextNav({ pathname, user }: { pathname: string; user: AuthenticatedUser }) {
  const { settings } = useSystemSettings();
  const application = applicationForPath(pathname);
  const items = visibleApplicationShortcuts(application, user, settings.modules, settings.navigation);

  if (application.id === "overview" || items.length < 2) return null;

  return (
    <nav aria-label={`Điều hướng ${application.label}`} className="mobile-context-nav">
      <div>
        {items.map((item) => {
          const active = isNavigationItemActive(pathname, item);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn("mobile-context-nav__item", active && "is-active")}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

