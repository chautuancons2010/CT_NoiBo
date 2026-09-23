import { BackLink } from "@/components/shared/BackLink";
import { PageHeader } from "@/components/shared/PageHeader";
import { WorkerAttendanceToday } from "@/features/worker-attendance";

export default async function Page({ searchParams }: PageProps<"/worker-attendance/today">) {
  const query = await searchParams;
  const projectId = Array.isArray(query.projectId) ? query.projectId[0] : query.projectId;
  return <div className="page-stack"><BackLink href={projectId ? `/projects/${projectId}/team` : "/worker-attendance"} /><PageHeader title="Điểm danh hôm nay" /><WorkerAttendanceToday projectId={projectId} /></div>;
}
