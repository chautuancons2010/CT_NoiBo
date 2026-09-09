import { z } from "zod";

import { AppError, errorResponse } from "@/lib/api/errors";
import { parseWithSchema } from "@/lib/api/validation";
import { logger } from "@/lib/logger";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";

const paramsSchema = z.object({
  assetId: z.string().uuid()
});

export async function GET(
  _request: Request,
  {
    params
  }: {
  params: Promise<{ assetId: string }>;
  }
) {
  try {
    const user = await getRequestUser();
    requirePermission(user, "file.read");

    const { assetId } = parseWithSchema(paramsSchema, await params);

    throw new AppError(
      "NOT_FOUND",
      `Chưa tìm thấy metadata file ${assetId}. Endpoint signed access đã sẵn sàng để nối Supabase Storage.`
    );
  } catch (error) {
    logger.error("api.file.signed_url_failed");
    return errorResponse(error);
  }
}
