"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import { CalendarDays, LockKeyhole, X } from "lucide-react";

import { navigationIconMap } from "@/components/layout/icons";
import { IconButton } from "@/components/shared/Button";
import { applicationsForLauncher } from "@/config/moduleRegistry";
import type { ModuleSettings, NavigationSettings } from "@/config/systemSettings";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

type ApplicationStyle = CSSProperties & {
  "--application-accent": string;
  "--application-soft": string;
};

export function WorkspaceView({
  user,
  modules,
  today
}: {
  user: AuthenticatedUser;
  modules: ModuleSettings;
  navigation: NavigationSettings;
  today: string;
}) {
  const applications = applicationsForLauncher(user, modules);
  const [lockedApplication, setLockedApplication] = useState<string>();

  return (
    <div className="application-launcher">
      <header className="application-launcher__header">
        <div>
          <span>Ứng dụng</span>
          <h1>Chọn khu vực làm việc</h1>
        </div>
        <time><CalendarDays aria-hidden="true" size={15} />{today}</time>
      </header>

      {lockedApplication ? (
        <div className="application-lock-notice" role="status">
          <LockKeyhole aria-hidden="true" size={18} />
          <span>Bạn không có quyền truy cập ứng dụng {lockedApplication}. Vui lòng liên hệ quản trị viên nếu cần được cấp quyền.</span>
          <IconButton label="Đóng thông báo" onClick={() => setLockedApplication(undefined)}><X aria-hidden="true" size={16} /></IconButton>
        </div>
      ) : null}

      <section aria-label="Danh sách ứng dụng" className="application-launcher__grid">
        {applications.map((application) => {
          const Icon = navigationIconMap[application.icon];
          const style: ApplicationStyle = {
            "--application-accent": application.accentColor,
            "--application-soft": application.accentSoft
          };
          const content = (
            <>
              <span className="application-tile__icon">
                <Icon aria-hidden="true" size={32} />
                {!application.accessible ? <LockKeyhole aria-hidden="true" className="application-tile__lock" size={13} /> : null}
              </span>
              <strong>{application.label}</strong>
            </>
          );

          return application.accessible ? (
            <Link className="application-tile" href={application.defaultRoute} key={application.id} style={style}>{content}</Link>
          ) : (
            <button
              aria-disabled="true"
              className="application-tile is-locked"
              key={application.id}
              onClick={() => setLockedApplication(application.label)}
              style={style}
              title="Bạn chưa được cấp quyền truy cập ứng dụng này."
              type="button"
            >
              {content}
            </button>
          );
        })}
      </section>
    </div>
  );
}
