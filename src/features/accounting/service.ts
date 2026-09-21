import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { AppError } from "@/lib/api/errors";
import { can, type AuthenticatedUser, type Permission } from "@/lib/auth/permissions";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { publishNotificationEvent } from "@/features/shared-platforms/services/notificationRepository";
import { recordAuditLog } from "@/services/audit/auditLog";
import { readSettingsGroup } from "@/services/system-settings/systemSettingsService";
import type { payrollActionSchema, payrollCreateSchema, payslipRevokeSchema, salaryInputSchema } from "./schemas";
import type { PayrollDetail, PayrollLine, PayrollPeriod, Payslip, SalaryRecord } from "./types";
import { generatePayslipPdf } from "./payslipPdf";

type Row = Record<string, unknown>;
function db(): SupabaseClient { const client = getSupabaseServiceClient(); if (!client) throw new AppError("SERVER_ERROR", "Supabase chưa được cấu hình."); return client; }
function requireAny(user: AuthenticatedUser, permissions: Permission[]) { if (!permissions.some((permission) => can(user.permissions, permission))) throw new AppError("PERMISSION_DENIED"); }
async function identity(client: SupabaseClient, user: AuthenticatedUser) { let query = client.from("app_accounts").select("id,employee_id").limit(1); query = /^[0-9a-f-]{36}$/i.test(user.id) ? query.eq("id", user.id) : query.eq("primary_email", user.email); const { data, error } = await query.maybeSingle(); if (error) throw new AppError("SERVER_ERROR", "Không thể xác định tài khoản vận hành."); if (!data?.id) throw new AppError("PERMISSION_DENIED", "Không tìm thấy tài khoản vận hành."); return { accountId: String(data.id), employeeId: data.employee_id ? String(data.employee_id) : undefined }; }
function employee(row: Row) { const value = row.employees; return (Array.isArray(value) ? value[0] : value) as Row | undefined; }
function salary(row: Row): SalaryRecord { const person = employee(row), actorValue = row.changed_by_account, actor = (Array.isArray(actorValue) ? actorValue[0] : actorValue) as Row | undefined; return { id: String(row.id), employeeId: String(row.employee_id), employeeCode: String(person?.employee_code ?? "—"), employeeName: String(person?.full_name ?? "—"), baseSalary: Number(row.base_salary), allowance: Number(row.allowance), bonus: Number(row.bonus), deduction: Number(row.deduction), effectiveDate: String(row.effective_date), note: row.note ? String(row.note) : undefined, reason: String(row.reason), changedAt: String(row.changed_at), changedByName: actor?.display_name ? String(actor.display_name) : undefined }; }
function line(row: Row): PayrollLine { const person = employee(row); return { id: String(row.id), employeeId: String(row.employee_id), employeeCode: String(person?.employee_code ?? "—"), employeeName: String(person?.full_name ?? "—"), workDays: Number(row.work_days), baseSalary: Number(row.base_salary), allowance: Number(row.allowance), bonus: Number(row.bonus), deduction: Number(row.deduction), netSalary: Number(row.net_salary), rowVersion: Number(row.row_version) }; }

