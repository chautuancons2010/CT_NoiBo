import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WorkerAttendanceToday } from "./WorkerAttendanceHome";
import { saveWorkerDraft } from "../client/workerDraftStore";
import { getBusinessDateKey } from "@/lib/time/timezone";

const state=vi.hoisted(()=>({push:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({push:state.push})}));
vi.mock("@/components/providers/CurrentUserProvider",()=>({useCurrentUser:()=>({id:"actor",permissions:["worker_attendance.create","worker_attendance.view"]})}));
vi.mock("@/lib/realtime/useDomainReconciliation",()=>({useDomainReconciliation:vi.fn()}));
vi.mock("@/features/attendance/client/attendanceQueue",()=>({listPendingAttendance:vi.fn(async()=>[])}));
vi.mock("../client/workerDraftStore",()=>({cacheWorkerTasks:vi.fn(),getCachedWorkerTasks:vi.fn(),listWorkerDrafts:vi.fn(async()=>[]),saveWorkerDraft:vi.fn(async()=>undefined)}));
const date=getBusinessDateKey();
const task={projectId:"package",projectName:"Gói A",worksiteId:"site",worksiteName:"Cảng A",date,shiftCode:"DAY",shiftName:"Ca ngày",expectedWorkers:1,isWorkingDay:true,existingSessionId:"normal-session",existingStatus:"submitted",roster:[{workerId:"worker",workerName:"Công nhân A",employeeCode:"CN1",assignmentRole:"worker"}],checklist:[]};
beforeEach(()=>{
 vi.clearAllMocks();vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({ok:true,data:{accountId:"actor",personalAttendanceReady:true,tasks:[task],policy:{minimumPhotos:1}}})})));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("opens entered overtime for the chosen package without redoing the regular attendance flow",async()=>{
 render(<WorkerAttendanceToday initialOvertime projectId="package"/>);
 const choice=await screen.findByRole("radio");fireEvent.click(choice);
 fireEvent.click(screen.getByRole("button",{name:"Ghi t\u0103ng ca"}));
 expect(await screen.findByRole("dialog")).toBeInTheDocument();
 expect(screen.getByLabelText(/^B\u1eaft \u0111\u1ea7u[\\s*]*$/)).toHaveValue("");
 expect(screen.getByLabelText(/^K\u1ebft th\u00fac[\\s*]*$/)).toHaveValue("");
 expect(saveWorkerDraft).not.toHaveBeenCalled();expect(state.push).not.toHaveBeenCalled();
});

it("requires a port after package selection and snapshots the chosen hours in the device draft",async()=>{
 const ports=[{...task,shiftCode:"PORT_SPECIALIZED",shiftName:"Cảng chuyên dụng",shiftStart:"08:00",shiftEnd:"17:00",existingSessionId:undefined,existingStatus:undefined},{...task,shiftCode:"PORT_GENERAL",shiftName:"Cảng tổng hợp",shiftStart:"07:30",shiftEnd:"17:00",existingSessionId:undefined,existingStatus:undefined}];
 vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({ok:true,data:{accountId:"actor",personalAttendanceReady:true,tasks:ports,policy:{minimumPhotos:1}}})} as Response);
 render(<WorkerAttendanceToday projectId="package"/>);
 const choice=await screen.findByRole("radio");
 expect(screen.queryByRole("combobox",{name:/Khu vực cảng/})).not.toBeInTheDocument();
 fireEvent.click(choice);
 expect(screen.getByRole("button",{name:"Chọn công nhân"})).toBeDisabled();
 fireEvent.click(screen.getByRole("radio",{name:/Cảng chuyên dụng/}));
 expect(screen.getByText("07:50")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Chọn công nhân"}));
 await waitFor(()=>expect(saveWorkerDraft).toHaveBeenCalledOnce());
 expect(vi.mocked(saveWorkerDraft).mock.calls[0][0].session).toMatchObject({shiftCode:"PORT_SPECIALIZED",shiftStart:"08:00",shiftEnd:"17:00",projectId:"package"});
});
