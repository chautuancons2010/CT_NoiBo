import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoginBrand } from "@/features/system-admin/components/LoginBrand";
import { resolveLandingPage } from "@/features/dashboard/registry";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { readSettingsGroup, readSystemSettings } from "@/services/system-settings/systemSettingsService";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { reason } = await searchParams;
  const [settings, dashboard, user] = await Promise.all([readSystemSettings(), readSettingsGroup("dashboard"), getRequestUser()]);
  if (user) redirect(resolveLandingPage(user, dashboard));
  return <main className="login-page"><section className="login-shell"><aside className="login-brand-panel"><LoginBrand logoUrl={settings.branding.logoMainUrl} shortName={settings.organization.shortName} /><div><span>CHÂU TUẤN</span><h1>Vận hành đồng bộ.<br />Kiến tạo bền vững.</h1></div><div aria-hidden="true" className="login-geometry"><i /><i /><i /></div></aside><section className="login-card"><div className="login-card__mobile-brand"><LoginBrand logoUrl={settings.branding.logoMainUrl} shortName={settings.organization.shortName} /></div><div className="login-card__title"><span>ĐĂNG NHẬP HỆ THỐNG</span><h2>{settings.branding.systemName}</h2><p>{settings.branding.loginSubtitle}</p></div>{reason === "session-expired" ? <p className="form-alert form-alert--warning" role="status">Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</p> : null}<LoginForm /><small>{settings.organization.companyName}</small></section></section></main>;
}
