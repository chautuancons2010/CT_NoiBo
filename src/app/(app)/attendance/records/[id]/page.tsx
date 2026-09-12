import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceRecordDetail } from "@/features/attendance";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="page-stack"><PageHeader title="Chi tiết lượt chấm công" /><AttendanceRecordDetail id={id} /></div>;
}
