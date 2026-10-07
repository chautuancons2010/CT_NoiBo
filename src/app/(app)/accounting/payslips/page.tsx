import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionDeniedState } from "@/components/shared/States";
import { PayslipConsole } from "@/features/accounting/components/PayslipConsole";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page({ searchParams }: PageProps<"/accounting/payslips">) {
  const params = await searchParams;
  const selfOnly = params.scope === "self";
  const user = await getRequestUser();
  if (!user || (selfOnly ? !can(user.permissions, "payslip.self.view") : !can(user.permissions, "payroll.view") && !can(user.permissions, "payslip.self.view"))) {
    return <PermissionDeniedState />;
  }
  return (
    <div className="page-stack">
      <PageHeader title="Phiếu lương" />
      <PayslipConsole canRevoke={!selfOnly && can(user.permissions, "payslip.revoke")} selfOnly={selfOnly} />
    </div>
  );
}
