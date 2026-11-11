import { DashboardPage } from "@/features/foundation/pages/DashboardPage";
import { attendanceOnlyRelease } from "@/config/featureRelease";
import { redirect } from "next/navigation";

export default function Page() {
  if (attendanceOnlyRelease) redirect("/personal");
  return <DashboardPage />;
}
