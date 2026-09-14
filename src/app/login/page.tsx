import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/FormControls";
import { LoginBrand } from "@/features/system-admin/components/LoginBrand";
import { readSystemSettings } from "@/services/system-settings/systemSettingsService";
import { redirect } from "next/navigation";
import { foundationDemoUser } from "@/lib/auth/currentUser";
import { resolveLandingPage } from "@/features/dashboard/registry";

export default async function LoginPage() {
  const settings = await readSystemSettings();
  async function enterDemo() { "use server"; const current = await readSystemSettings(); redirect(resolveLandingPage(foundationDemoUser, current.dashboard)); }
  return <main className="login-page"><section className="login-card"><LoginBrand logoUrl={settings.branding.logoMainUrl} shortName={settings.organization.shortName} /><div className="login-card__title"><h1>{settings.branding.systemName}</h1><p>{settings.branding.loginSubtitle}</p></div><form action={enterDemo}><Input autoComplete="username" label="Email" name="email" required type="email" /><Input autoComplete="current-password" label="Mật khẩu" name="password" required type="password" /><Button type="submit" variant="primary">Đăng nhập</Button></form><small>{settings.organization.companyName}</small></section></main>;
}
