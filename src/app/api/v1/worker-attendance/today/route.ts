import { z } from "zod";

import { listTodayTasks } from "@/features/worker-attendance/services/workerAttendanceRepository";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseWithSchema } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

export async function GET(request: Request) {
  try { const user = requirePermission(await getRequestUser(), "worker_attendance.view"); const date = parseWithSchema(z.string().date(), new URL(request.url).searchParams.get("date") ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })); return successResponse(await listTodayTasks(user, date)); }
  catch (error) { return errorResponse(error); }
}
