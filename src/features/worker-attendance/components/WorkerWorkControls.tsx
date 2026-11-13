"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloudRain, Play, Square } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Input, Select } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { FormActions, FormFields, SectionedForm } from "@/components/shared/FormLayout";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { workerWorkState } from "../services/workerWorkIntervals";
import { readWorkerWorkQueue, syncWorkerWorkQueue, withPendingWorkOperations, writeWorkerWorkQueue, type WorkerWorkOperation } from "../client/workerWorkQueue";
import { readWorkerResponse } from "../client/workerAttendanceSync";
import { listWorkEvidence, saveWorkEvidence, type LocalWorkerPhoto, type WorkerWorkEvidence } from "../client/workerDraftStore";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { AttendanceLocationAddress } from "@/features/attendance/components/AttendanceLocationAddress";
import { useAttendanceLocation } from "@/features/attendance/client/useAttendanceLocation";
import { processAttendanceImage } from "@/features/attendance/client/imageProcessing";
import { WorkerEvidencePhoto } from "./WorkerEvidencePhoto";
import { workerRainEvidence } from "../services/workerRainEvidence";
import type { WorkerAttendanceSession } from "../types/workerAttendanceTypes";
import styles from "./WorkerWorkControls.module.css";

const labels = { pause: "Tạm nghỉ mưa", resume: "Tiếp tục làm việc", finish: "Kết thúc làm việc" };
const stateLabels = { working: "Đang làm", paused: "Đang tạm nghỉ", finished: "Đã kết thúc", unconfirmed: "Chưa bắt đầu" };
const localTime = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date()).replace(" ", "T");

