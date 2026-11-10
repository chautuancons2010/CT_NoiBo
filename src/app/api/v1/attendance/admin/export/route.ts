import { z } from "zod";
import { exportAttendanceWorkbook } from "@/features/attendance/services/attendanceWorkbookRepository";
import { errorResponse } from "@/lib/api/errors";
import { parseWithSchema } from "@/lib/api/validation";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";
import { readModuleSettings } from "@/services/system-settings/systemSettingsService";

const querySchema=z.object({month:z.string().regex(/^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/)});
export async function GET(request:Request) {
  try {
    const user=requireAuthenticatedUser(await getRequestUser());
    const {month}=parseWithSchema(querySchema,{month:new URL(request.url).searchParams.get("month")});
    const modules=await readModuleSettings({maxAgeMs:2000});
    if(!modules.attendance||!modules.projects||!modules.human_resources)return Response.json({ok:false,error:{code:"MODULE_LOCKED",message:"Module chấm công, nhân sự hoặc công trường đang tạm khóa."}},{status:423,headers:{"cache-control":"private, no-store"}});
    const bytes=await exportAttendanceWorkbook(user,month,process.env.APP_BASE_URL??new URL(request.url).origin);
    return new Response(new Uint8Array(bytes),{headers:{"content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","content-disposition":`attachment; filename="Bang_cong_nhan_su_${month}.xlsx"`,"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
  }catch(error){return errorResponse(error);}
}
