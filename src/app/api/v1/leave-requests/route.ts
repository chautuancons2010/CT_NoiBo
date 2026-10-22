import { leaveRequestInputSchema } from "@/features/leave/schemas/leaveSchemas";
import { createLeaveRequest, listLeaveRequests } from "@/features/leave/services/leaveRepository";
import { errorResponse } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { parseJsonBody } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function GET(request: Request) {
  try {
    const user = requireAuthenticatedUser(await getRequestUser());
    const value = new URL(request.url).searchParams.get("scope");
    const scope = value === "all" || value === "approval" ? value : "self";
    return successResponse(await listLeaveRequests(user, scope));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = requireAuthenticatedUser(await getRequestUser());
    return successResponse(await createLeaveRequest(user, await parseJsonBody(request, leaveRequestInputSchema)), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
