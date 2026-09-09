import Link from "next/link";

import { appConfig } from "@/config/app";

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="Về Tổng quan" className="app-logo" href="/dashboard">
      <span aria-hidden="true" className="app-logo__mark">
        CT
      </span>
      {!compact ? (
        <span className="app-logo__text">
          <strong>{appConfig.shortName}</strong>
          <small>Nội bộ doanh nghiệp</small>
        </span>
      ) : null}
    </Link>
  );
}
