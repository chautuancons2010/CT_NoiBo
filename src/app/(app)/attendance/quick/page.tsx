import { PermissionDeniedState } from "@/components/shared/States";
import { AttendanceCameraExperience } from "@/features/attendance/components/AttendanceCameraExperience";
import { canSubmitPersonalAttendance } from "@/lib/auth/applicationAccess";
import { getRequestUser } from "@/services/auth/getRequestUser";

export default async function QuickAttendancePage() {
  const user = await getRequestUser();
  if (!user || !canSubmitPersonalAttendance(user.permissions)) return <PermissionDeniedState />;
  return <div className="quick-attendance-page"><h1 className="sr-only">Chấm công</h1><AttendanceCameraExperience initialCapture returnHref="/personal" /></div>;
}
