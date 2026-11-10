import { PageHeader } from "@/components/shared/PageHeader";
import { WorkerAttendanceSessionList } from "@/features/worker-attendance/components/WorkerAttendanceHome";
export default function Page() {
  return <div className="page-stack"><PageHeader title="Ảnh & công công trường" /><WorkerAttendanceSessionList detailBasePath="/employees/field-attendance" /></div>;
}
