import { attendanceRecordInputSchema } from "@/features/attendance/schemas/attendanceSchemas";
import { recordAttendance } from "@/features/attendance/services/attendanceRepository";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

export async function POST(request: Request) {
  try {
    const user = requirePermission(await getRequestUser(), "attendance.self.create");
    const input = await parseJsonBody(request, attendanceRecordInputSchema);
    return successResponse(await recordAttendance(user, input), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
