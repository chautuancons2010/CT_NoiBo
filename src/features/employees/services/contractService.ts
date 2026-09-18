import "server-only";

import type { z } from "zod";

import { employeeContractInputSchema } from "@/features/employees/schemas/employeeSchemas";
import type { EmployeeContract } from "@/features/employees/types";
import { AppError } from "@/lib/api/errors";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import { safeUploadName, validateUploadedFile } from "@/lib/security/filePolicy";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/services/audit/auditLog";

type Input = z.infer<typeof employeeContractInputSchema>;
type Row = Record<string, unknown>;

function db(){const client=getSupabaseServiceClient();if(!client)throw new AppError("SERVER_ERROR","Supabase chưa được cấu hình.");return client;}
function required(user:AuthenticatedUser,permission:"contract.view"|"contract.edit"|"contract.file.upload"){if(!can(user.permissions,permission))throw new AppError("PERMISSION_DENIED");}
function map(row:Row):EmployeeContract{return{id:String(row.id),employeeId:String(row.employee_id),contractNumber:String(row.contract_number),contractType:String(row.contract_type),signedDate:row.signed_date?String(row.signed_date):undefined,effectiveDate:row.effective_date?String(row.effective_date):String(row.start_date),startDate:String(row.start_date),endDate:row.end_date?String(row.end_date):undefined,status:String(row.status) as EmployeeContract["status"],attachmentFileId:row.attachment_file_id?String(row.attachment_file_id):undefined,note:row.note?String(row.note):undefined,archivedAt:row.archived_at?String(row.archived_at):undefined,rowVersion:Number(row.row_version??1)};}

async function upload(user:AuthenticatedUser,employeeId:string,contractId:string,file:File){
  required(user,"contract.file.upload");
  const bytes=await validateUploadedFile(file,{allowedMimeTypes:["application/pdf"],maxBytes:15*1024*1024});
  const client=db(),assetId=crypto.randomUUID(),path=`${employeeId}/contracts/${contractId}/${assetId}-${safeUploadName(file.name,"contract.pdf")}`;
  const{error:uploadError}=await client.storage.from("employee-private").upload(path,bytes,{contentType:file.type,upsert:false});
  if(uploadError)throw new AppError("SERVER_ERROR","Không thể tải file hợp đồng.");
  const{error}=await client.from("file_assets").insert({id:assetId,bucket:"employee-private",object_path:path,owner_entity_type:"employee_contract",owner_entity_id:contractId,mime_type:file.type,byte_size:file.size,visibility:"private",created_by:user.id,metadata:{originalName:file.name}});
  if(error){await client.storage.from("employee-private").remove([path]);throw new AppError("SERVER_ERROR","Không thể lưu file hợp đồng.");}
  return{assetId,path};
}

export async function listContracts(user:AuthenticatedUser,employeeId:string){required(user,"contract.view");const client=db(),{data,error}=await client.from("employee_contracts").select("*").eq("employee_id",employeeId).order("effective_date",{ascending:false,nullsFirst:false}).order("start_date",{ascending:false});if(error)throw new AppError("SERVER_ERROR","Không thể đọc hợp đồng.");const contracts=(data??[]).map(row=>map(row as Row));if(!contracts.length||!can(user.permissions,"contract.file.view"))return contracts;const{data:assets,error:assetError}=await client.from("file_assets").select("id,owner_entity_id,created_at,metadata").eq("owner_entity_type","employee_contract").in("owner_entity_id",contracts.map(row=>row.id)).order("created_at",{ascending:false});if(assetError)throw new AppError("SERVER_ERROR","Không thể đọc lịch sử file hợp đồng.");return contracts.map(row=>({...row,fileVersions:(assets??[]).filter(asset=>asset.owner_entity_id===row.id).map(asset=>({fileId:String(asset.id),fileName:typeof asset.metadata?.originalName==="string"?asset.metadata.originalName:"Hợp đồng PDF",uploadedAt:String(asset.created_at)}))}));}

export async function createContract(user:AuthenticatedUser,employeeId:string,input:Input,file?:File){
  required(user,"contract.edit");const client=db(),id=crypto.randomUUID();
  const stored=file?await upload(user,employeeId,id,file):undefined;
  const{data,error}=await client.from("employee_contracts").insert({id,employee_id:employeeId,contract_number:input.contractNumber,contract_type:input.contractType,signed_date:input.signedDate??null,effective_date:input.effectiveDate,start_date:input.effectiveDate,end_date:input.endDate??null,status:input.status,attachment_file_id:stored?.assetId??null,note:input.note??null,created_by:user.id}).select("*").single();
  if(error||!data){if(stored){await client.from("file_assets").delete().eq("id",stored.assetId);await client.storage.from("employee-private").remove([stored.path]);}throw new AppError(error?.code==="23505"?"CONFLICT":"SERVER_ERROR","Không thể tạo hợp đồng.");}
  await recordAuditLog({actorId:user.id,action:"employee.contract.created",entityType:"employee_contract",entityId:id,after:{employeeId,contractNumber:input.contractNumber,status:input.status}});return map(data as Row);
}

export async function updateContract(user:AuthenticatedUser,employeeId:string,contractId:string,input:Input,file?:File){
  required(user,"contract.edit");const client=db(),{data:current}=await client.from("employee_contracts").select("*").eq("id",contractId).eq("employee_id",employeeId).maybeSingle();if(!current)throw new AppError("NOT_FOUND","Không tìm thấy hợp đồng.");
  const stored=file?await upload(user,employeeId,contractId,file):undefined;
  const{data,error}=await client.from("employee_contracts").update({contract_number:input.contractNumber,contract_type:input.contractType,signed_date:input.signedDate??null,effective_date:input.effectiveDate,start_date:input.effectiveDate,end_date:input.endDate??null,status:input.status,attachment_file_id:stored?.assetId??current.attachment_file_id,note:input.note??null,row_version:Number(current.row_version??1)+1}).eq("id",contractId).eq("row_version",Number(current.row_version??1)).select("*").maybeSingle();
  if(error||!data){if(stored){await client.from("file_assets").delete().eq("id",stored.assetId);await client.storage.from("employee-private").remove([stored.path]);}throw new AppError("CONFLICT","Hợp đồng đã thay đổi, vui lòng tải lại.");}
  await recordAuditLog({actorId:user.id,action:stored?"employee.contract.file_replaced":"employee.contract.updated",entityType:"employee_contract",entityId:contractId,before:{status:current.status,attachmentFileId:current.attachment_file_id},after:{status:input.status,attachmentFileId:data.attachment_file_id}});return map(data as Row);
}

export async function archiveContract(user:AuthenticatedUser,employeeId:string,contractId:string,reason:string){required(user,"contract.edit");if(reason.trim().length<3)throw new AppError("VALIDATION_ERROR","Cần nhập lý do lưu trữ.");const client=db(),{data:current}=await client.from("employee_contracts").select("id,status,archived_at").eq("id",contractId).eq("employee_id",employeeId).maybeSingle();if(!current)throw new AppError("NOT_FOUND","Không tìm thấy hợp đồng.");const{data,error}=await client.from("employee_contracts").update({archived_at:new Date().toISOString(),archived_by:user.id,status:"terminated"}).eq("id",contractId).is("archived_at",null).select("*").maybeSingle();if(error||!data)throw new AppError("CONFLICT","Hợp đồng đã được lưu trữ.");await recordAuditLog({actorId:user.id,action:"employee.contract.archived",entityType:"employee_contract",entityId:contractId,before:{status:current.status},after:{status:"terminated"},reason});return map(data as Row);}
