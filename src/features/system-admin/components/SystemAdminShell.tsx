"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { can, type Permission } from "@/lib/auth/permissions";

const adminRoutes = [
  ["/system-admin/branding", "Thương hiệu", "branding.view"],
  ["/system-admin/appearance", "Giao diện", "appearance.view"],
  ["/system-admin/navigation", "Điều hướng", "navigation.manage"],
  ["/system-admin/dashboard", "Dashboard", "navigation.manage"],
  ["/system-admin/modules", "Module", "module.manage"],
  ["/system-admin/organization", "Tổ chức", "organization_settings.view"],
  ["/system-admin/localization", "Định dạng & thời gian", "localization.manage"],
  ["/system-admin/security", "Bảo mật", "system_admin.access"],
  ["/system-admin/config-history", "Lịch sử cấu hình", "config_history.view"],
  ["/system-admin/audit", "Audit log", "audit.view"]
] as const;

export function SystemAdminShell({ children, permissions }: { children: ReactNode; permissions: readonly Permission[] }) {
  const pathname = usePathname();

  function handleNavigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (href === pathname || document.body.dataset.systemAdminDirty !== "true") return;
    if (!window.confirm("Bạn có thay đổi chưa lưu. Rời trang?")) event.preventDefault();
  }

  return (
    <div className="system-admin-shell">
      <aside className="system-admin-subnav" aria-label="Trung tâm quản trị">
        <div className="system-admin-subnav__title">TRUNG TÂM QUẢN TRỊ</div>
        <nav>
          {adminRoutes.filter(([, , permission]) => can(permissions, permission)).map(([href, label]) => (
            <Link
              className={cn(pathname === href && "is-active")}
              href={href}
              key={href}
              onClick={(event) => handleNavigate(event, href)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="system-admin-content">{children}</div>
    </div>
  );
}
