import { beforeEach, expect, it, vi } from "vitest";
import { enqueueWorkerOvertime, readWorkerOvertimeQueue, syncWorkerOvertimeQueue, type WorkerOvertimeTimeEntry } from "./workerOvertimeQueue";
const input: WorkerOvertimeTimeEntry = {ownerAccountId:"actor",clientSessionId:"stable-client-id",projectId:"project",worksiteId:"site",shiftCode:"PORT_GENERAL",date:"2026-11-13",capturedAtClient:"2026-11-13T10:00:00Z",workerIds:["worker"],checkedInAt:"2026-11-13T05:00:00+07:00",checkedOutAt:"2026-11-13T07:00:00+07:00",consentConfirmed:true,note:""};
beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();Object.defineProperty(navigator,"onLine",{configurable:true,value:true});});
it("retains original hours and client ID after a lost response and removes them only on acknowledged success",async()=>{
 enqueueWorkerOvertime(input);const fetcher=vi.fn().mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce({ok:true,json:async()=>({ok:true,data:{id:"saved",clientSessionId:input.clientSessionId}})});vi.stubGlobal("fetch",fetcher);
 await expect(syncWorkerOvertimeQueue("actor")).rejects.toThrow("lost response");expect(readWorkerOvertimeQueue("actor")).toEqual([input]);
 await syncWorkerOvertimeQueue("actor");expect(readWorkerOvertimeQueue("actor")).toEqual([]);
 expect(fetcher.mock.calls.map(call=>JSON.parse(call[1].body))).toEqual([input,input]);
});
it("does not send while offline or read a different account's queued hours",async()=>{
 enqueueWorkerOvertime(input);Object.defineProperty(navigator,"onLine",{configurable:true,value:false});const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
 await syncWorkerOvertimeQueue("actor");expect(fetcher).not.toHaveBeenCalled();expect(readWorkerOvertimeQueue("other")).toEqual([]);expect(readWorkerOvertimeQueue("actor")).toHaveLength(1);
});
