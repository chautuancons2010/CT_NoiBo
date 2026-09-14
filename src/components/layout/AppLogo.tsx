import Link from "next/link";
import Image from "next/image";

import { useState } from "react";

import { useBranding, useOrganizationSettings } from "@/components/providers/SystemSettingsProvider";

export function AppLogo({ compact = false }: { compact?: boolean }) {
  const branding = useBranding();
  const organization = useOrganizationSettings();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = compact ? branding.logoCompactUrl ?? branding.logoMainUrl ?? "/brand/chau-tuan-logo.png" : branding.logoMainUrl ?? "/brand/chau-tuan-logo.png";
  const officialLogo = imageUrl === "/brand/chau-tuan-logo.png";

  return (
    <Link aria-label="Về Tổng quan" className="app-logo" href="/dashboard">
      {imageUrl && failedUrl !== imageUrl ? (
        compact && officialLogo ? <span className="app-logo__compact-crop"><Image alt={organization.shortName} height={559} onError={() => setFailedUrl(imageUrl)} src={imageUrl} unoptimized width={441} /></span> : <Image
          alt={organization.shortName}
          className={compact ? "app-logo__image app-logo__--compact" : "app-logo__image"}
          height={officialLogo ? 559 : 38}
          onError={() => setFailedUrl(imageUrl)}
          src={imageUrl}
          unoptimized
          width={officialLogo ? 441 : compact ? 38 : 150}
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