export async function listSalaries(user: AuthenticatedUser) { requireAny(user, ["salary.view", "salary.history.view"]); const { data, error } = await db().from("employee_salary_history").select("*,employees(employee_code,full_name),changed_by_account:app_accounts!employee_salary_history_changed_by_fkey(display_name)").order("effective_date", { ascending: false }).order("changed_at", { ascending: false }); if (error) throw new AppError("SERVER_ERROR", "Không thể đọc dữ liệu lương."); const records=(data ?? []).map((row) => salary(row as Row)); if(can(user.permissions,"salary.history.view"))return records;const seen=new Set<string>();return records.filter((item)=>{if(seen.has(item.employeeId))return false;seen.add(item.employeeId);return true;}); }
export async function listEmployeeSalaries(user: AuthenticatedUser, employeeId: string) { requireAny(user, ["salary.view", "salary.history.view"]); let query = db().from("employee_salary_history").select("*,employees(employee_code,full_name),changed_by_account:app_accounts!employee_salary_history_changed_by_fkey(display_name)").eq("employee_id", employeeId).order("effective_date", { ascending: false }).order("changed_at", { ascending: false }); if (!can(user.permissions, "salary.history.view")) query = query.limit(1); const { data, error } = await query; if (error) throw new AppError("SERVER_ERROR", "Không thể đọc lịch sử lương nhân viên."); return (data ?? []).map((row) => salary(row as Row)); }
export async function listSalaryEmployees(user: AuthenticatedUser) { requireAny(user, ["salary.view", "salary.edit"]); const { data, error } = await db().from("employees").select("id,employee_code,full_name").in("employment_status", ["active", "probation", "pending_onboarding"]).order("employee_code"); if (error) throw new AppError("SERVER_ERROR", "Không thể đọc danh sách nhân viên."); return (data ?? []).map((row) => ({ id: String(row.id), code: String(row.employee_code), name: String(row.full_name) })); }
export async function saveSalary(user: AuthenticatedUser, input: z.infer<typeof salaryInputSchema>) { if (!can(user.permissions, "salary.edit")) throw new AppError("PERMISSION_DENIED"); const client = db(), actor = await identity(client, user); const { data: before } = await client.from("employee_salary_history").select("*").eq("employee_id", input.employeeId).order("effective_date", { ascending: false }).limit(1).maybeSingle(); const { data, error } = await client.from("employee_salary_history").insert({ employee_id: input.employeeId, base_salary: input.baseSalary, allowance: input.allowance, bonus: input.bonus, deduction: input.deduction, effective_date: input.effectiveDate, note: input.note ?? null, reason: input.reason, changed_by: actor.accountId }).select("*,employees(employee_code,full_name)").single(); if (error || !data) throw new AppError("SERVER_ERROR", "Không thể ghi nhận mức lương."); await recordAuditLog({ actorId: actor.accountId, action: "salary.changed", entityType: "employee", entityId: input.employeeId, before: before ?? undefined, after: input, reason: input.reason }); return salary(data as Row); }

async function periodRows(client: SupabaseClient): Promise<PayrollPeriod[]> { const [{ data: periods, error: periodError }, { data: lines, error: lineError }] = await Promise.all([client.from("payroll_periods").select("*").order("period_month", { ascending: false }), client.from("payroll_lines").select("payroll_period_id,base_salary,allowance,bonus,deduction,net_salary")]); if (periodError || lineError) throw new AppError("SERVER_ERROR", "Không thể đọc kỳ lương."); return (periods ?? []).map((row) => { const related = (lines ?? []).filter((item) => item.payroll_period_id === row.id); return { id: String(row.id), periodMonth: String(row.period_month), timesheetPeriodId: row.timesheet_period_id ? String(row.timesheet_period_id) : undefined, status: row.status, rowVersion: Number(row.row_version), lineCount: related.length, grossTotal: related.reduce((sum, item) => sum + Number(item.base_salary) + Number(item.allowance) + Number(item.bonus), 0), deductionTotal: related.reduce((sum, item) => sum + Number(item.deduction), 0), netTotal: related.reduce((sum, item) => sum + Number(item.net_salary), 0), note: row.note ?? undefined, updatedAt: String(row.updated_at) }; }); }
export async function listPayroll(user: AuthenticatedUser) { requireAny(user, ["payroll.view", "payroll.create"]); return periodRows(db()); }
export async function listPayrollReferences(user: AuthenticatedUser) { requireAny(user, ["payroll.view", "payroll.create"]); const { data, error } = await db().from("timesheet_periods").select("id,code,name,start_date,end_date,status").eq("status", "locked").order("start_date", { ascending: false }).limit(36); if (error) throw new AppError("SERVER_ERROR", "Không thể đọc kỳ công đã khóa."); return (data ?? []).map((row) => ({ id: String(row.id), code: String(row.code), name: String(row.name), startDate: String(row.start_date), endDate: String(row.end_date) })); }
export async function createPayroll(user: AuthenticatedUser, input: z.infer<typeof payrollCreateSchema>) { if (!can(user.permissions, "payroll.create")) throw new AppError("PERMISSION_DENIED"); const client = db(), actor = await identity(client, user), month = `${input.periodMonth}-01`; const { data: timesheet, error: timesheetError } = await client.from("timesheet_periods").select("id,status").eq("id", input.timesheetPeriodId).maybeSingle(); if (timesheetError) throw new AppError("SERVER_ERROR", "Không thể đọc kỳ công."); if (!timesheet || timesheet.status !== "locked") throw new AppError("VALIDATION_ERROR", "Kỳ công phải được khóa trước khi tạo bảng lương."); const { data, error } = await client.from("payroll_periods").insert({ period_month: month, timesheet_period_id: input.timesheetPeriodId, note: input.note ?? null, created_by: actor.accountId }).select("id").single(); if (error || !data) throw new AppError(error?.code === "23505" ? "DUPLICATE" : "SERVER_ERROR", error?.code === "23505" ? "Kỳ lương đã tồn tại." : "Không thể tạo kỳ lương."); await recordAuditLog({ actorId: actor.accountId, action: "payroll.created", entityType: "payroll_period", entityId: String(data.id), after: input }); return getPayroll(user, String(data.id)); }
export async function getPayroll(user: AuthenticatedUser, id: string): Promise<PayrollDetail> { requireAny(user, ["payroll.view", "payroll.create"]); const client = db(); const periods = await periodRows(client), period = periods.find((item) => item.id === id); if (!period) throw new AppError("NOT_FOUND", "Không tìm thấy kỳ lương."); const { data, error } = await client.from("payroll_lines").select("*,employees(employee_code,full_name)").eq("payroll_period_id", id).order("employee_id"); if (error) throw new AppError("SERVER_ERROR", "Không thể đọc bảng lương."); return { ...period, lines: (data ?? []).map((row) => line(row as Row)) }; }

