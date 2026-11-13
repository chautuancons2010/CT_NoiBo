import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./workerDraftStore", () => ({ getWorkEvidence: vi.fn(), deleteWorkEvidence: vi.fn(async () => undefined) }));
import { getWorkEvidence, deleteWorkEvidence } from "./workerDraftStore";
vi.mock("./workerAttendanceSync", () => ({ readWorkerResponse: async (response: Response) => { if (!response.ok) throw new Error("Conflict"); return response.json(); } }));
import { readWorkerWorkQueue, syncWorkerWorkQueue, withPendingWorkOperations, writeWorkerWorkQueue, type WorkerWorkOperation } from "./workerWorkQueue";
import type { WorkerAttendanceSession } from "../types/workerAttendanceTypes";

const operation: WorkerWorkOperation = { ownerAccountId:"account",sessionId:"session",batchId:"batch",entryIds:["one"],eventType:"pause",effectiveAt:"2026-11-13T03:00:00Z",reason:"rain" };
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); Object.defineProperty(navigator,"onLine",{configurable:true,value:true}); });
describe("durable worker actions", () => {
  it("retains offline rain photos until both the upload and original pause operation succeed", async () => {
    const withPhoto = { ...operation, evidenceRequired: true, evidencePhotoIds: ["photo-1"] };
    const photo = { id: "photo-1", photo: new Blob(["jpeg"]), thumbnail: new Blob(["thumb"]), width: 640, height: 480, capturedAt: operation.effectiveAt, uploaded: false };
    vi.mocked(getWorkEvidence).mockResolvedValue({ batchId: "batch", ownerAccountId: "account", sessionId: "session", photos: [photo] });
    writeWorkerWorkQueue("account", [withPhoto]);
    const fetcher = vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response(JSON.stringify({ id: "session" }))).mockResolvedValueOnce(new Response("{}", { status: 409 }));
    await expect(syncWorkerWorkQueue("account")).rejects.toThrow();
    expect(readWorkerWorkQueue("account")).toEqual([withPhoto]);expect(deleteWorkEvidence).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(new Response(JSON.stringify({ id: "session" })));
    // Use a new Response for every retry, as each body is consumed exactly once.
    fetcher.mockImplementation(async () => new Response(JSON.stringify({ id: "session" })));
    await syncWorkerWorkQueue("account");
    const uploads = fetcher.mock.calls.filter(([, init]) => init?.body instanceof FormData);
    expect(uploads).toHaveLength(2);
    expect(uploads.map(([, init]) => (init!.body as FormData).get("photoId"))).toEqual(["photo-1", "photo-1"]);
    expect(JSON.parse(String(fetcher.mock.calls.at(-1)?.[1]?.body))).toMatchObject({ effectiveAt: operation.effectiveAt, evidencePhotoIds: ["photo-1"] });
    expect(readWorkerWorkQueue("account")).toHaveLength(0);expect(deleteWorkEvidence).toHaveBeenCalledWith("batch");
  });
  it("retains a failed request and replays the original batch once after reconnecting", async () => {
    writeWorkerWorkQueue("account",[operation]);
    const fetcher = vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response("{}",{status:409})).mockResolvedValueOnce(new Response(JSON.stringify({id:"session"})));
    await expect(syncWorkerWorkQueue("account")).rejects.toThrow("Conflict");
    expect(readWorkerWorkQueue("account")).toEqual([operation]);
    await Promise.all([syncWorkerWorkQueue("account"),syncWorkerWorkQueue("account")]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({batchId:"batch",ownerAccountId:"account"});
    expect(readWorkerWorkQueue("account")).toEqual([]);
  });
  it("preserves actions added while a previous request is in flight", async () => {
    writeWorkerWorkQueue("account",[operation]);
    vi.spyOn(globalThis,"fetch").mockImplementation(async () => { writeWorkerWorkQueue("account",[operation,{...operation,batchId:"next",eventType:"resume"}]); return new Response(JSON.stringify({id:"session"})); });
    await syncWorkerWorkQueue("account");
    expect(readWorkerWorkQueue("account").map(item=>item.batchId)).toEqual(["next"]);
  });
  it("blocks replay with another account and does not contact the server", async () => {
    writeWorkerWorkQueue("other",[operation]);
    const fetcher = vi.spyOn(globalThis,"fetch");
    await expect(syncWorkerWorkQueue("other")).rejects.toThrow("tài khoản khác");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("updates only selected workers locally and does not duplicate queued events", () => {
    const session = {id:"session",entries:[{id:"one"},{id:"two"}]} as WorkerAttendanceSession;
    const changed = withPendingWorkOperations(session,[operation]);
    expect(changed.entries[0].workEvents).toHaveLength(1);
    expect(changed.entries[1]).toBe(session.entries[1]);
    expect(withPendingWorkOperations(changed,[operation]).entries[0].workEvents).toHaveLength(1);
    const received = { ...session, entries: [{ ...session.entries[0], workEvents: [{ id:"saved",batchId:operation.batchId,entryId:"one",eventType:"pause",effectiveAt:operation.effectiveAt,reason:"rain" }] },session.entries[1]] } as WorkerAttendanceSession;
    expect(withPendingWorkOperations(received,[operation]).entries[0].workEvents).toHaveLength(1);
  });
});
