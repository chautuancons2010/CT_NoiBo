import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import { BackLink } from "@/components/shared/BackLink";
import { routeMetaByPath } from "@/config/routeRegistry";
import { WorkerAttendanceSessionList } from "@/features/worker-attendance/components/WorkerAttendanceHome";
import { redirect } from "next/navigation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { can } from "@/lib/auth/permissions";

const meta = routeMetaByPath["/worker-attendance"];

export default async function Page() {
  const user = await getRequestUser();
  if (user && !can(user.permissions, "worker_attendance.create") && can(user.permissions, "employee.view")) redirect("/employees/field-attendance");
  return (
    <div className="page-stack">
      <BackLink href="/projects" label="Dự án" />
      <PageHeader title={meta.title} />
      {user && can(user.permissions, "worker_attendance.create") ? <div className="action-row"><Link className="button button--primary button--md" href="/worker-attendance/today">Điểm danh hôm nay</Link></div> : null}
      <WorkerAttendanceSessionList />
    </div>
  );
}
