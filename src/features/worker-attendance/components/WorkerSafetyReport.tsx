"use client";

import { Check, ClipboardCopy, HardHat, Pencil, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/shared/FormControls";
import type { WorkerAttendanceSession, WorkerSafetyReport as SafetyReport } from "../types/workerAttendanceTypes";
import { formatWorkerSafetyReport, manpowerCounts, validateWorkerSafetyReport } from "../services/workerSafetyReport";
import styles from "./WorkerSafetyReport.module.css";

export function WorkerSafetyReportEditor({ session, disabled, onChange }: { session: WorkerAttendanceSession; disabled: boolean; onChange: (report: SafetyReport, workNote?: string) => void }) {
  const [editingBriefing, setEditingBriefing] = useState(false);
  const report = session.safetyReport;
  if (!report) return null;
  const counts = manpowerCounts(session);
  const briefingConfirmed = report.briefing.filter(item => item.checked && item.content.trim()).length;
  return <div className={styles.editor}>
    <div className={styles.manpower}><span className={styles.icon}><HardHat aria-hidden="true" size={23} /></span><div><span>Nhân lực nhà thầu {report.contractorName}</span><strong>{counts.total} <small>người</small></strong></div><span className={styles.breakdown}>{counts.workers} CN · {counts.supervisors} GS</span></div>
    <div className={styles.fields}><Input disabled={disabled} label="Số giám sát" max={100} min={1} onChange={event => onChange({ ...report, supervisorCount: Math.min(100, Math.max(1, Number(event.target.value) || 1)) })} type="number" value={report.supervisorCount} /><Input disabled={disabled} label="Khu vực làm việc" maxLength={200} onChange={event => onChange({ ...report, workArea: event.target.value })} placeholder="VD: SC05" required value={report.workArea} /></div>
    <fieldset className={styles.briefing}><legend><ShieldCheck aria-hidden="true" size={17} />Phổ biến an toàn, 5S, quy định</legend><Button disabled={disabled} leftIcon={<Pencil aria-hidden="true" size={14} />} onClick={() => setEditingBriefing(value => !value)} size="sm" variant="ghost">{editingBriefing ? "Xong" : "Sửa nội dung"}</Button>{report.briefing.map((item, index) => <div className={styles.briefingItem} key={index}>{editingBriefing ? <Textarea disabled={disabled} label={`Nội dung an toàn ${index + 1}`} maxLength={500} onChange={event => onChange({ ...report, briefing: report.briefing.map((current, position) => position === index ? { content: event.target.value, checked: false } : current) })} rows={2} value={item.content} /> : null}<Checkbox checked={item.checked} disabled={disabled || !item.content.trim()} label={editingBriefing ? `Đã phổ biến nội dung ${index + 1}` : item.content} onChange={event => onChange({ ...report, briefing: report.briefing.map((current, position) => position === index ? { ...current, checked: event.target.checked } : current) })} /></div>)}</fieldset>
    <span className={styles.briefingProgress} role="status">Đã phổ biến {briefingConfirmed}/{report.briefing.length} nội dung</span>
    <Textarea disabled={disabled} label="Nội dung công việc" maxLength={1500} onChange={event => onChange(report, event.target.value)} placeholder="VD: Thay bu lông, sơn cẩu" required rows={2} value={session.workNote ?? ""} />
    <Select disabled={disabled} label="Tình trạng sức khỏe nhân viên" onChange={event => onChange({ ...report, healthStatus: event.target.value })} options={[{ value: "Tốt", label: "Tốt" }, { value: "Cần theo dõi", label: "Cần theo dõi" }, { value: "Có người không đủ điều kiện làm việc", label: "Có người không đủ điều kiện làm việc" }]} required value={report.healthStatus} />
  </div>;
}

export function WorkerSafetyReportView({ session, preview = false }: { session: WorkerAttendanceSession; preview?: boolean }) {
  const [copyStatus, setCopyStatus] = useState("");
  const text = formatWorkerSafetyReport(session);
  if (!text) return null;
  const confirmed = session.safetyConfirmed && !validateWorkerSafetyReport(session.safetyReport, session.workNote).length && session.checklist.every(item => !item.required || session.checklistResponses.some(response => response.itemId === item.id && response.checked));
  const body = <><div className={styles.reportHeader}><span>{confirmed ? <Check aria-hidden="true" size={16} /> : null}{confirmed ? "Đã xác nhận" : "Chưa xác nhận"}</span><Button disabled={!confirmed} leftIcon={<ClipboardCopy aria-hidden="true" size={15} />} onClick={() => void navigator.clipboard.writeText(text).then(() => setCopyStatus("Đã sao chép")).catch(() => setCopyStatus("Chưa sao chép được"))} size="sm">Sao chép báo cáo</Button></div><pre className={styles.reportText}>{text}</pre>{copyStatus ? <span className={styles.copyStatus} role="status">{copyStatus}</span> : null}</>;
  return preview ? <details className={styles.preview}><summary>Xem báo cáo nhân lực</summary>{body}</details> : <section aria-label="Báo cáo nhân lực nhà thầu" className={styles.report}>{body}</section>;
}
