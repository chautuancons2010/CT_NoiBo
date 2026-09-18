import { BackLink } from "@/components/shared/BackLink";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmployeeTimesheetMobile } from "@/features/timesheets/components/EmployeeTimesheetMobile";

export default async function Page({ params, searchParams }: {
  params: Promise<{ periodId: string; employeeId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ periodId, employeeId }, { date }] = await Promise.all([params, searchParams]);
  return <div className="page-stack">
    <BackLink href={`/timesheets/periods/${periodId}`} />
    <PageHeader title="Công nhân viên" />
    <EmployeeTimesheetMobile employeeId={employeeId} periodId={periodId} selectedDate={date} />
  </div>;
}
