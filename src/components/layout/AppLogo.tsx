import Link from "next/link";
import Image from "next/image";

import { useState } from "react";

import { useBranding, useOrganizationSettings } from "@/components/providers/SystemSettingsProvider";

export function AppLogo({ compact = false }: { compact?: boolean }) {
  const branding = useBranding();
  const organization = useOrganizationSettings();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = compact ? branding.logoCompactUrl ?? branding.logoMainUrl : branding.logoMainUrl;

  return (
    <Link aria-label="Về Tổng quan" className="app-logo" href="/dashboard">
      {imageUrl && failedUrl !== imageUrl ? (
        <Image
          alt={organization.shortName}
          className={compact ? "app-logo__image app-logo__--compact" : "app-logo__image"}
          height={38}
          onError={() => setFailedUrl(imageUrl)}
          src={imageUrl}
          unoptimized
          width={compact ? 38 : 150}
        />
      ) : (
        <span aria-hidden="true" className="app-logo__mark">CT</span>
      )}
      {!compact ? (
        <span className="app-logo__text">
          <strong>{organization.shortName}</strong>
          <small>{branding.systemName}</small>
        </span>
      ) : null}
    </Link>
  );
}