export function WorkerWorkControls({ session, onChanged }: { session: WorkerAttendanceSession; onChanged: (session: WorkerAttendanceSession) => void }) {
  const user = useCurrentUser();
  const [action, setAction] = useState<WorkerWorkOperation["eventType"]>();
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("rain");
  const [effectiveAt, setEffectiveAt] = useState(localTime);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const [batchId, setBatchId] = useState("");
  const [photos, setPhotos] = useState<LocalWorkerPhoto[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [recoverable, setRecoverable] = useState<WorkerWorkEvidence>();
  const [evidenceOnly, setEvidenceOnly] = useState(false);
  const gps = useAttendanceLocation();
  useEffect(() => {
    let active = true;
    void listWorkEvidence().then(items => {
      const queued = new Set(readWorkerWorkQueue(user.id).map(item => item.batchId));
      if (active) setRecoverable(items.find(item => item.ownerAccountId === user.id && item.sessionId === session.id && item.draft && !queued.has(item.batchId)));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session.id, user.id, pending]);
  const flushing = useRef(false);
  const sessionRef = useRef(session);
  const onChangedRef = useRef(onChanged);
  useEffect(() => { sessionRef.current = session; onChangedRef.current = onChanged; }, [session,onChanged]);
  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine) return;
    flushing.current = true;
    try {
      await syncWorkerWorkQueue(user.id);
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Chưa đồng bộ được thao tác."); }
    finally { flushing.current = false; }
  }, [user.id]);
  useEffect(() => {
    const refresh = () => {
      try {
        const queue = readWorkerWorkQueue(user.id);
        setPending(queue.filter(item => item.sessionId === sessionRef.current.id).length);
        const updated = withPendingWorkOperations(sessionRef.current, queue);
        if (updated !== sessionRef.current) { sessionRef.current = updated; onChangedRef.current(updated); }
      } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể lưu trên thiết bị."); }
    };
    const initialSync = window.setTimeout(() => { refresh(); void flush(); }, 0);
    const synced = (event: Event) => {
      const { accountId, session: actual } = (event as CustomEvent<{ accountId: string; session: WorkerAttendanceSession }>).detail;
      if (accountId === user.id && actual.id === sessionRef.current.id) { sessionRef.current = actual; onChangedRef.current(actual); refresh(); }
    };
    window.addEventListener("worker-work-synced", synced);
    window.addEventListener("worker-work-queue-changed", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("online", flush);
    const timer = window.setInterval(() => void flush(), 15000);
    return () => { window.clearTimeout(initialSync); window.removeEventListener("worker-work-synced", synced); window.removeEventListener("worker-work-queue-changed", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("online", flush); window.clearInterval(timer); };
  }, [user.id, session, flush]);
  const workers = session.entries.filter(entry => entry.isSelected !== false && ["present", "late"].includes(entry.status));
  const eligible = workers.filter(entry => evidenceOnly ? selected.includes(entry.id) : action === "resume" ? workerWorkState(entry) === "paused" : action === "pause" ? workerWorkState(entry) === "working" : ["working", "paused"].includes(workerWorkState(entry)));
  function open(next: WorkerWorkOperation["eventType"]) {
    setEvidenceOnly(false);
    setAction(next); setReason(next === "pause" ? "rain" : next === "finish" ? "end_work" : "resume"); setEffectiveAt(localTime()); setError("");
    setSelected(workers.filter(entry => next === "resume" ? workerWorkState(entry) === "paused" : next === "pause" ? workerWorkState(entry) === "working" : ["working", "paused"].includes(workerWorkState(entry))).map(entry => entry.id));
    setBatchId(crypto.randomUUID()); setPhotos([]); setPhotoError("");
    if (next === "pause" || next === "finish") void gps.request();
  }
  const rainEvidence = action === "pause" || action === "finish" && reason === "rain";
  const lastRain = workerRainEvidence(session).at(-1);
  function supplementRain() {
    if (!lastRain) return;
    setEvidenceOnly(true); setBatchId(lastRain.batchId); setAction("pause"); setReason("rain");
    setEffectiveAt(new Intl.DateTimeFormat("sv-SE", {timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(new Date(lastRain.effectiveAt)).replace(" ","T"));
    setSelected(workers.filter(entry=>entry.workEvents?.some(event=>event.batchId===lastRain.batchId)).map(entry=>entry.id));
    setPhotos([]); setPhotoError(""); setError(""); void gps.request();
  }
  function close() {
    if (busy || photoBusy) return;
    if (photos.length && rainEvidence) setRecoverable({ batchId, ownerAccountId: user.id, sessionId: session.id, photos, draft: { eventType: action === "finish" ? "finish" : "pause", entryIds: selected, effectiveAt, reason, evidenceOnly } });
    gps.cancel(); setAction(undefined);
  }
  async function captureRain(file?: File) {
    if (!file || photoBusy || !batchId) return;
    setPhotoBusy(true); setPhotoError("");
    const capturedAt = new Date().toISOString();
    const current = gps.latest.current;
    const location = current && Date.now() - Date.parse(current.capturedAt) <= 15_000 ? current : undefined;
    void gps.request();
    try {
      const address = location ? `GPS ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} · ±${Math.round(location.accuracy)} m` : "Chưa có GPS · Cần đối soát";
      const image = await processAttendanceImage(file, { capturedAt, address, latitude: location?.latitude, longitude: location?.longitude, accuracy: location?.accuracy, capturedByName: user.displayName, capturedByUsername: user.username, label: `CHÂU TUẤN · NGHỈ MƯA · ${session.projectName}` });
      URL.revokeObjectURL(image.previewUrl);
      const photo: LocalWorkerPhoto = { id: crypto.randomUUID(), purpose: "rain_pause", workBatchId: batchId, photo: image.photo, thumbnail: image.thumbnail, width: image.width, height: image.height, capturedAt, address, latitude: location?.latitude, longitude: location?.longitude, accuracy: location?.accuracy, capturedByName: user.displayName, capturedByUsername: user.username, uploaded: false };
      const next = [...photos, photo];
      await saveWorkEvidence({ batchId, ownerAccountId: user.id, sessionId: session.id, photos: next, draft: { eventType: action === "finish" ? "finish" : "pause", entryIds: selected, effectiveAt, reason, evidenceOnly } });
      setPhotos(next);
    } catch (caught) { setPhotoError(caught instanceof Error ? caught.message : "Chưa lưu được ảnh minh chứng."); }
    finally { setPhotoBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || !selected.length || busy || photoBusy) return;
    setBusy(true); setError("");
    try {
      if (rainEvidence && !photos.length) throw new Error("Chụp ảnh minh chứng nghỉ mưa.");
      const operation: WorkerWorkOperation = { ownerAccountId: user.id, batchId, sessionId: session.id, eventType: action, entryIds: selected, effectiveAt: new Date(`${effectiveAt}+07:00`).toISOString(), reason, ...(rainEvidence ? { evidenceRequired: true, evidencePhotoIds: photos.map(photo => photo.id), evidenceOnly } : {}) };
      if (Date.parse(operation.effectiveAt) > Date.now() + 120000) throw new Error("Thời điểm không được ở tương lai.");
      if (rainEvidence) await saveWorkEvidence({ batchId, ownerAccountId: user.id, sessionId: session.id, photos });
      writeWorkerWorkQueue(user.id, [...readWorkerWorkQueue(user.id), operation]);
      setAction(undefined); setMessage(navigator.onLine ? "Đã lưu thao tác" : "Đã lưu trên thiết bị · Chờ đồng bộ");
      await flush();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể ghi nhận thao tác."); }
    finally { setBusy(false); }
  }
  async function discardPending() {
    setBusy(true);
    try {
      const actual = await readWorkerResponse<WorkerAttendanceSession>(await fetch(`/api/v1/worker-attendance/sessions/${session.id}`, { cache: "no-store" }));
      writeWorkerWorkQueue(user.id, readWorkerWorkQueue(user.id).filter(item => item.sessionId !== session.id));
      sessionRef.current = actual; onChangedRef.current(actual); setError(""); setMessage("Đã tải lại dữ liệu đã đồng bộ");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể tải lại dữ liệu."); }
    finally { setBusy(false); }
  }
  return <div className={styles.controls}>
    {recoverable?.draft ? <Button onClick={() => { const item = recoverable; if (!item?.draft) return; setBatchId(item.batchId); setAction(item.draft.eventType); setSelected(item.draft.entryIds); setEffectiveAt(item.draft.effectiveAt); setReason(item.draft.reason); setEvidenceOnly(Boolean(item.draft.evidenceOnly)); setPhotos(item.photos); setRecoverable(undefined); void gps.request(); }}>Tiếp tục ảnh mưa đã lưu</Button> : null}
    {lastRain ? <Button onClick={supplementRain}>Bổ sung ảnh mưa</Button> : null}
    <div className={styles.actions} aria-label="Thời gian làm việc công nhân"><Button disabled={!workers.some(entry => workerWorkState(entry) === "working")} leftIcon={<CloudRain size={17} aria-hidden="true"/>} onClick={() => open("pause")}>Tạm nghỉ mưa</Button><Button disabled={!workers.some(entry => workerWorkState(entry) === "paused")} leftIcon={<Play size={17} aria-hidden="true"/>} onClick={() => open("resume")}>Tiếp tục</Button><Button disabled={!workers.some(entry => ["working","paused"].includes(workerWorkState(entry)))} leftIcon={<Square size={16} aria-hidden="true"/>} onClick={() => open("finish")}>Kết thúc</Button></div>
    {pending ? <span role="status">{pending} thao tác chờ đồng bộ <Button variant="ghost" size="sm" disabled={busy} onClick={() => void flush()}>Đồng bộ</Button>{error ? <Button variant="ghost" size="sm" disabled={busy || !navigator.onLine} onClick={() => void discardPending()}>Hủy thao tác chờ</Button> : null}</span> : message ? <span role="status">{message}</span> : null}
    {error ? <span className="form-error" role="alert">{error}</span> : null}
    <Drawer title={evidenceOnly ? "Bổ sung ảnh mưa" : action ? labels[action] : "Thời gian làm việc"} open={Boolean(action)} onClose={close}><SectionedForm onSubmit={save}><FormFields>
      <Input readOnly={evidenceOnly} label="Thời điểm" type="datetime-local" step="1" value={effectiveAt} onChange={event => setEffectiveAt(event.target.value)} required/>
      {action === "finish" ? <Select label="Lý do" value={reason} onChange={event => setReason(event.target.value)} options={[{value:"end_work",label:"Kết thúc làm việc"},{value:"afternoon_off",label:"Nghỉ ca chiều"},{value:"personal",label:"Việc cá nhân"},{value:"rain",label:"Nghỉ do mưa"}]}/> : null}
      {rainEvidence ? <section aria-label="Minh chứng nghỉ mưa" className={styles.evidence}>
        <div className={styles.evidenceHeader}><strong>Ảnh minh chứng mưa</strong><span>{photos.length} ảnh</span></div>
        <div className={styles.evidenceHeader}><AttendanceLocationAddress accuracyMeters={gps.coordinates?.accuracy} latitude={gps.coordinates?.latitude} longitude={gps.coordinates?.longitude} emptyLabel={gps.busy ? "Đang lấy GPS" : "Chưa có GPS"}/><Button onClick={() => gps.busy ? gps.cancel() : void gps.request()}>{gps.busy ? "Dừng lấy vị trí" : gps.coordinates ? "Lấy lại vị trí" : "Cho phép định vị"}</Button></div>
        {gps.error ? <span role="status">{gps.error}</span> : null}
        <div className={styles.evidencePhotos}>{photos.map(photo => <WorkerEvidencePhoto key={photo.id} label="Ảnh minh chứng nghỉ mưa" photo={photo.photo}/>)}</div>
        <ImageUploader accept="image/*" capture="environment" disabled={busy || photoBusy || photos.length >= 5} error={photoError} label="Chụp ảnh minh chứng mưa" onFileChange={file => void captureRain(file)} uploading={photoBusy}/>
      </section> : null}
      <div className={styles.selection}><label><input type="checkbox" checked={Boolean(eligible.length) && selected.length === eligible.length} disabled={evidenceOnly} onChange={event => setSelected(event.target.checked ? eligible.map(entry => entry.id) : [])}/>Chọn tất cả <strong>{selected.length}/{eligible.length}</strong></label>{eligible.map(entry => <label key={entry.id}><input type="checkbox" checked={selected.includes(entry.id)} disabled={evidenceOnly} onChange={event => setSelected(current => event.target.checked ? [...current,entry.id] : current.filter(id => id !== entry.id))}/><span>{entry.workerName}</span><small>{stateLabels[workerWorkState(entry)]}</small></label>)}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </FormFields><FormActions><Button variant="secondary" disabled={busy || photoBusy} onClick={close}>Đóng</Button><Button type="submit" variant="primary" busy={busy} disabled={!selected.length || photoBusy || rainEvidence && !photos.length}>{evidenceOnly ? "Lưu ảnh minh chứng" : action ? labels[action] : "Lưu"} · {selected.length} người</Button></FormActions></SectionedForm></Drawer>
  </div>;
}
