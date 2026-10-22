"use client";

import Link from "next/link";
import { Grid2X2, MoreHorizontal } from "lucide-react";
import { useState, type CSSProperties } from "react";

import { AppLogo } from "@/components/layout/AppLogo";
import { navigationIconMap, navigationIconSizes } from "@/components/layout/icons";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { Drawer } from "@/components/shared/Overlays";
import { visibleApplications } from "@/config/moduleRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

interface MobileAppLauncherProps {
  user: AuthenticatedUser;
  variant?: "brand" | "more";
}

export function MobileAppLauncher({ user, variant = "brand" }: MobileAppLauncherProps) {
  const { settings } = useSystemSettings();
  const [open, setOpen] = useState(false);
  const applications = visibleApplications(user, settings.modules);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Mở Ứng dụng của tôi"
        className={cn("mobile-app-launcher__trigger", `mobile-app-launcher__trigger--${variant}`)}
        onClick={() => setOpen(true)}
        type="button"
      >
        {variant === "brand" ? <><AppLogo compact /><span className="mobile-app-launcher__indicator"><Grid2X2 aria-hidden="true" size={11} /></span></> : <MoreHorizontal aria-hidden="true" size={22} />}
      </button>
      <Drawer onClose={() => setOpen(false)} open={open} title="Ứng dụng của tôi">
        <nav aria-label="Ứng dụng được phép sử dụng" className="mobile-app-launcher__list">
          {applications.map((application) => {
            const Icon = navigationIconMap[application.icon];
            const style = {
              "--module-accent": application.accentColor,
              "--module-surface": application.accentSoft
            } as CSSProperties;
            return (
              <Link href={application.defaultRoute} key={application.id} onClick={() => setOpen(false)} style={style}>
                <span><Icon aria-hidden="true" size={navigationIconSizes.rail} strokeWidth={1.8} /></span>
                <strong>{application.label}</strong>
              </Link>
            );
          })}
        </nav>
        {!applications.length ? <p className="mobile-app-launcher__empty">Bạn chưa có ứng dụng được cấp quyền.</p> : null}
      </Drawer>
    </>
  );
}