async function calculate(client: SupabaseClient, period: PayrollDetail, actorId: string) { if (["locked", "published"].includes(period.status)) throw new AppError("CONFLICT", "Kỳ lương đã khóa."); const end = new Date(`${period.periodMonth}T00:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0); const endDate = end.toISOString().slice(0, 10); const [{ data: employees, error: employeeError }, { data: salaries, error: salaryError }, { data: summaries, error: summaryError }] = await Promise.all([client.from("employees").select("id").in("employment_status", ["active", "probation", "pending_onboarding"]), client.from("employee_salary_history").select("*").lte("effective_date", endDate).order("effective_date", { ascending: false }), period.timesheetPeriodId ? client.from("timesheet_period_summaries").select("employee_id,scheduled_workdays,actual_workdays").eq("period_id", period.timesheetPeriodId) : Promise.resolve({ data: [], error: null })]); if (employeeError || salaryError || summaryError) throw new AppError("SERVER_ERROR", "Không thể đọc dữ liệu để tính bảng lương."); const salaryByEmployee = new Map<string, Row>(); for (const item of salaries ?? []) if (!salaryByEmployee.has(String(item.employee_id))) salaryByEmployee.set(String(item.employee_id), item as Row); const summaryByEmployee = new Map((summaries ?? []).map((item) => [String(item.employee_id), item])); const rows = (employees ?? []).flatMap((person) => { const current = salaryByEmployee.get(String(person.id)); if (!current) return []; const summary = summaryByEmployee.get(String(person.id)); const scheduled = Number(summary?.scheduled_workdays ?? 0), actual = Number(summary?.actual_workdays ?? 0), ratio = scheduled > 0 ? Math.min(1, actual / scheduled) : 1; return [{ payroll_period_id: period.id, employee_id: person.id, work_days: actual, base_salary: Math.round(Number(current.base_salary) * ratio), allowance: Number(current.allowance), bonus: Number(current.bonus), deduction: Number(current.deduction), calculation_snapshot: { salaryHistoryId: current.id, effectiveDate: current.effective_date, scheduledWorkdays: scheduled, actualWorkdays: actual, ratio }, updated_at: new Date().toISOString() }]; }); if (!rows.length) throw new AppError("VALIDATION_ERROR", "Chưa có hồ sơ lương hiệu lực để tính bảng lương."); const { error } = await client.from("payroll_lines").upsert(rows, { onConflict: "payroll_period_id,employee_id" }); if (error) throw new AppError("SERVER_ERROR", "Không thể tính bảng lương."); const { data: changed, error: updateError } = await client.from("payroll_periods").update({ status: "calculated", calculated_at: new Date().toISOString(), calculated_by: actorId, row_version: period.rowVersion + 1, updated_at: new Date().toISOString() }).eq("id", period.id).eq("row_version", period.rowVersion).select("id").maybeSingle(); if (updateError || !changed) throw new AppError("CONFLICT", "Kỳ lương vừa được cập nhật."); }

async function sendPublishedPayslipChats(client:SupabaseClient,actorId:string,period:PayrollDetail,version:number,accounts:Array<{id:string;employee_id:string|null}>){
  const{data:slips}=await client.from("payslips").select("id,employee_id,payroll_lines!inner(payroll_period_id)").eq("version",version).eq("status","published").eq("payroll_lines.payroll_period_id",period.id);
  const slipByEmployee=new Map((slips??[]).map(item=>[String(item.employee_id),String(item.id)]));
  const[year,month]=period.periodMonth.slice(0,7).split("-"),periodLabel=`${month}/${year}`;
  for(const recipient of accounts){
    const payslipId=recipient.employee_id?slipByEmployee.get(String(recipient.employee_id)):undefined;
    if(!payslipId||recipient.id===actorId)continue;
    const directKey=[actorId,recipient.id].sort().join(":"),{data:existing}=await client.from("conversations").select("id").eq("direct_key",directKey).maybeSingle();
    let conversationId=existing?.id?String(existing.id):undefined;
    if(!conversationId){
      const{data:created}=await client.from("conversations").insert({type:"direct",direct_key:directKey,created_by:actorId}).select("id").maybeSingle();
      conversationId=created?.id?String(created.id):undefined;
      if(conversationId){const{error:memberError}=await client.from("conversation_members").insert([{conversation_id:conversationId,account_id:actorId,role:"owner"},{conversation_id:conversationId,account_id:recipient.id,role:"member"}]);if(memberError){await client.from("conversations").delete().eq("id",conversationId);conversationId=undefined;}}
    }
    if(!conversationId)continue;
    const createdAt=new Date().toISOString();
    const{error:messageError}=await client.from("messages").insert({conversation_id:conversationId,sender_account_id:actorId,body:`Phiếu lương tháng ${periodLabel} của bạn đã được phát hành.`,metadata:{payslipId,payslipPeriod:periodLabel}});
    if(!messageError)await client.from("conversations").update({updated_at:createdAt}).eq("id",conversationId);
  }
}

export async function actOnPayroll(user: AuthenticatedUser, id: string, input: z.infer<typeof payrollActionSchema>) {
  const client = db(), actor = await identity(client, user), period = await getPayroll(user, id);
  if (period.rowVersion !== input.rowVersion) throw new AppError("CONFLICT", "Kỳ lương vừa được cập nhật.");
  let publishedVersion: number | undefined;
  if (input.action === "calculate") {
    if (!can(user.permissions, "payroll.create")) throw new AppError("PERMISSION_DENIED");
    await calculate(client, period, actor.accountId);
  } else if (input.action === "update_line") {
    if (!can(user.permissions, "payroll.edit")) throw new AppError("PERMISSION_DENIED");
    if (["locked", "published"].includes(period.status)) throw new AppError("CONFLICT", "Kỳ lương đã khóa.");
    const before = period.lines.find((item) => item.id === input.lineId);
    const { data, error } = await client.from("payroll_lines").update({ allowance: input.allowance, bonus: input.bonus, deduction: input.deduction, row_version: input.lineRowVersion + 1, updated_at: new Date().toISOString() }).eq("id", input.lineId).eq("payroll_period_id", id).eq("row_version", input.lineRowVersion).select("id").maybeSingle();
    if (error || !data) throw new AppError("CONFLICT", "Dòng lương vừa được cập nhật.");
    await recordAuditLog({ actorId: actor.accountId, action: "payroll.line_updated", entityType: "payroll_line", entityId: input.lineId, before: before ? { ...before } : undefined, after: input, reason: input.reason });
  } else if (input.action === "review") {
    if (!can(user.permissions, "payroll.edit")) throw new AppError("PERMISSION_DENIED");
    if (period.status !== "calculated") throw new AppError("CONFLICT", "Chỉ bảng lương đã tính mới được kiểm tra.");
    const { data, error } = await client.from("payroll_periods").update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: actor.accountId, row_version: period.rowVersion + 1 }).eq("id", id).eq("row_version", period.rowVersion).select("id").maybeSingle();
    if (error || !data) throw new AppError("CONFLICT", "Kỳ lương vừa được cập nhật.");
  } else if (input.action === "lock") {
    if (!can(user.permissions, "payroll.lock")) throw new AppError("PERMISSION_DENIED");
    if (period.status !== "reviewed") throw new AppError("CONFLICT", "Bảng lương cần được kiểm tra trước khi khóa.");
    const { data, error } = await client.from("payroll_periods").update({ status: "locked", locked_at: new Date().toISOString(), locked_by: actor.accountId, row_version: period.rowVersion + 1 }).eq("id", id).eq("row_version", period.rowVersion).select("id").maybeSingle();
    if (error || !data) throw new AppError("CONFLICT", "Kỳ lương vừa được cập nhật.");
  } else if (input.action === "reopen") {
    if (!can(user.permissions, "payroll.edit")) throw new AppError("PERMISSION_DENIED");
    if (!["locked", "published"].includes(period.status)) throw new AppError("CONFLICT", "Chỉ bảng lương đã khóa hoặc phát hành mới được mở lại.");
    const { error } = await client.rpc("reopen_payroll_period", { p_period_id: id, p_row_version: period.rowVersion, p_actor_id: actor.accountId, p_reason: input.reason });
    if (error) throw new AppError(error.message.includes("VERSION_CONFLICT") ? "CONFLICT" : "SERVER_ERROR", error.message.includes("VERSION_CONFLICT") ? "Kỳ lương vừa được cập nhật." : "Không thể mở lại kỳ lương.");
  } else {
    if (!can(user.permissions, "payslip.publish")) throw new AppError("PERMISSION_DENIED");
    if (period.status !== "locked") throw new AppError("CONFLICT", "Chỉ bảng lương đã khóa mới được phát hành.");
    if (!period.lines.length) throw new AppError("VALIDATION_ERROR", "Bảng lương chưa có dòng dữ liệu để phát hành.");
    const { data: version, error } = await client.rpc("publish_payroll_period", { p_period_id: id, p_row_version: period.rowVersion, p_actor_id: actor.accountId });
    if (error) throw new AppError(error.message.includes("VERSION_CONFLICT") ? "CONFLICT" : "SERVER_ERROR", error.message.includes("VERSION_CONFLICT") ? "Kỳ lương vừa được cập nhật." : "Không thể phát hành phiếu lương.");
    publishedVersion = Number(version);
    const { data: accounts, error: accountError } = await client.from("app_accounts").select("id,employee_id").in("employee_id", period.lines.map((item) => item.employeeId)).eq("status", "active");
    if (accountError) throw new AppError("SERVER_ERROR", "Không thể xác định người nhận phiếu lương.");
    await publishNotificationEvent({ eventKey: "payslip.published", aggregateType: "payroll_period", aggregateId: id, actorAccountId: actor.accountId, idempotencyKey: `payroll:${id}:payslips:v${publishedVersion}`, recipients: (accounts ?? []).map((item) => String(item.id)), values: { period_month: period.periodMonth.slice(0, 7) }, deepLink: "/accounting/payslips", priority: "important" }, client);
    await sendPublishedPayslipChats(client,actor.accountId,period,publishedVersion,(accounts??[]).map(item=>({id:String(item.id),employee_id:item.employee_id?String(item.employee_id):null})));
  }
  await recordAuditLog({ actorId: actor.accountId, action: `payroll.${input.action}`, entityType: "payroll_period", entityId: id, before: { status: period.status, rowVersion: period.rowVersion }, after: publishedVersion ? { payslipVersion: publishedVersion } : undefined, reason: "reason" in input ? input.reason : undefined });
  const result = await getPayroll(user, id), expected = input.action === "review" ? "reviewed" : input.action === "lock" ? "locked" : input.action === "publish" ? "published" : input.action === "calculate" || input.action === "reopen" ? "calculated" : undefined;
  if (expected && result.status !== expected) throw new AppError("CONFLICT", "Kỳ lương vừa được cập nhật.");
  return result;
}

function mapPayslip(row: Row): Payslip {
  const person = employee(row), lineValue = row.payroll_lines, payrollLine = (Array.isArray(lineValue) ? lineValue[0] : lineValue) as Row | undefined, periodValue = payrollLine?.payroll_periods, period = (Array.isArray(periodValue) ? periodValue[0] : periodValue) as Row | undefined;
  return { id: String(row.id), payrollLineId: String(row.payroll_line_id), employeeId: String(row.employee_id), employeeCode: String(person?.employee_code ?? "—"), employeeName: String(person?.full_name ?? "—"), periodMonth: String(period?.period_month ?? (row.snapshot as Row)?.periodMonth ?? ""), version: Number(row.version), status: row.status as Payslip["status"], snapshot: row.snapshot as Row, publishedAt: row.published_at ? String(row.published_at) : undefined, viewedAt: row.viewed_at ? String(row.viewed_at) : undefined, revokedAt: row.revoked_at ? String(row.revoked_at) : undefined, revokeReason: row.revoke_reason ? String(row.revoke_reason) : undefined };
}

export async function listPayslips(user: AuthenticatedUser): Promise<Payslip[]> {
  requireAny(user, ["payroll.view", "payslip.self.view"]);
  const client = db(), actor = await identity(client, user);
  const isSelfService = !can(user.permissions, "payroll.view");
  let query = client.from("payslips").select("*,payroll_lines(payroll_period_id,payroll_periods(period_month)),employees(employee_code,full_name)").order("created_at", { ascending: false });
  if (isSelfService) { if (!actor.employeeId) throw new AppError("PERMISSION_DENIED", "Tài khoản chưa liên kết nhân viên."); query = query.eq("employee_id", actor.employeeId).eq("status", "published"); }
  const { data, error } = await query; if (error) throw new AppError("SERVER_ERROR", "Không thể đọc phiếu lương.");
  return (data ?? []).map((row) => mapPayslip(row as Row));
}

export async function getPayslip(user: AuthenticatedUser, id: string): Promise<Payslip> {
  requireAny(user, ["payroll.view", "payslip.self.view"]);
  const client = db(), actor = await identity(client, user), isSelfService = !can(user.permissions, "payroll.view");
  let query = client.from("payslips").select("*,payroll_lines(payroll_period_id,payroll_periods(period_month)),employees(employee_code,full_name)").eq("id", id);
  if (isSelfService) {
    if (!actor.employeeId) throw new AppError("PERMISSION_DENIED", "Tài khoản chưa liên kết nhân viên.");
    query = query.eq("employee_id", actor.employeeId).eq("status", "published");
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu lương.");
  if (isSelfService && !data.viewed_at) {
    const viewedAt = new Date().toISOString();
    const { error: viewedError } = await client.from("payslips").update({ viewed_at: viewedAt }).eq("id", id).is("viewed_at", null).eq("status", "published");
    if (viewedError) throw new AppError("SERVER_ERROR", "Không thể ghi nhận thời điểm xem phiếu lương.");
    data.viewed_at = viewedAt;
  }
  return mapPayslip(data as Row);
}

export async function revokePayslip(user: AuthenticatedUser, id: string, input: z.infer<typeof payslipRevokeSchema>) {
  if (!can(user.permissions, "payslip.revoke")) throw new AppError("PERMISSION_DENIED");
  const client = db(), actor = await identity(client, user);
  const { data: before, error: readError } = await client.from("payslips").select("*").eq("id", id).maybeSingle();
  if (readError) throw new AppError("SERVER_ERROR", "Không thể đọc phiếu lương.");
  if (!before) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu lương.");
  if (before.status !== "published") throw new AppError("CONFLICT", "Chỉ phiếu lương đang phát hành mới có thể thu hồi.");
  const revokedAt = new Date().toISOString();
  const { data, error } = await client.from("payslips").update({ status: "revoked", revoked_at: revokedAt, revoked_by: actor.accountId, revoke_reason: input.reason }).eq("id", id).eq("status", "published").select("id,status,revoked_at,revoke_reason").maybeSingle();
  if (error) throw new AppError("SERVER_ERROR", "Không thể thu hồi phiếu lương.");
  if (!data) throw new AppError("CONFLICT", "Phiếu lương vừa được cập nhật.");
  await recordAuditLog({ actorId: actor.accountId, action: "payslip.revoked", entityType: "payslip", entityId: id, before, after: data, reason: input.reason });
  return { id: String(data.id), status: data.status, revokedAt: String(data.revoked_at), revokeReason: String(data.revoke_reason) };
}

export async function getPayslipDownloadAsset(user: AuthenticatedUser, id: string) {
  requireAny(user, ["payroll.view", "payslip.self.view"]);
  const client = db(), actor = await identity(client, user), isSelfService = !can(user.permissions, "payroll.view");
  let query = client.from("payslips").select("*,employees(employee_code,full_name),file_assets(bucket,object_path,metadata)").eq("id", id);
  if (isSelfService) {
    if (!actor.employeeId) throw new AppError("PERMISSION_DENIED", "Tài khoản chưa liên kết nhân viên.");
    query = query.eq("employee_id", actor.employeeId).eq("status", "published");
  }
  const { data: payslip, error } = await query.maybeSingle();
  if (error || !payslip) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu lương.");
  const existingValue = payslip.file_assets, existing = (Array.isArray(existingValue) ? existingValue[0] : existingValue) as Row | undefined;
  const fileName = `phieu-luong-${String(payslip.snapshot?.periodMonth ?? "ky-luong").slice(0, 7)}-v${payslip.version}.pdf`;
  if (existing) return { bucket: String(existing.bucket), path: String(existing.object_path), fileName };
  const person = employee(payslip as Row), template = await readSettingsGroup("payslip"), bytes = await generatePayslipPdf({ employeeCode: String(person?.employee_code ?? "—"), employeeName: String(person?.full_name ?? "—"), periodMonth: String(payslip.snapshot?.periodMonth ?? ""), version: Number(payslip.version), publishedAt: payslip.published_at ?? undefined, snapshot: payslip.snapshot as Row, template });
  const assetId = crypto.randomUUID(), objectPath = `${payslip.employee_id}/${id}/${assetId}.pdf`;
  const { error: uploadError } = await client.storage.from("payslip-private").upload(objectPath, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw new AppError("SERVER_ERROR", "Không thể tạo tệp phiếu lương.");
  const { error: assetError } = await client.from("file_assets").insert({ id: assetId, bucket: "payslip-private", object_path: objectPath, owner_entity_type: "payslip", owner_entity_id: id, mime_type: "application/pdf", byte_size: bytes.byteLength, visibility: "private", created_by: actor.accountId, metadata: { originalName: fileName, version: payslip.version } });
  if (assetError) { await client.storage.from("payslip-private").remove([objectPath]); throw new AppError("SERVER_ERROR", "Không thể lưu tệp phiếu lương."); }
  const { data: linked, error: linkError } = await client.from("payslips").update({ file_id: assetId }).eq("id", id).is("file_id", null).select("id").maybeSingle();
  if (linkError || !linked) { await client.from("file_assets").delete().eq("id", assetId); await client.storage.from("payslip-private").remove([objectPath]); throw new AppError("CONFLICT", "Phiếu lương vừa được cập nhật, vui lòng tải lại."); }
  await recordAuditLog({ actorId: actor.accountId, action: "payslip.pdf_generated", entityType: "payslip", entityId: id, metadata: { fileId: assetId, version: payslip.version } });
  return { bucket: "payslip-private", path: objectPath, fileName };
}
export async function accountingSummary(user: AuthenticatedUser) { const [periods, salaries, slips] = await Promise.all([can(user.permissions, "payroll.view") ? listPayroll(user) : Promise.resolve([]), can(user.permissions, "salary.view") ? listSalaries(user) : Promise.resolve([]), (can(user.permissions, "payroll.view") || can(user.permissions, "payslip.self.view")) ? listPayslips(user) : Promise.resolve([])]); const published=slips.filter((item)=>item.status==="published"); return { salaryProfiles: new Set(salaries.map((item) => item.employeeId)).size, openPayrolls: periods.filter((item) => !["locked", "published"].includes(item.status)).length, lockedPayrolls: periods.filter((item) => item.status === "locked" || item.status === "published").length, publishedPayslips: published.length, viewedPayslips: published.filter((item)=>item.viewedAt).length, unseenPayslips: published.filter((item)=>!item.viewedAt).length, revokedPayslips: slips.filter((item)=>item.status==="revoked").length, recentPayrolls: periods.slice(0, 5), recentPayslips: slips.slice(0, 5) }; }
