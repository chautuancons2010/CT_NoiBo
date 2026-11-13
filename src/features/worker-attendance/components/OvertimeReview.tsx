"use client";
import { overtimeDurationLabel } from "../services/overtimeTimeEntry";
import { workerWorkIntervals } from "../services/workerWorkIntervals";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/FormControls";
import { FormActions, FormFields, SectionedForm } from "@/components/shared/FormLayout";
import { Drawer } from "@/components/shared/Overlays";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { canReviewOvertime, overtimeCheckpointLabels, overtimeStatusLabels } from "../services/overtimeRules";
import { readWorkerResponse } from "../client/workerAttendanceSync";
import type { WorkerAttendanceSession } from "../types/workerAttendanceTypes";
import styles from "./WorkerWorkControls.module.css";

export function OvertimeReview({ session, onChanged }: { session: WorkerAttendanceSession; onChanged: (session: WorkerAttendanceSession) => void }) {
  const user = useCurrentUser();
  const [decision,setDecision] = useState<"confirmed"|"rejected">();
  const [reason,setReason] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  if (session.sessionType !== "overtime") return null;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!decision || busy) return; setBusy(true); setError("");
    try { const updated = await readWorkerResponse<WorkerAttendanceSession>(await fetch(`/api/v1/worker-attendance/sessions/${session.id}/overtime-review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:session.version,decision,reason})})); onChanged(updated); setDecision(undefined); setReason(""); }
    catch(caught) { setError(caught instanceof Error ? caught.message : "Không thể xác nhận tăng ca."); }
    finally { setBusy(false); }
  }
  return <section className={styles.controls} aria-label="Tăng ca"><div className={styles.actions}><StatusBadge tone={session.overtimeStatus === "confirmed" ? "success" : "warning"}>{overtimeStatusLabels[session.overtimeStatus ?? "recording"]}</StatusBadge><strong>{session.overtimeDayType === "rest_day" ? "Tăng ca ngày nghỉ" : session.overtimeDayType === "holiday" ? "Tăng ca ngày lễ" : "Tăng ca ngày thường"}</strong></div>{session.overtimeRecordingMode === "time_entry" ? <div className={styles.actions}>{session.entries.filter(entry=>entry.isSelected).map(entry=><span key={entry.id}>{entry.workerName} · {entry.checkedInAt&&new Date(entry.checkedInAt).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Ho_Chi_Minh"})}–{entry.checkedOutAt&&new Date(entry.checkedOutAt).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Ho_Chi_Minh"})} · {overtimeDurationLabel(workerWorkIntervals(entry).reduce((sum,interval)=>sum+(Date.parse(interval.checkedOutAt)-Date.parse(interval.checkedInAt))/60000,0))}</span>)}</div> : <div className={styles.actions}>{(["start","middle","end"] as const).map(checkpoint => <StatusBadge key={checkpoint} tone={session.photos.some(photo => photo.checkpoint === checkpoint) ? "success" : "neutral"}>{overtimeCheckpointLabels[checkpoint]} · {session.photos.filter(photo => photo.checkpoint === checkpoint).length} ảnh</StatusBadge>)}</div>}{session.overtimeReviewNote ? <span>{session.overtimeReviewNote}</span> : null}{canReviewOvertime(user) && session.submittedAt && session.overtimeStatus !== "confirmed" ? <div className={styles.actions}><Button variant="primary" onClick={() => setDecision("confirmed")}>Xác nhận giờ tăng ca</Button><Button onClick={() => setDecision("rejected")}>Không xác nhận</Button></div> : null}<Drawer open={Boolean(decision)} title={decision === "confirmed" ? "Xác nhận giờ tăng ca" : "Không xác nhận tăng ca"} onClose={() => { if(!busy)setDecision(undefined); }}><SectionedForm onSubmit={save}><FormFields><Input label="Ghi nhận đối chiếu" value={reason} onChange={event=>setReason(event.target.value)} minLength={3} maxLength={500} required/>{error?<p role="alert" className="form-error">{error}</p>:null}</FormFields><FormActions><Button disabled={busy} onClick={()=>setDecision(undefined)}>Hủy</Button><Button busy={busy} variant="primary" type="submit">Lưu xác nhận</Button></FormActions></SectionedForm></Drawer></section>;
}
