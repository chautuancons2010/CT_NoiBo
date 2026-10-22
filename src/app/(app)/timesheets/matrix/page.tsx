import { PageHeader } from "@/components/shared/PageHeader";
import { TimesheetMatrix } from "@/features/timesheets/components/TimesheetMatrix";

export default function Page() {
  return <div className="page-stack"><PageHeader title="Bảng công" /><TimesheetMatrix /></div>;
}
