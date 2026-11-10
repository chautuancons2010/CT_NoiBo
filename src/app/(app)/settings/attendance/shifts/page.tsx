import { BackLink } from "@/components/shared/BackLink";
import { PageHeader } from "@/components/shared/PageHeader";
import { ShiftSettings } from "@/features/timesheets/components/ShiftSettings";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { AttendanceSettingsTabs } from "@/features/attendance/components/AttendanceSettingsTabs";

export default async function Page(){
  const user=await getRequestUser();
  const canEdit=Boolean(user&&(can(user.permissions,"shift.manage")||can(user.permissions,"shift.edit")));
  return <div className="page-stack"><BackLink href="/settings"/><PageHeader title="Cấu hình chấm công"/><AttendanceSettingsTabs active="shifts"/><ShiftSettings canEdit={canEdit} canAssign={Boolean(user && can(user.permissions, "shift.manage"))}/></div>;
}
