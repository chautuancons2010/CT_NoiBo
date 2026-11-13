import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, PermissionDeniedState } from "@/components/shared/States";
import { readModuleSettings } from "@/services/system-settings/systemSettingsService";
import { attendanceOnlyRelease, hasReleaseAvailabilityAccess } from "@/config/featureRelease";
import { PayslipConsole } from "@/features/accounting/components/PayslipConsole";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page({ searchParams }: PageProps<"/personal/payslips">) {
  const params = await searchParams;
  const user = await getRequestUser();
  if (!user || !can(user.permissions, "payslip.self.view")) return <PermissionDeniedState />;
  const admin = hasReleaseAvailabilityAccess(user.roleCodes);
  if (!admin && (attendanceOnlyRelease || !(await readModuleSettings()).accounting)) return <div className="page-stack"><PageHeader title="Phiếu lương của tôi"/><EmptyState title="Chưa có thông tin" description="Vui lòng quay lại sau."/></div>;
  return (
    <div className="page-stack">
      <PageHeader title="Phiếu lương của tôi" />
      <PayslipConsole key={`${params.month ?? "default"}:${params.receipt ?? "all"}`} canRevoke={false} personalRoute selfOnly initialMonth={typeof params.month === "string" ? params.month : undefined} initialReceipt={typeof params.receipt === "string" ? params.receipt : undefined} />
    </div>
  );
}
