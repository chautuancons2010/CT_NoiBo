"use client";

import Link from "next/link";

import { navigationIconMap } from "@/components/layout/icons";
import { activeMobileDestination, resolveMobileNavigation } from "@/config/mobileNavigationResolver";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

export function MobileBottomNav({ pathname, user }: { pathname: string; user: AuthenticatedUser }) {
  const model = resolveMobileNavigation(pathname, user);
  const activeDestination = activeMobileDestination(pathname, model);

  return <nav aria-label={model.label} className="mobile-bottom-nav" data-count="5" data-mode={model.mode}>
    {model.direct.map((item) => {
      const Icon = navigationIconMap[item.icon];
      const active = item.href === activeDestination?.href;
      return <Link aria-current={active ? "page" : undefined} className={cn("mobile-bottom-nav__item", active && "is-active", item.quick && "mobile-bottom-nav__item--quick")} data-slot={item.slot} href={item.href} key={item.href}>
        <span className="mobile-bottom-nav__icon"><Icon aria-hidden="true" size={item.quick ? 24 : 21} strokeWidth={1.8} /></span>
        <span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
