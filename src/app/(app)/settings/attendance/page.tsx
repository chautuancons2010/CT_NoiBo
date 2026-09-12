import { routeMetaByPath } from "@/config/routeRegistry";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceSettings } from "@/features/attendance";

const meta = routeMetaByPath["/settings/attendance"];

export default function Page() {
  return <div className="page-stack"><PageHeader title={meta.title} /><AttendanceSettings /></div>;
}
