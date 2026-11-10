import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import { getEmployeePickerOptions } from "@/features/employees/services/employeeService";
import { WorkerAttendanceWizard } from "@/features/worker-attendance/components/WorkerAttendanceWizard";
import { getWorkerSession } from "@/features/worker-attendance/services/workerAttendanceRepository";
import { requireWorkerCapturePage } from "@/features/worker-attendance/services/requireWorkerCapturePage";

export default async function Page({ params }: PageProps<"/worker-attendance/sessions/[id]/roster">) {
  const { id } = await params;
  const user = await requireWorkerCapturePage(id);
  if (id.startsWith("local-")) return <WorkerAttendanceWizard sessionId={id} step="roster" />;
  const session = await getWorkerSession(user, id);
  if (session.selectionMode) return <WorkerAttendanceWizard sessionId={id} step="roster" />;
  const employeeOptions = getEmployeePickerOptions(await getEmployeeDataSetAsync(), { activeOnly: true });
  return <WorkerAttendanceWizard employeeOptions={employeeOptions} sessionId={id} step="roster" />;
}
