import { listAttendanceHistory } from "@/features/attendance/services/attendanceRepository";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

export async function GET(request: Request) {
  try {
    const user = requirePermission(await getRequestUser(), "attendance.self.view");
    const url = new URL(request.url);
    return successResponse(await listAttendanceHistory(user, url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined));
  } catch (error) {
    return errorResponse(error);
  }
}
