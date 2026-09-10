import { PageHeader } from "@/components/shared/PageHeader";
import { routeMetaByPath } from "@/config/routeRegistry";
import { AttendanceCameraFoundation } from "@/features/attendance";

const meta = routeMetaByPath["/attendance"];

export default function Page() {
  return (
    <div className="page-stack">
      <PageHeader description={meta.description} title={meta.title} />
      <AttendanceCameraFoundation />
    </div>
  );
}
