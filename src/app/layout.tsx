import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { SystemSettingsProvider } from "@/components/providers/SystemSettingsProvider";
import { deriveBrandColorTokens } from "@/config/systemSettings";
import { readSystemSettings } from "@/services/system-settings/systemSettingsService";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readSystemSettings();
  return {
    title: {
      default: settings.branding.systemName,
      template: `%s | ${settings.branding.systemName}`
    },
    description: settings.branding.loginSubtitle,
    icons: settings.branding.faviconUrl
      ? { icon: `${settings.branding.faviconUrl}?v=${settings.branding.assetVersion}` }
      : undefined
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const settings = await readSystemSettings();
  const tokens = deriveBrandColorTokens(settings.appearance.primaryColor);
  const themeStyle = {
    "--color-primary": tokens.primary,
    "--color-primary-hover": tokens.primaryHover,
    "--color-primary-active": tokens.primaryActive,
    "--color-primary-soft": tokens.primarySubtle,
    "--color-primary-border": tokens.primaryBorder,
    "--color-primary-foreground": tokens.primaryForeground,
    "--color-focus-ring": tokens.focusRing
  } as React.CSSProperties;

  return (
    <html
      data-density={settings.appearance.density}
      data-table-density={settings.appearance.tableDensity}
      lang="vi"
      style={themeStyle}
    >
      <body>
        <SystemSettingsProvider initialSettings={settings}>{children}</SystemSettingsProvider>
      </body>
    </html>
  );
}
