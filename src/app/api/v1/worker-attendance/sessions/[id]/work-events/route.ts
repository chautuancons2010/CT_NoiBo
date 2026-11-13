import { workerWorkOperationSchema } from "@/features/worker-attendance/schemas/workerAttendanceSchemas";
import { recordWorkerWorkOperation } from "@/features/worker-attendance/services/workerAttendanceRepository";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; return successResponse(await recordWorkerWorkOperation(requireAuthenticatedUser(await getRequestUser()), id, await parseJsonBody(request, workerWorkOperationSchema))); }
  catch (error) { return errorResponse(error); }
}
