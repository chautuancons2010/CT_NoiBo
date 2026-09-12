import { BackLink } from "@/components/shared/BackLink";
import { PageHeader } from "@/components/shared/PageHeader";
import { WorkerAttendanceToday } from "@/features/worker-attendance";

export default function Page() {
  return <div className="page-stack"><BackLink href="/worker-attendance" /><PageHeader title="Điểm danh hôm nay" /><WorkerAttendanceToday /></div>;
}
