"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/shared/Button";
import { Input, SearchInput } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { useAttendanceLocation } from "@/features/attendance/client/useAttendanceLocation";
import { workerOvertimeTimeEntrySchema } from "../schemas/workerAttendanceSchemas";
import { enqueueWorkerOvertime, readWorkerOvertimeQueue, syncWorkerOvertimeQueue } from "../client/workerOvertimeQueue";
import { overtimeDurationLabel, overtimeTimeRange } from "../services/overtimeTimeEntry";
import type { WorkerAttendanceSession, WorkerAttendanceTask } from "../types/workerAttendanceTypes";
import styles from "./WorkerOvertimeEntry.module.css";

type Task = Pick<WorkerAttendanceTask, "projectId"|"projectName"|"worksiteId"|"worksiteName"|"date"|"shiftCode"|"shiftName"|"roster">;
export function WorkerOvertimeEntry({ task, initialWorkerIds = [], onSaved }: { task: Task; initialWorkerIds?: string[]; onSaved: (session: WorkerAttendanceSession) => void }) {
  const user = useCurrentUser();
  const gps = useAttendanceLocation();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [date, setDate] = useState(task.date), [start, setStart] = useState(""), [end, setEnd] = useState("");
  const [nextDay, setNextDay] = useState(false), [hasBreak, setHasBreak] = useState(false);
  const [pause, setPause] = useState(""), [resume, setResume] = useState("");
  const [selected, setSelected] = useState(initialWorkerIds), [query, setQuery] = useState("");
  const [consent, setConsent] = useState(false), [note, setNote] = useState(""), [queued, setQueued] = useState(0);
  const [awaitingSend, setAwaitingSend] = useState(false);
  const clientId = useRef<string | undefined>(undefined);
  const savedCallback = useRef(onSaved); useEffect(() => { savedCallback.current = onSaved; }, [onSaved]);
  useEffect(() => {
    function refresh() { try { setQueued(readWorkerOvertimeQueue(user.id).filter(row => row.worksiteId === task.worksiteId && row.shiftCode === task.shiftCode).length); } catch { setError("Không đọc được tăng ca trên thiết bị."); } }
    function synced(event: Event) {
      const session = (event as CustomEvent<WorkerAttendanceSession>).detail;
      refresh();
      if (session.clientSessionId === clientId.current) { clientId.current = undefined; setAwaitingSend(false); setOpen(false); savedCallback.current(session); }
    }
    refresh(); window.addEventListener("worker-overtime-synced", synced); window.addEventListener("worker-overtime-queue-changed", refresh);
    return () => { window.removeEventListener("worker-overtime-synced", synced); window.removeEventListener("worker-overtime-queue-changed", refresh); };
  }, [user.id, task.worksiteId, task.shiftCode]);
  const range = start && end ? overtimeTimeRange(date, start, end, nextDay) : undefined;
  const breakDate = (time: string) => {
    const day = nextDay && time < start ? new Date(Date.parse(`${date}T12:00:00Z`) + 86400_000).toISOString().slice(0, 10) : date;
    return `${day}T${time}:00+07:00`;
  };
  const breakMinutes = hasBreak && pause && resume ? Math.max(0, (Date.parse(breakDate(resume)) - Date.parse(breakDate(pause))) / 60_000) : 0;
  const visible = task.roster.filter(worker => `${worker.workerName} ${worker.employeeCode}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  const allVisible = visible.length > 0 && visible.every(worker => selected.includes(worker.workerId));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setError("");
    if (awaitingSend) {
      setBusy(true);
      try { await syncWorkerOvertimeQueue(user.id); } catch (caught) { setError(caught instanceof Error ? caught.message : "Chưa gửi được tăng ca. Đã lưu trên thiết bị."); }
      finally { setBusy(false); }
      return;
    }
    const result = workerOvertimeTimeEntrySchema.safeParse({ ownerAccountId: user.id, clientSessionId: clientId.current ?? crypto.randomUUID(), projectId: task.projectId, worksiteId: task.worksiteId, shiftCode: task.shiftCode, date, capturedAtClient: new Date().toISOString(), workerIds: selected, checkedInAt: range?.checkedInAt, checkedOutAt: range?.checkedOutAt, ...(gps.coordinates ? { location: { latitude: gps.coordinates.latitude, longitude: gps.coordinates.longitude, accuracy: gps.coordinates.accuracy } } : {}), ...(hasBreak ? { breakStartedAt: pause ? breakDate(pause) : undefined, breakEndedAt: resume ? breakDate(resume) : undefined } : {}), consentConfirmed: consent, note });
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Kiểm tra lại giờ tăng ca."); return; }
    setBusy(true);
    try {
      enqueueWorkerOvertime(result.data); clientId.current = result.data.clientSessionId; setAwaitingSend(true);
      if (navigator.onLine) await syncWorkerOvertimeQueue(user.id);
      if (!navigator.onLine) { setOpen(false); clientId.current = undefined; setAwaitingSend(false); setStart(""); setEnd(""); setConsent(false); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Chưa gửi được tăng ca. Đã lưu trên thiết bị."); }
    finally { setBusy(false); }
  }
  return <div className={styles.pending}>
    <Button variant="primary" size="lg" onClick={() => { setError(""); setOpen(true); void gps.request(); }}>Ghi tăng ca</Button>
    {queued ? <span role="status">{queued} lượt tăng ca chờ gửi</span> : null}
    <Drawer open={open} title="Ghi tăng ca" onClose={() => { if (!busy) setOpen(false); }}>
      <form className={styles.form} onSubmit={save}>
        <div className={styles.context}><strong>{task.projectName}</strong><span>{task.shiftName}</span></div>
        <div className={styles.context}><Button onClick={() => { if (gps.busy) gps.cancel(); else void gps.request(); }}>{gps.busy ? "Dừng lấy vị trí" : "Lấy lại vị trí"}</Button>{gps.coordinates ? <span>{gps.coordinates.latitude.toFixed(6)}, {gps.coordinates.longitude.toFixed(6)} · GPS ± {Math.round(gps.coordinates.accuracy)} m</span> : gps.error ? <span role="status">{gps.error}</span> : null}</div>
        <fieldset className="form-fieldset" disabled={busy || awaitingSend}>
          <Input label="Ngày tăng ca" type="date" value={date} onChange={event => setDate(event.target.value)} required />
          <div className={styles.times}><Input label="Bắt đầu" type="time" value={start} onChange={event => setStart(event.target.value)} required /><Input label="Kết thúc" type="time" value={end} onChange={event => setEnd(event.target.value)} required /></div>
          <label className={styles.toggle}><input type="checkbox" checked={nextDay} onChange={event => setNextDay(event.target.checked)} />Kết thúc ngày hôm sau</label>
          <label className={styles.toggle}><input type="checkbox" checked={hasBreak} onChange={event => setHasBreak(event.target.checked)} />Có nghỉ giữa giờ</label>
          {hasBreak ? <div className={styles.times}><Input label="Bắt đầu nghỉ" type="time" value={pause} onChange={event => setPause(event.target.value)} required /><Input label="Làm tiếp" type="time" value={resume} onChange={event => setResume(event.target.value)} required /></div> : null}
          <div className={styles.summary}><span>Tăng ca mỗi người</span><strong>{overtimeDurationLabel((range?.minutes ?? 0) - breakMinutes)}</strong></div>
          <div className={styles.selection}><SearchInput label="Tìm công nhân tăng ca" value={query} onChange={event => setQuery(event.target.value)} /><div className={styles.workers}>
            <label className={styles.worker}><input type="checkbox" checked={allVisible} onChange={event => setSelected(current => event.target.checked ? [...new Set([...current, ...visible.map(worker => worker.workerId)])] : current.filter(id => !visible.some(worker => worker.workerId === id)))} /><span>Chọn / bỏ chọn tất cả</span><small>{selected.length} người</small></label>
            {visible.map(worker => <label className={styles.worker} key={worker.workerId}><input type="checkbox" checked={selected.includes(worker.workerId)} onChange={event => setSelected(current => event.target.checked ? [...current, worker.workerId] : current.filter(id => id !== worker.workerId))} /><span>{worker.workerName}</span><small>{worker.employeeCode}</small></label>)}
          </div></div>
          <label className={styles.toggle}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Đã xác nhận người tham gia đồng ý tăng ca</label>
          <Input label="Ghi chú" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} />
        </fieldset>
        {awaitingSend ? <p role="status">Đã lưu trên thiết bị · Chờ gửi</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className={styles.footer}><Button disabled={busy} onClick={() => setOpen(false)}>Đóng</Button><Button busy={busy} type="submit" variant="primary">{awaitingSend ? "Thử gửi lại" : "Lưu tăng ca"}</Button></div>
      </form>
    </Drawer>
  </div>;
}
