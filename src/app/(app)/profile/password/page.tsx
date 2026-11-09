import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";

export default function Page() {
  return <div className="page-stack account-security-page">
    <PageHeader title="Đổi mật khẩu" />
    <Card><ChangePasswordForm initiallyOpen /></Card>
  </div>;
}
