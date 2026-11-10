// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import type { AttendancePhotoStampMetadata } from "../types/attendanceTypes";

const client = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServiceClient: client }));
vi.mock("@/services/audit/auditLog", () => ({ recordAuditLog: vi.fn() }));
import { uploadAttendancePhoto } from "./attendanceRepository";

const capturedAt = "2026-11-09T01:00:00.000Z";
const stamp: AttendancePhotoStampMetadata = { version: 1, capturedAt, address: "SC05, TP. Hồ Chí Minh", latitude: 10.7769, longitude: 106.7009 };
const user: AuthenticatedUser = { id: "11111111-1111-4111-8111-111111111111", username: "supervisor", displayName: "Giám sát", email: "supervisor@example.invalid", status: "active", permissions: ["attendance.self.create"] };
const photoFile = () => new File([new Uint8Array([0xff,0xd8,0xff,0x00,0x00])],"attendance.jpg",{type:"image/jpeg"});
const input = () => ({ photo:photoFile(), thumbnail:photoFile(), width:1600, height:1200, capturedAt });

function database() {
  let savedPhoto: Record<string,unknown> | undefined;
  let assets: Record<string,unknown>[] = [];
  const upload = vi.fn().mockResolvedValue({ error:null });
  const event: Record<string,unknown> = { id:"event-1", client_event_id:"22222222-2222-4222-8222-222222222222", employee_id:"employee-1", event_type:"check_in", attendance_date:"2026-11-09", effective_at:capturedAt, captured_at_client:capturedAt, received_at_server:capturedAt, latitude:stamp.latitude, longitude:stamp.longitude, geofence_status:"valid", attendance_status:"recorded", photo_status:"pending_upload", sync_status:"syncing", anomaly_flags:[] };
  client.mockReturnValue({
    storage:{from:()=>({upload})},
    from(table:string){
      const result = () => ({ data:table==="file_assets"?assets:table==="attendance_events"?{...event,attendance_photos:savedPhoto?[savedPhoto]:[]}:table==="app_accounts"?{id:user.id,employee_id:"employee-1",status:"active",employees:{full_name:"Giám sát",employee_code:"GS01"}}:table==="attendance_photos"?savedPhoto??null:[],error:null });
      const query = {
        select:()=>query, eq:()=>query, limit:()=>query,
        update(values:Record<string,unknown>){if(table==="attendance_events")Object.assign(event,values);return query;},
        upsert(values:Record<string,unknown>|Record<string,unknown>[]){if(table==="file_assets")assets=values as Record<string,unknown>[];else if(table==="attendance_photos")savedPhoto=values as Record<string,unknown>;return query;},
        insert:()=>query,
        maybeSingle:async()=>result(),single:async()=>result(),
        then(onFulfilled:(value:unknown)=>unknown,onRejected?:(reason:unknown)=>unknown){return Promise.resolve(result()).then(onFulfilled,onRejected);},
      };
      return query;
    },
  });
  return { upload,event,photo:()=>savedPhoto };
}
beforeEach(()=>client.mockReset());

describe("attendance photo stamp persistence",()=>{
  it("stores capture metadata and returns it with the uploaded event",async()=>{
    const db=database();
    const result=await uploadAttendancePhoto(user,"event-1",{...input(),photoStamp:stamp});
    expect(db.photo()?.metadata).toEqual({normalizedOrientation:true,source:"camera",stamp});
    expect(result.event).toMatchObject({photoStatus:"uploaded",photoStamp:stamp});
    expect(db.upload).toHaveBeenCalledTimes(2);
  });
  it("accepts legacy queued photos and never labels them as stamped",async()=>{
    const db=database();
    const result=await uploadAttendancePhoto(user,"event-1",input());
    expect(db.photo()?.metadata).not.toHaveProperty("stamp");
    expect(result.event.photoStamp).toBeUndefined();
    const replay=await uploadAttendancePhoto(user,"event-1",input());
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.event.photoStamp).toBeUndefined();
    expect(db.upload).toHaveBeenCalledTimes(2);
  });
  it.each([
    { ...stamp,capturedAt:"2026-11-09T01:01:00.000Z" },
    { ...stamp,latitude:21.0278 },
  ])("rejects capture metadata that disagrees with the recorded event",async bad=>{
    const db=database();
    await expect(uploadAttendancePhoto(user,"event-1",{...input(),photoStamp:bad})).rejects.toMatchObject({code:"VALIDATION_ERROR"});
    expect(db.upload).not.toHaveBeenCalled();
    expect(db.photo()).toBeUndefined();
  });
  it("rejects claimed stamped GPS when the event has no GPS",async()=>{
    const db=database();delete db.event.latitude;
    await expect(uploadAttendancePhoto(user,"event-1",{...input(),photoStamp:stamp})).rejects.toMatchObject({code:"VALIDATION_ERROR"});
    expect(db.upload).not.toHaveBeenCalled();
  });
});
