import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceRecordDetail } from "@/features/attendance";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id },user] = await Promise.all([params,getRequestUser()]);
  return <div className="page-stack"><PageHeader title="Chi tiết lượt chấm công" /><AttendanceRecordDetail canAdjust={Boolean(user&&(can(user.permissions,"attendance.adjust")||can(user.permissions,"attendance.manage")))} canViewHistory={Boolean(user&&(can(user.permissions,"attendance.log.view")||can(user.permissions,"attendance.adjust")||can(user.permissions,"attendance.manage")))} id={id} /></div>;
}
