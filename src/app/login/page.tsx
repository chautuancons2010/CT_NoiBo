import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoginBrand } from "@/features/system-admin/components/LoginBrand";
import { resolveLandingPage } from "@/features/dashboard/registry";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { readSettingsGroup, readSystemSettings } from "@/services/system-settings/systemSettingsService";

export default async function LoginPage() {
  const [settings, dashboard, user] = await Promise.all([readSystemSettings(), readSettingsGroup("dashboard"), getRequestUser()]);
  if (user) redirect(resolveLandingPage(user, dashboard));
  return <main className="login-page"><section className="login-card"><LoginBrand logoUrl={settings.branding.logoMainUrl} shortName={settings.organization.shortName} /><div className="login-card__title"><h1>{settings.branding.systemName}</h1><p>{settings.branding.loginSubtitle}</p></div><LoginForm /><small>{settings.organization.companyName}</small></section></main>;
}
