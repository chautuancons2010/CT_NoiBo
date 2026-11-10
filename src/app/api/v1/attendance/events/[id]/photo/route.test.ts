// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),upload:vi.fn()}));
vi.mock("@/services/auth/getRequestUser",()=>({getRequestUser:mocks.user}));
vi.mock("@/features/attendance/services/attendanceRepository",()=>({uploadAttendancePhoto:mocks.upload}));
import { POST } from "./route";

const id="11111111-1111-4111-8111-111111111111";
const capturedAt="2026-11-09T01:00:00.000Z";
const stamp={version:1,capturedAt,address:"SC05, TP. Hồ Chí Minh",latitude:10.7769,longitude:106.7009};
const user={id:"supervisor",status:"active",permissions:["attendance.self.create"]};
function request(rawStamp?:string){
  const form=new FormData();
  form.set("photo",new File([new Uint8Array([0xff,0xd8,0xff,0])],"photo.jpg",{type:"image/jpeg"}));
  form.set("thumbnail",new File([new Uint8Array([0xff,0xd8,0xff,0])],"thumb.jpg",{type:"image/jpeg"}));
  form.set("width","1600");form.set("height","1200");form.set("capturedAt",capturedAt);
  if(rawStamp!==undefined)form.set("stamp",rawStamp);
  return new Request(`https://app.example.invalid/api/v1/attendance/events/${id}/photo`,{method:"POST",body:form});
}
beforeEach(()=>{vi.clearAllMocks();mocks.user.mockResolvedValue(user);mocks.upload.mockResolvedValue({event:{id},idempotentReplay:false});});
const context={params:Promise.resolve({id})};
describe("attendance photo stamp multipart input",()=>{
  it("passes a structured stamp to the upload service",async()=>{
    expect((await POST(request(JSON.stringify(stamp)),context)).status).toBe(200);
    expect(mocks.upload).toHaveBeenCalledWith(user,id,expect.objectContaining({photoStamp:stamp,capturedAt}));
  });
  it("allows old multipart uploads without inventing a stamp",async()=>{
    expect((await POST(request(),context)).status).toBe(200);
    expect(mocks.upload.mock.calls[0][2]).not.toHaveProperty("photoStamp");
  });
  it.each(["{broken",JSON.stringify({...stamp,latitude:91}),JSON.stringify({...stamp,address:" "}),JSON.stringify({...stamp,version:2})])("rejects malformed or invalid stamp input",async raw=>{
    expect((await POST(request(raw),context)).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
