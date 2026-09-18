import { PageHeader } from "@/components/shared/PageHeader";
import { TimesheetPeriodList } from "@/features/timesheets/components/TimesheetPeriodList";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export default async function Page() {
  const user = requireAuthenticatedUser(await getRequestUser());
  const canCreate = can(user.permissions, "timesheet.adjust") || can(user.permissions, "timesheet.lock") || can(user.permissions, "attendance.period.manage");
  return <div className="page-stack"><PageHeader title="Kỳ công" /><TimesheetPeriodList canCreate={canCreate} /></div>;
}
