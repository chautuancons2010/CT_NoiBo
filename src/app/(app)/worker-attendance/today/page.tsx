import { BackLink } from "@/components/shared/BackLink";
import { PageHeader } from "@/components/shared/PageHeader";
import { WorkerAttendanceToday } from "@/features/worker-attendance/components/WorkerAttendanceHome";
import { redirect } from "next/navigation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { can } from "@/lib/auth/permissions";

export default async function Page({ searchParams }: PageProps<"/worker-attendance/today">) {
  const user = await getRequestUser();
  if (user && !can(user.permissions, "worker_attendance.create") && can(user.permissions, "employee.view")) redirect("/employees/field-attendance");
  const query = await searchParams;
  const projectId = Array.isArray(query.projectId) ? query.projectId[0] : query.projectId;
  const worksiteId = Array.isArray(query.worksiteId) ? query.worksiteId[0] : query.worksiteId;
  return <div className="page-stack"><BackLink href={projectId ? `/projects/${projectId}/team${worksiteId ? `?worksite=${worksiteId}` : ""}` : "/worker-attendance"} /><PageHeader title="Điểm danh hôm nay" /><WorkerAttendanceToday key={`${projectId??"all"}:${worksiteId??"all"}:${query.mode??"regular"}`} initialOvertime={query.mode === "overtime"} projectId={projectId} worksiteId={worksiteId} /></div>;
}
