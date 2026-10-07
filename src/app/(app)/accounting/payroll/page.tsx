import { PermissionDeniedState } from "@/components/shared/States";
import { PayrollConsole } from "@/features/accounting/components/PayrollConsole";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page() {
  const user = await getRequestUser();
  if (!user || (!can(user.permissions, "payroll.view") && !can(user.permissions, "payroll.create"))) {
    return <PermissionDeniedState />;
  }

  return <PayrollConsole canCreate={can(user.permissions, "payroll.create")} />;
}
