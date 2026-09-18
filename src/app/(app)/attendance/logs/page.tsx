import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceRecords } from "@/features/attendance";

export default async function Page({ searchParams }: { searchParams: Promise<{ employeeId?: string }> }) {
  const { employeeId } = await searchParams;
  return <div className="page-stack"><PageHeader title="Nhật ký công" /><AttendanceRecords admin employeeId={employeeId} /></div>;
}
