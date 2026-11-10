import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceAdminDashboard } from "@/features/attendance/components/AttendanceAdminDashboard";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { can } from "@/lib/auth/permissions";

export default async function Page() {
  const user = await getRequestUser();
  return <div className="page-stack"><PageHeader title="Kiểm tra công" /><AttendanceAdminDashboard canViewWorkers={Boolean(user && can(user.permissions, "worker_attendance.view"))} ownerAccountId={user?.id} /></div>;
}
