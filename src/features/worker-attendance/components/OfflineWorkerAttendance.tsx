"use client";
import { useSearchParams } from "next/navigation";
import { WorkerAttendanceWizard } from "./WorkerAttendanceWizard";
import { EmptyState } from "@/components/shared/States";
export function OfflineWorkerAttendance() {
  const params = useSearchParams(), id = params.get("draft"), requestedStep = params.get("step");
  const step = requestedStep === "photos" || requestedStep === "review" ? requestedStep : "roster";
  return id && /^(local-)?[a-z0-9-]+$/i.test(id) ? <WorkerAttendanceWizard key={id} sessionId={id} step={step}/> : <EmptyState title="Chưa chọn bản nháp" description=""/>;
}
