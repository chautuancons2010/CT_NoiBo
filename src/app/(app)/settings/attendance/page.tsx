import { routeMetaByPath } from "@/config/routeRegistry";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceSettings } from "@/features/attendance/components/AttendanceSettings";
import { BackLink } from "@/components/shared/BackLink";
import { redirect } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

const meta = routeMetaByPath["/settings/attendance"];

export default async function Page() {
  const user = await getRequestUser();
  if (user && !can(user.permissions, "attendance.config.view") && !can(user.permissions, "attendance.config.manage") && (["shift.view", "shift.manage", "shift.edit"] as const).some(permission => can(user.permissions, permission))) redirect("/settings/attendance/shifts");
  return <div className="page-stack"><BackLink href="/settings" /><PageHeader title={meta.title} /><AttendanceSettings /></div>;
}
