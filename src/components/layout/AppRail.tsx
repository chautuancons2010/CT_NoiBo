"use client";

import { WorkspaceLink as Link } from "@/components/shared/WorkspaceLink";
import { ChevronDown, LockKeyhole, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { attendanceOnlyRelease, hasUnrestrictedReleaseAccess, isReleasedFeaturePath } from "@/config/featureRelease";
import { useEffect, useId, useState } from "react";

import { AppLogo } from "@/components/layout/AppLogo";
import { navigationIconMap, navigationIconSizes } from "@/components/layout/icons";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { IconButton } from "@/components/shared/Button";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Tooltip } from "@/components/shared/Primitives";
import { LinkLoadingIndicator } from "@/components/shared/LinkLoadingIndicator";
import type { NavigationGroup, NavigationItem } from "@/config/navigation";
import { applicationForPath, contextualNavigationGroups } from "@/config/moduleRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";
import chrome from "./ApplicationChrome.module.css";

interface AppRailProps {
  pathname: string;
  user: AuthenticatedUser;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function RailNavigation({ groups, pathname, collapsed, user }: {
  groups: NavigationGroup[];
  pathname: string;
  collapsed: boolean;
  user: AuthenticatedUser;
}) {
  const id = useId();
  // A detail/create route belongs to its closest worklist, including exact lists.
  const activeHref = groups.flatMap((group) => group.items)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
  const activeGroup = groups.find((group) => group.items.some((item) => item.href === activeHref));
  const activeGroupId = activeGroup?.id;
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => {
    const hrGroups = groups.filter(group => group.id?.startsWith("hr-"));
    if (hrGroups.length) return new Set(hrGroups.map(group => group.id!));
    const initial = activeGroupId ?? (activeGroup ? undefined : groups.find(group => group.id)?.id);
    return new Set(initial ? [initial] : []);
  });
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active && activeGroupId) setOpenGroups(current => current.has(activeGroupId) ? current : new Set([...current, activeGroupId]));
    });
    return () => { active = false; };
  }, [activeGroupId, pathname]);

  const renderLink = (item: NavigationItem, nested = false) => {
    const Icon = navigationIconMap[item.icon];
    const homeRedirect = attendanceOnlyRelease && !hasUnrestrictedReleaseAccess(user.roleCodes) && item.href === "/dashboard";
    const label = homeRedirect ? "Cá nhân" : item.label;
    const href = homeRedirect ? "/personal" : item.href;
    if (!isReleasedFeaturePath(item.href, "GET", user.roleCodes)) return <li key={item.href}><span aria-disabled="true" aria-label={`${label} · Đang khóa`} className={cn("app-rail__link", nested && "app-rail__child-link")} data-locked role="link">{!nested ? <Icon aria-hidden="true" size={navigationIconSizes.rail}/> : null}{!collapsed || nested ? <span>{label}</span> : null}<LockKeyhole aria-hidden="true" className="app-rail__lock" size={12}/></span></li>;
    const active = activeHref === item.href || homeRedirect && pathname.startsWith("/personal");
    const link = <Link
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn("app-rail__link", nested && "app-rail__child-link", active && "is-active")}
      href={href}
    >
      {!nested ? <Icon aria-hidden="true" size={navigationIconSizes.rail} /> : null}
      {!collapsed || nested ? <span>{label}</span> : null}
      <LinkLoadingIndicator />
    </Link>;
    return <li key={item.href}>{collapsed && !nested
      ? <Tooltip className="app-rail__tooltip" content={item.label} placement="right" portal>{link}</Tooltip>
      : link}</li>;
  };

  return <ul className="app-rail__groups">
    {groups.map((group) => {
      if (group.flat) return <li className="app-rail__direct-group" key={group.id ?? group.label}>{!collapsed ? <span className="app-rail__section-label">{group.label}</span> : null}<ul>{group.items.map(item => renderLink(item))}</ul></li>;
      if (!group.id || group.items.length === 1) {
        return <li className={cn("app-rail__direct-group", group.items[0]?.href === "/dashboard" && "app-rail__home")} key={group.id ?? group.label}><ul>{group.items.map((item) => renderLink(item))}</ul></li>;
      }
      const groupId = group.id;
      const Icon = navigationIconMap[group.icon ?? group.items[0].icon];
      const current = group === activeGroup;
      const expanded = openGroups.has(groupId);
      const panelId = `${id}-${groupId}`;
      return <li className={cn("app-rail__group", current && "is-current")} key={groupId}>
        {collapsed ? <DropdownMenu key={pathname} label={group.label}
          trigger={<span title={group.label}><Icon aria-hidden="true" size={navigationIconSizes.rail} /></span>}>
          {group.items.map((item) => <Link aria-current={activeHref === item.href ? "page" : undefined} href={item.href} key={item.href}>{item.label}</Link>)}
        </DropdownMenu> : <>
          <button aria-controls={panelId} aria-expanded={expanded}
            className="app-rail__group-toggle" onClick={() => setOpenGroups(current => {
              const next = new Set(current);
              if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
              return next;
            })} type="button">
            <Icon aria-hidden="true" size={navigationIconSizes.rail} />
            <span>{group.label}</span>
            <ChevronDown aria-hidden="true" className="app-rail__chevron" size={15} />
          </button>
          <ul aria-label={group.label} className="app-rail__children" hidden={!expanded} id={panelId}>
            {group.items.map((item) => renderLink(item, true))}
          </ul>
        </>}
      </li>;
    })}
  </ul>;
}

export function AppRail({ pathname, user, collapsed, onCollapsedChange }: AppRailProps) {
  const { settings } = useSystemSettings();
  const application = applicationForPath(pathname);
  const groups = contextualNavigationGroups(pathname, user, settings.modules, settings.navigation);

  return (
    <aside className={cn("app-rail", chrome.rail, collapsed && "is-collapsed")} aria-label={`Điều hướng ${application.label}`}>
      <div className="app-rail__brand"><AppLogo compact />{!collapsed ? <strong className="app-rail__brand-name">{settings.organization.shortName}</strong> : null}</div>
      <nav className="app-rail__nav" id="desktop-navigation" key={application.id}>
        <RailNavigation collapsed={collapsed} groups={groups} pathname={pathname} user={user} />
      </nav>
      <div className="app-rail__footer">
        <IconButton aria-controls="desktop-navigation" aria-expanded={!collapsed} className="app-rail__collapse"
          label={collapsed ? "Mở rộng điều hướng" : "Thu gọn điều hướng"} onClick={() => onCollapsedChange(!collapsed)}>
          {collapsed ? <PanelLeftOpen aria-hidden="true" size={navigationIconSizes.control} /> : <PanelLeftClose aria-hidden="true" size={navigationIconSizes.control} />}
          {!collapsed ? <span>Thu gọn</span> : null}
        </IconButton>
      </div>
    </aside>
  );
}
