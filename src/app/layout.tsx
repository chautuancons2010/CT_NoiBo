import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@/styles/inter-vietnamese.css";
import "@/styles/tokens.css";
import "@/styles/legacy.css";
import "@/styles/erp-components.css";
import "@/styles/mobile-restored.css";
import { SystemSettingsProvider } from "@/components/providers/SystemSettingsProvider";
import { GlobalLoadingIndicator } from "@/components/shared/GlobalLoadingIndicator";
import { deriveBrandColorTokens } from "@/config/systemSettings";
import { readSystemSettings } from "@/services/system-settings/systemSettingsService";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

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
      <body className="font-inter">
        <SystemSettingsProvider initialSettings={settings}>{children}</SystemSettingsProvider>
        <GlobalLoadingIndicator />
      </body>
    </html>
  );
}
