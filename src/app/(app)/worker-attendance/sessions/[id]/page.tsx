import { WorkerAttendanceSessionDetail } from "@/features/worker-attendance";

export default async function Page({ params }: PageProps<"/worker-attendance/sessions/[id]">) {
  const { id } = await params;
  return <WorkerAttendanceSessionDetail sessionId={id} />;
}
