import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
const service=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/supabase/server",()=>({getSupabaseServiceClient:service}));
import {listAttendanceExportEvents} from "./attendanceRepository";

const user={id:"hr-1",permissions:["timesheet.export","attendance.view_all"]} as AuthenticatedUser;
const rows=Array.from({length:1001},(_,index)=>({id:`event-${index}`,client_event_id:`capture-${index}`,employee_id:"employee-1",event_type:"check_in",attendance_date:"2026-11-10",effective_at:"2026-11-10T00:00:00Z",captured_at_client:"2026-11-10T00:00:00Z",received_at_server:"2026-11-10T00:00:00Z",geofence_status:"valid",attendance_status:"recorded",photo_status:"uploaded",sync_status:"synced",employees:{full_name:"Giám sát",employee_code:"GS01"}}));
beforeEach(()=>service.mockReset());
describe("complete HR export event reads",()=>{
  it("reads beyond both the screen's 300 rows and the provider's 1000-row page",async()=>{
    const range=vi.fn(async(from:number,to:number)=>({data:rows.slice(from,to+1),error:null}));
    const query={select:()=>query,order:()=>query,gte:()=>query,lte:()=>query,range};
    service.mockReturnValue({from:()=>query});
    const events=await listAttendanceExportEvents(user,"2026-11-01","2026-11-30");
    expect(events).toHaveLength(1001);expect(events.at(-1)?.id).toBe("event-1000");
    expect(range.mock.calls).toEqual([[0,999],[1000,1999]]);
  });
  it("rejects an export-only account before reading other employees",async()=>{
    await expect(listAttendanceExportEvents({...user,permissions:["timesheet.export"]},"2026-11-01","2026-11-30")).rejects.toMatchObject({code:"PERMISSION_DENIED"});
    expect(service).not.toHaveBeenCalled();
  });
  it("fails the complete export when a later page cannot be read",async()=>{
    const range=vi.fn().mockResolvedValueOnce({data:rows.slice(0,1000),error:null}).mockResolvedValueOnce({data:null,error:{message:"unavailable"}});
    const query={select:()=>query,order:()=>query,gte:()=>query,lte:()=>query,range};service.mockReturnValue({from:()=>query});
    await expect(listAttendanceExportEvents(user,"2026-11-01","2026-11-30")).rejects.toMatchObject({code:"SERVER_ERROR"});
  });
});
