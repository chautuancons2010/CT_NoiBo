import { Suspense } from "react";
import { OfflineWorkerAttendance } from "@/features/worker-attendance/components/OfflineWorkerAttendance";
import { requireWorkerCapturePage } from "@/features/worker-attendance/services/requireWorkerCapturePage";
import { LoadingState } from "@/components/shared/States";
export default async function OfflineWorkerPage() {
  await requireWorkerCapturePage("local-offline");
  return <Suspense fallback={<LoadingState title="Đang mở bản nháp"/>}><OfflineWorkerAttendance/></Suspense>;
}
