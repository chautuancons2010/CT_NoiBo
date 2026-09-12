import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceSettings } from "@/features/attendance";

export default function Page() {
  return <div className="page-stack"><PageHeader title="Địa điểm chấm công" /><AttendanceSettings activeTab="locations" /></div>;
}
