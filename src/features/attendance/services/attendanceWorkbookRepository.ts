import "server-only";
import { can, type AuthenticatedUser } from "@/lib/auth/permissions";
import { AppError } from "@/lib/api/errors";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { listWorkerSessions } from "@/features/worker-attendance/services/workerAttendanceRepository";
import { listAttendanceExportEvents } from "./attendanceRepository";
import { generateAttendanceWorkbook, type AttendanceCalculatedRow, type AttendanceAdjustmentRow } from "./attendanceWorkbook";

type Row = Record<string, unknown>;
const joined=(value:unknown):Row => (Array.isArray(value)?value[0]:value) as Row ?? {};
const text=(row:Row,key:string)=>typeof row[key]==="string"?row[key] as string:"";

export function canExportAttendanceWorkbook(user: Pick<AuthenticatedUser,"permissions">) {
  return can(user.permissions,"timesheet.export") && can(user.permissions,"worker_attendance.view_all") && (["attendance.view_all","attendance.manage","attendance.log.view"] as const).some(key=>can(user.permissions,key));
}

export async function exportAttendanceWorkbook(user:AuthenticatedUser,month:string,baseUrl:string) {
  if(!canExportAttendanceWorkbook(user)) throw new AppError("PERMISSION_DENIED");
  const client=getSupabaseServiceClient();
  if(!client)throw new AppError("SERVER_ERROR");
  const [year,number]=month.split("-").map(Number),from=`${month}-01`,to=new Date(Date.UTC(year,number,0)).toISOString().slice(0,10);
  async function paged(table:"daily_timesheets"|"timesheet_adjustments",select:string) {
    const rows:Row[]=[];
    for(let offset=0;;offset+=1000) {
      const {data,error}=await client!.from(table).select(select).gte("work_date",from).lte("work_date",to).order("id").range(offset,offset+999);
      if(error)throw new AppError("SERVER_ERROR","Không thể đọc đủ dữ liệu bảng công để xuất Excel.");
      rows.push(...(data??[]) as unknown as Row[]);
      if((data?.length??0)<1000)return rows;
    }
  }
  const [events,sessions,daily,adjustments]=await Promise.all([
    listAttendanceExportEvents(user,from,to),listWorkerSessions(user,{from,to}),
    paged("daily_timesheets","id,work_date,employee_snapshot,effective_check_in,effective_check_out,work_minutes,work_fraction,status,hr_note,timesheet_periods(name)"),
    paged("timesheet_adjustments","id,work_date,adjustment_type,effective_time,corrected_work_fraction,reason,created_at,employees(employee_code,full_name),timesheet_periods(name)")
  ]);
  const calculated:AttendanceCalculatedRow[]=daily.map(row=>{const employee=joined(row.employee_snapshot);return {periodName:text(joined(row.timesheet_periods),"name"),employeeCode:text(employee,"code"),employeeName:text(employee,"name"),workDate:text(row,"work_date"),checkIn:text(row,"effective_check_in")||undefined,checkOut:text(row,"effective_check_out")||undefined,workMinutes:Number(row.work_minutes??0),workFraction:Number(row.work_fraction??0),status:text(row,"status"),note:text(row,"hr_note")};});
  const changes:AttendanceAdjustmentRow[]=adjustments.map(row=>({periodName:text(joined(row.timesheet_periods),"name"),employeeCode:text(joined(row.employees),"employee_code"),employeeName:text(joined(row.employees),"full_name"),workDate:text(row,"work_date"),type:text(row,"adjustment_type"),effectiveTime:text(row,"effective_time")||undefined,workFraction:row.corrected_work_fraction==null?undefined:Number(row.corrected_work_fraction),reason:text(row,"reason"),createdAt:text(row,"created_at")}));
  return generateAttendanceWorkbook({month,baseUrl,events,sessions,calculated,adjustments:changes});
}
