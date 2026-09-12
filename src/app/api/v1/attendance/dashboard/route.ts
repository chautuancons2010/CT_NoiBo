import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { getAttendanceDashboard } from "@/features/attendance/services/attendanceRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

export async function GET() {
  try {
    const user = requirePermission(await getRequestUser(), "attendance.self.view");
    return successResponse(await getAttendanceDashboard(user));
  } catch (error) {
    return errorResponse(error);
  }
}
