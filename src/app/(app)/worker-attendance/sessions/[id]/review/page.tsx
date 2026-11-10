import { WorkerAttendanceWizard } from "@/features/worker-attendance/components/WorkerAttendanceWizard";
import { requireWorkerCapturePage } from "@/features/worker-attendance/services/requireWorkerCapturePage";

export default async function Page({ params }: PageProps<"/worker-attendance/sessions/[id]/review">) {
  const { id } = await params;
  await requireWorkerCapturePage(id);
  return <WorkerAttendanceWizard sessionId={id} step="review" />;
}
