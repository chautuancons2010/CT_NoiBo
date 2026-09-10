import { PageHeader } from "@/components/shared/PageHeader";
import { routeMetaByPath } from "@/config/routeRegistry";
import { WorkerAttendanceFoundation } from "@/features/worker-attendance";

const meta = routeMetaByPath["/worker-attendance"];

export default function Page() {
  return (
    <div className="page-stack">
      <PageHeader description={meta.description} title={meta.title} />
      <WorkerAttendanceFoundation />
    </div>
  );
}
