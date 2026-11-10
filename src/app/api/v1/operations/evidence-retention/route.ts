import { purgeExpiredAttendanceEvidence } from "@/features/operations/services/maintenanceService";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/api/errors";
export async function POST(request: Request) {
  const secret = getServerEnv().OPERATIONS_CRON_SECRET;
  if (!secret || secret.length < 32 || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false }, { status: 401 });
  try {
    const client = getSupabaseServiceClient();
    if (!client) throw new AppError("SERVER_ERROR");
    const result = await purgeExpiredAttendanceEvidence(client);
    return Response.json({ ok: true, data: result }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
