"use client";

import Link from "next/link";
import { Bell, Menu, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import {
  desktopNavigation,
  filterGroupsByAccess,
  isNavigationItemActive,
  type NavigationItem
} from "@/config/navigation";
import type { AuthenticatedUser, Permission } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";
import { navigationIconMap } from "@/components/layout/icons";
import { Drawer } from "@/components/shared/Overlays";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";

interface ExtraItem extends NavigationItem {
  iconNode?: typeof Bell;
}

const mobileExtras: ExtraItem[] = [
  { label: "Thông báo", href: "/notifications", icon: "Bell", iconNode: Bell, requiredPermission: "notification.view" },
  { label: "Cá nhân", href: "/profile", icon: "UserRound", iconNode: UserRound, requiredPermission: "profile.view" }
];

function choosePrimaryItems(items: NavigationItem[], permissions: readonly Permission[]): NavigationItem[] {
  const byHref = new Map(items.map((item) => [item.href, item]));
  const preferred = can(permissions, "warehouse.view")
    ? ["/dashboard", "/warehouse/receipts", "/warehouse/issues", "/warehouse/inventory"]
    : can(permissions, "project.view") || can(permissions, "worker_attendance.view")
      ? ["/dashboard", "/attendance", "/worker-attendance", "/projects"]
      : can(permissions, "approval.inbox.view")
        ? ["/dashboard", "/approvals", "/projects", "/notifications"]
        : ["/dashboard", "/attendance", "/leave", "/notifications"];
  const selected = preferred.flatMap((href) => byHref.get(href) ?? []).slice(0, 4);
  for (const item of items) {
    if (selected.length === 4) break;
    if (!selected.some((entry) => entry.href === item.href)) selected.push(item);
  }
  return selected;
}

export function MobileBottomNav({ pathname, user }: { pathname: string; user: AuthenticatedUser }) {
  const { settings } = useSystemSettings();
  const [moreOpen, setMoreOpen] = useState(false);
  const groups = useMemo(
    () => filterGroupsByAccess(desktopNavigation, user.permissions, settings.modules, settings.navigation),
    [settings.modules, settings.navigation, user.permissions]
  );
  const personalItems = useMemo(() => {
    const items: ExtraItem[] = [];
    if (can(user.permissions, "attendance.self.view")) items.push({ label: "Chấm công", href: "/attendance", icon: "Clock3", requiredPermission: "attendance.self.view" });
    if (can(user.permissions, "leave.self.view")) items.push({ label: "Nghỉ phép", href: "/leave", icon: "FileText", requiredPermission: "leave.self.view" });
    if (can(user.permissions, "worker_attendance.self_scope")) items.push({ label: "Công trường", href: "/worker-attendance", icon: "ClipboardCheck", requiredPermission: "worker_attendance.self_scope" });
    items.push(...mobileExtras.filter((item) => can(user.permissions, item.requiredPermission) || (item.href === "/notifications" && can(user.permissions, "notification.self.view"))));
    return items;
  }, [user.permissions]);
  const allItems = useMemo(() => {
    const flat = groups.flatMap((group) => group.items);
    return [...flat, ...personalItems.filter((item) => !flat.some((entry) => entry.href === item.href))];
  }, [groups, personalItems]);
  const primaryItems = choosePrimaryItems(allItems, user.permissions);

  return (
    <>
      <nav aria-label="Điều hướng mobile" className="mobile-bottom-nav">
        {primaryItems.map((item) => {
          const Icon = navigationIconMap[item.icon];
          const active = isNavigationItemActive(pathname, item);
          return <Link aria-current={active ? "page" : undefined} className={cn("mobile-bottom-nav__item", active && "is-active")} href={item.href} key={item.href}><Icon aria-hidden="true" size={20} /><span>{item.label}</span></Link>;
        })}
        <button aria-expanded={moreOpen} className="mobile-bottom-nav__item" onClick={() => setMoreOpen(true)} type="button"><Menu aria-hidden="true" size={20} /><span>Thêm</span></button>
      </nav>
      <Drawer onClose={() => setMoreOpen(false)} open={moreOpen} title="Tất cả chức năng">
        <nav className="mobile-more-nav">
          {groups.map((group) => <section key={group.label}><h3>{group.label}</h3>{group.items.map((item) => { const Icon = navigationIconMap[item.icon]; return <Link className={isNavigationItemActive(pathname, item) ? "is-active" : undefined} href={item.href} key={item.href} onClick={() => setMoreOpen(false)}><Icon aria-hidden="true" size={19} /><span>{item.label}</span></Link>; })}</section>)}
          <section><h3>Cá nhân</h3>{personalItems.map((item) => { const Icon = item.iconNode ?? navigationIconMap[item.icon]; return <Link href={item.href} key={item.href} onClick={() => setMoreOpen(false)}><Icon aria-hidden="true" size={19} /><span>{item.label}</span></Link>; })}</section>
        </nav>
      </Drawer>
    </>
  );
}
