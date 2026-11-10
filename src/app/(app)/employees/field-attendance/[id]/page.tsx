import { WorkerAttendanceSessionDetail } from "@/features/worker-attendance/components/WorkerAttendanceSessionDetail";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ photo?: string }> }) {
  return <WorkerAttendanceSessionDetail initialPhotoId={(await searchParams).photo} reviewOnly sessionId={(await params).id} />;
}
