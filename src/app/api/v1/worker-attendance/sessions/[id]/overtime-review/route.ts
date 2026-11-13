import { overtimeReviewSchema } from "@/features/worker-attendance/schemas/workerAttendanceSchemas";
import { reviewWorkerOvertime } from "@/features/worker-attendance/services/workerAttendanceRepository";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; return successResponse(await reviewWorkerOvertime(requireAuthenticatedUser(await getRequestUser()), id, await parseJsonBody(request, overtimeReviewSchema))); }
  catch (error) { return errorResponse(error); }
}
