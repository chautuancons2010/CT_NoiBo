import { WorkerAttendanceSessionDetail } from "@/features/worker-attendance/components/WorkerAttendanceSessionDetail";
import { redirect } from "next/navigation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { can } from "@/lib/auth/permissions";

export default async function Page({ params, searchParams }: PageProps<"/worker-attendance/sessions/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const photo = typeof query.photo === "string" ? query.photo : undefined;
  const user = await getRequestUser();
  if (user && !can(user.permissions, "worker_attendance.create") && can(user.permissions, "employee.view")) redirect(`/employees/field-attendance/${id}${photo ? `?photo=${encodeURIComponent(photo)}` : ""}`);
  return <WorkerAttendanceSessionDetail initialPhotoId={photo} sessionId={id} />;
}
