import {NextResponse} from "next/server";import {z} from "zod";
import {errorResponse} from "@/lib/api/errors";import {parseJsonBody} from "@/lib/api/validation";
import {changeCurrentPassword,clearSessionCookies} from "@/services/auth/sessionService";
const schema=z.object({currentPassword:z.string().min(8).max(256),newPassword:z.string().min(12).max(256)}).strict().refine(value=>value.currentPassword!==value.newPassword,{message:"Mật khẩu mới phải khác mật khẩu hiện tại.",path:["newPassword"]});
export async function POST(request:Request){try{const input=await parseJsonBody(request,schema);await changeCurrentPassword(input.currentPassword,input.newPassword);const response=NextResponse.json({ok:true,data:null},{headers:{"cache-control":"no-store"}});clearSessionCookies(response.cookies);return response;}catch(error){return errorResponse(error);}}
