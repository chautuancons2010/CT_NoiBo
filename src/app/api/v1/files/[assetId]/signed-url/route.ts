import { NextResponse } from "next/server";
import { z } from "zod";

import { AppError, errorResponse } from "@/lib/api/errors";
import { parseWithSchema } from "@/lib/api/validation";
import { can } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requirePermission } from "@/services/authorization/requirePermission";
import { recordAuditLog } from "@/services/audit/auditLog";

const paramsSchema = z.object({ assetId: z.string().uuid() });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const user = requirePermission(await getRequestUser(), "file.read");
    const { assetId } = parseWithSchema(paramsSchema, await params);
    const client = getSupabaseServiceClient();
    if (!client) {
      throw new AppError("NOT_FOUND", "Kho file private chưa được cấu hình.");
    }

    const { data: asset, error: assetError } = await client
      .from("file_assets")
      .select("id,bucket,object_path,owner_entity_type,owner_entity_id,visibility")
      .eq("id", assetId)
      .maybeSingle();
    if (assetError || !asset) {
      throw new AppError("NOT_FOUND", "Không tìm thấy file.");
    }

    const { data: document } = await client
      .from("employee_documents")
      .select("employee_id,sensitive")
      .eq("file_id", assetId)
      .is("deleted_at", null)
      .maybeSingle();
    const { data: sensitiveProfile } = await client
      .from("employee_sensitive_profiles")
      .select("employee_id")
      .or(`national_id_front_file_id.eq.${assetId},national_id_back_file_id.eq.${assetId}`)
      .maybeSingle();
    const { data: contract } = await client
      .from("employee_contracts")
      .select("employee_id")
      .eq("attachment_file_id", assetId)
      .maybeSingle();

    if ((document || sensitiveProfile || contract) && !can(user.permissions, "employee.view")) {
      throw new AppError("PERMISSION_DENIED");
    }
    const sensitiveAccess = Boolean(document?.sensitive || sensitiveProfile);
    if (sensitiveAccess && !can(user.permissions, "employee.view_sensitive")) {
      throw new AppError("PERMISSION_DENIED");
    }

    if (asset.owner_entity_type === "project_update") {
      const { data: update } = await client.from("project_updates").select("project_id").eq("id", asset.owner_entity_id).maybeSingle();
      if (!update) throw new AppError("NOT_FOUND", "Không tìm thấy cập nhật chứa tệp.");
      if (!can(user.permissions, "project_update.view_all") && !can(user.permissions, "project_monitoring.view_all")) {
        let accountQuery = client.from("app_accounts").select("employee_id").limit(1);
        accountQuery = /^[0-9a-f-]{36}$/i.test(user.id) ? accountQuery.eq("id", user.id) : accountQuery.eq("primary_email", user.email);
        const { data: account } = await accountQuery.maybeSingle();
        const { data: assignment } = account?.employee_id ? await client.from("project_assignments").select("id").eq("project_id", update.project_id).eq("employee_id", account.employee_id).eq("status", "active").limit(1).maybeSingle() : { data: null };
        if (!assignment) throw new AppError("PERMISSION_DENIED", "Bạn không thuộc phạm vi dự án này.");
      }
    }

    const { data: signed, error: signedError } = await client.storage
      .from(asset.bucket)
      .createSignedUrl(asset.object_path, 300);
    if (signedError || !signed?.signedUrl) {
      throw new AppError("SERVER_ERROR", "Không thể tạo quyền truy cập file.");
    }

    if (sensitiveAccess) {
      await recordAuditLog({
        actorId: user.id,
        action: "employee.sensitive_file_viewed",
        entityType: "file_asset",
        entityId: assetId,
        metadata: { ownerEntityType: asset.owner_entity_type, ownerEntityId: asset.owner_entity_id }
      });
    }

    return NextResponse.redirect(signed.signedUrl, 307);
  } catch (error) {
    logger.error("api.file.signed_url_failed");
    return errorResponse(error);
  }
}
