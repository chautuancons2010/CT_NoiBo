import { DashboardPage } from "@/features/foundation/pages/DashboardPage";
import { attendanceOnlyRelease } from "@/config/featureRelease";
import { redirect } from "next/navigation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { hasReleaseAvailabilityAccess } from "@/config/featureRelease";

export default async function Page() {
  const user = await getRequestUser();
  if (attendanceOnlyRelease && !hasReleaseAvailabilityAccess(user?.roleCodes)) redirect("/personal");
  return <DashboardPage />;
}
