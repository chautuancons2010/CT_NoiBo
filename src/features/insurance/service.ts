import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { AppError } from "@/lib/api/errors";
import { can, type AuthenticatedUser } from "@/lib/auth/permissions";
import { safeUploadName, validateUploadedFile } from "@/lib/security/filePolicy";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/services/audit/auditLog";
import type { insuranceInputSchema } from "./schema";

type Row = Record<string, unknown>;
function db() { const client = getSupabaseServiceClient(); if (!client) throw new AppError("SERVER_ERROR", "Supabase chưa được cấu hình."); return client; }
function requirePermission(user: AuthenticatedUser, permission: "insurance.view" | "insurance.edit" | "insurance.history.view" | "insurance.document.upload") { if (!can(user.permissions, permission)) throw new AppError("PERMISSION_DENIED"); }
async function accountId(client: SupabaseClient, user: AuthenticatedUser) { let query = client.from("app_accounts").select("id").limit(1); query = /^[0-9a-f-]{36}$/i.test(user.id) ? query.eq("id", user.id) : query.eq("primary_email", user.email); const { data } = await query.maybeSingle(); if (!data?.id) throw new AppError("PERMISSION_DENIED"); return String(data.id); }
function nested(value: unknown): Row | undefined { return (Array.isArray(value) ? value[0] : value) as Row | undefined; }

export async function listInsurance(user: AuthenticatedUser) {
  requirePermission(user, "insurance.view");
  const client = db();
  const [{ data: profiles, error }, { data: employees }, historyResult] = await Promise.all([
    client.from("employee_insurance_profiles").select("*,employees(employee_code,full_name)").order("updated_at", { ascending: false }),
    client.from("employees").select("id,employee_code,full_name").in("employment_status", ["active", "probation", "pending_onboarding"]).order("employee_code"),
    can(user.permissions, "insurance.history.view") ? client.from("employee_insurance_events").select("*,app_accounts(display_name),file_assets(id,metadata)").order("effective_date", { ascending: false }).order("changed_at", { ascending: false }) : Promise.resolve({ data: [] })
  ]);
  if (error) throw new AppError("SERVER_ERROR", "Không thể đọc hồ sơ bảo hiểm.");
  const history = (historyResult.data ?? []).map((event) => { const actor = nested(event.app_accounts), file = nested(event.file_assets), metadata = (file?.metadata ?? {}) as Row; return { id: String(event.id), employeeId: String(event.employee_id), changeType: String(event.change_type), effectiveDate: String(event.effective_date), reason: String(event.reason), changedAt: String(event.changed_at), changedByName: String(actor?.display_name ?? "Tài khoản hệ thống"), fileId: file?.id ? String(file.id) : undefined, fileName: file?.id ? String(metadata.originalName ?? "Tài liệu bảo hiểm") : undefined }; });
  return {
    records: (profiles ?? []).map((profile) => { const person = nested(profile.employees); return { employeeId: String(profile.employee_id), employeeCode: String(person?.employee_code ?? "—"), employeeName: String(person?.full_name ?? "—"), socialInsuranceNumber: String(profile.social_insurance_number), participationStatus: String(profile.participation_status), startDate: profile.start_date ? String(profile.start_date) : undefined, contributionBase: profile.contribution_base == null ? undefined : Number(profile.contribution_base), socialInsuranceEnabled: Boolean(profile.social_insurance_enabled), healthInsuranceEnabled: Boolean(profile.health_insurance_enabled), unemploymentInsuranceEnabled: Boolean(profile.unemployment_insurance_enabled), updatedAt: String(profile.updated_at), history: history.filter((event) => event.employeeId === profile.employee_id) }; }),
    employees: (employees ?? []).map((employee) => ({ id: String(employee.id), code: String(employee.employee_code), name: String(employee.full_name) }))
  };
}

export async function saveInsurance(user: AuthenticatedUser, input: z.infer<typeof insuranceInputSchema>, file?: File) {
  requirePermission(user, "insurance.edit");
  if (file) requirePermission(user, "insurance.document.upload");
  const client = db(), actorId = await accountId(client, user), eventId = crypto.randomUUID();
  const { data: before } = await client.from("employee_insurance_profiles").select("*").eq("employee_id", input.employeeId).maybeSingle();
  let asset: { id: string; path: string } | undefined;
  if (file && file.size > 0) {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
    const bytes = await validateUploadedFile(file, { allowedMimeTypes: allowed, maxBytes: 10 * 1024 * 1024 });
    const id = crypto.randomUUID(), path = `${input.employeeId}/${eventId}/${id}-${safeUploadName(file.name, "insurance-document")}`;
    const { error: uploadError } = await client.storage.from("insurance-private").upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw new AppError("SERVER_ERROR", "Không thể tải tài liệu bảo hiểm.");
    const { error: assetError } = await client.from("file_assets").insert({ id, bucket: "insurance-private", object_path: path, owner_entity_type: "insurance_event", owner_entity_id: eventId, mime_type: file.type, byte_size: file.size, visibility: "private", created_by: actorId, metadata: { originalName: file.name } });
    if (assetError) { await client.storage.from("insurance-private").remove([path]); throw new AppError("SERVER_ERROR", "Không thể lưu tài liệu bảo hiểm."); }
    asset = { id, path };
  }
  const snapshot = { socialInsuranceNumber: input.socialInsuranceNumber, participationStatus: input.participationStatus, startDate: input.startDate, contributionBase: input.contributionBase, socialInsuranceEnabled: input.socialInsuranceEnabled, healthInsuranceEnabled: input.healthInsuranceEnabled, unemploymentInsuranceEnabled: input.unemploymentInsuranceEnabled };
  const { error: profileError } = await client.from("employee_insurance_profiles").upsert({ employee_id: input.employeeId, social_insurance_number: input.socialInsuranceNumber, participation_status: input.participationStatus, start_date: input.startDate ?? null, contribution_base: input.contributionBase ?? null, social_insurance_enabled: input.socialInsuranceEnabled, health_insurance_enabled: input.healthInsuranceEnabled, unemployment_insurance_enabled: input.unemploymentInsuranceEnabled, updated_by: actorId, updated_at: new Date().toISOString() }, { onConflict: "employee_id" });
  const { error: historyError } = profileError ? { error: profileError } : await client.from("employee_insurance_events").insert({ id: eventId, employee_id: input.employeeId, change_type: input.changeType, effective_date: input.effectiveDate, snapshot, reason: input.reason, document_file_id: asset?.id ?? null, changed_by: actorId });
  if (profileError || historyError) { if (asset) { await client.from("file_assets").delete().eq("id", asset.id); await client.storage.from("insurance-private").remove([asset.path]); } throw new AppError("SERVER_ERROR", "Không thể cập nhật hồ sơ bảo hiểm."); }
  await recordAuditLog({ actorId, action: "insurance.changed", entityType: "employee", entityId: input.employeeId, before: before ?? undefined, after: snapshot, reason: input.reason, metadata: { eventId, fileId: asset?.id } });
  return { eventId };
}
