import { PageHeader } from "@/components/shared/PageHeader";
import { routeMetaByPath } from "@/config/routeRegistry";
import { AttendanceCameraExperience } from "@/features/attendance";

const meta = routeMetaByPath["/attendance"];

export default function Page() {
  return (
    <div className="page-stack">
      <PageHeader title={meta.title} />
      <AttendanceCameraExperience />
    </div>
  );
}
