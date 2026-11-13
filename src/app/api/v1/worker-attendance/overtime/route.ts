import { workerOvertimeTimeEntrySchema } from "@/features/worker-attendance/schemas/workerAttendanceSchemas";
import { recordWorkerOvertimeTimeEntry } from "@/features/worker-attendance/services/workerAttendanceRepository";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

export async function POST(request: Request) {
  try {
    const user = requirePermission(await getRequestUser(), "worker_attendance.create");
    return successResponse(await recordWorkerOvertimeTimeEntry(user, await parseJsonBody(request, workerOvertimeTimeEntrySchema)));
  } catch (error) { return errorResponse(error); }
}
