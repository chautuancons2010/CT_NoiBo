import { BackLink } from "@/components/shared/BackLink";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceSettingsTabs } from "@/features/attendance/components/AttendanceSettingsTabs";
import { CalendarSettings } from "@/features/timesheets/components/CalendarSettings";

export default function Page() {
  return <div className="page-stack"><BackLink href="/settings"/><PageHeader title="Cấu hình chấm công"/><AttendanceSettingsTabs active="calendar"/><CalendarSettings/></div>;
}
