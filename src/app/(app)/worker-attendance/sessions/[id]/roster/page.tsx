import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import { getEmployeePickerOptions } from "@/features/employees/services/employeeService";
import { WorkerAttendanceWizard } from "@/features/worker-attendance";

export default async function Page({ params }: PageProps<"/worker-attendance/sessions/[id]/roster">) {
  const { id } = await params;
  const employeeOptions = getEmployeePickerOptions(await getEmployeeDataSetAsync(), { activeOnly: true });
  return <WorkerAttendanceWizard employeeOptions={employeeOptions} sessionId={id} step="roster" />;
}
