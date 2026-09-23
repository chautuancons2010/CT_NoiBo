"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { BackLink } from "@/components/shared/BackLink";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Input, Select } from "@/components/shared/FormControls";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fetchWorkerSession, readWorkerResponse } from "@/features/worker-attendance/client/workerAttendanceSync";
import { countWorkerAttendance } from "@/features/worker-attendance/services/workerAttendanceRules";
import type { WorkerAttendanceEntry, WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

const labels: Record<string, string> = { unconfirmed: "Chưa xác nhận", present: "Có mặt", absent: "Vắng", leave: "Nghỉ phép", late: "Đi trễ", transferred: "Điều chuyển", draft: "Nháp", in_progress: "Đang làm", submitted: "Đã gửi", locked: "Đã khóa", needs_review: "Cần rà soát" };

export function WorkerAttendanceSessionDetail({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<WorkerAttendanceSession>();
  const [selectedPhoto, setSelectedPhoto] = useState<string>();
  const [editingEntry, setEditingEntry] = useState<string>();
  const [closingDay, setClosingDay] = useState(false);
  const [dayChanges, setDayChanges] = useState<Record<string, { dayException: WorkerAttendanceEntry["dayException"]; exceptionTime?: string }>>({});
  const [message, setMessage] = useState("");
  const load = useCallback(() => fetchWorkerSession(sessionId).then(setSession).catch((caught) => setMessage(caught instanceof Error ? caught.message : "Không thể tải phiên.")), [sessionId]);
  useEffect(() => { void load(); }, [load]);
  useDomainReconciliation("worker-attendance", load);
  const counts = useMemo(() => countWorkerAttendance(session?.entries ?? []), [session]);
  const images = useMemo(() => session?.photos.map((photo, index) => ({ id: photo.id, src: `/api/v1/worker-attendance/photos/${photo.id}`, alt: `Ảnh điểm danh ${index + 1}`, title: `${session.projectName} · Ảnh ${index + 1}`, metadata: { "Thời gian": new Date(photo.capturedAt).toLocaleString("vi-VN") } })) ?? [], [session]);

  async function adjust(formData: FormData) {
    if (!session || !editingEntry) return;
    setMessage("");
    try {
      const updated = await readWorkerResponse<WorkerAttendanceSession>(await fetch(`/api/v1/worker-attendance/sessions/${session.id}/adjustments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: session.version, entryId: editingEntry, status: formData.get("status"), reason: formData.get("reason") }) }));
      setSession(updated); setEditingEntry(undefined); setMessage("Đã lưu điều chỉnh.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Không thể điều chỉnh."); }
  }

  function openDayClose() {
    if (!session) return;
    setDayChanges(Object.fromEntries(session.entries.filter((entry) => entry.status === "present" || entry.status === "late").map((entry) => [entry.id, { dayException: entry.dayException, exceptionTime: entry.exceptionTime }])));
    setClosingDay(true);
  }

  async function closeDay(formData: FormData) {
    if (!session) return;
    setMessage("");
    try {
      const updated = await readWorkerResponse<WorkerAttendanceSession>(await fetch(`/api/v1/worker-attendance/sessions/${session.id}/close-day`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: session.version, reason: formData.get("reason"), entries: Object.entries(dayChanges).map(([id, value]) => ({ id, dayException: value.dayException, exceptionTime: value.exceptionTime || null })) }) }));
      setSession(updated); setClosingDay(false); setMessage("Đã chốt ngày.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Không thể chốt ngày."); }
  }

  if (!session) return <Card>{message || "Đang tải"}</Card>;
  return <div className="worker-detail">
    <BackLink href="/worker-attendance" />
    <div className="worker-wizard__title"><div><h1>{session.projectName}</h1><span>{session.worksiteName} · {new Date(`${session.date}T00:00:00`).toLocaleDateString("vi-VN")}</span></div><StatusBadge status={session.status}>{labels[session.status]}</StatusBadge></div>
    {session.dayClosedAt ? <div className="worker-toolbar"><StatusBadge tone="success">Đã chốt ngày · {new Date(session.dayClosedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</StatusBadge></div> : session.submittedAt ? <div className="action-row"><Button onClick={openDayClose} variant="primary">Chốt ngày</Button></div> : null}
    {message ? <div className="form-message form-message--info">{message}</div> : null}
    <div className="worker-review-grid"><span>Tổng<strong>{counts.total}</strong></span><span>Có mặt<strong>{counts.present}</strong></span><span>Đi trễ<strong>{counts.late}</strong></span><span>Vắng / nghỉ<strong>{counts.absent + counts.leave}</strong></span><span>Ảnh<strong>{session.photos.length}</strong></span><span>Vị trí<strong>{session.geofenceStatus === "valid" ? "Hợp lệ" : session.geofenceStatus === "not_required" ? "Không yêu cầu" : "Chưa hợp lệ"}</strong></span></div>
    <Card><div className="worker-detail-table"><div className="worker-detail-table__head"><span>Công nhân</span><span>Trạng thái</span><span></span></div>{session.entries.map((entry) => <div className="worker-detail-table__row" key={entry.id}><span><strong>{entry.workerName}</strong><small>{entry.employeeCode}</small></span><StatusBadge status={entry.status}>{labels[entry.status]}</StatusBadge><Button onClick={() => setEditingEntry(entry.id)} size="sm" variant="ghost">Điều chỉnh</Button></div>)}</div></Card>
    {editingEntry ? <Card><form action={adjust} className="worker-adjust-form"><Select label="Trạng thái" name="status" options={[{ value: "present", label: "Có mặt" }, { value: "late", label: "Đi trễ" }, { value: "absent", label: "Vắng" }, { value: "leave", label: "Nghỉ phép" }, { value: "transferred", label: "Điều chuyển" }]} required /><Input label="Lý do điều chỉnh" minLength={3} name="reason" required /><div className="action-row"><Button onClick={() => setEditingEntry(undefined)}>Hủy</Button><Button type="submit" variant="primary">Lưu</Button></div></form></Card> : null}
    {closingDay ? <Card><form action={closeDay} className="worker-day-close"><h3 className="section-title">Ngoại lệ cuối ngày</h3>{Object.entries(dayChanges).map(([id, value]) => { const entry = session.entries.find((item) => item.id === id)!; return <div className="worker-day-close__row" key={id}><span><strong>{entry.workerName}</strong><small>{entry.employeeCode}</small></span><Select label="Ngoại lệ" onChange={(event) => setDayChanges((current) => ({ ...current, [id]: { ...current[id], dayException: event.target.value as WorkerAttendanceEntry["dayException"] } }))} options={[{ value: "none", label: "Không có" }, { value: "early_leave", label: "Về sớm" }, { value: "transferred", label: "Điều chuyển" }, { value: "half_day", label: "Nửa ngày" }, { value: "overtime", label: "Làm thêm" }, { value: "left_worksite", label: "Rời công trường" }]} value={value.dayException} /><Input label="Thời gian" onChange={(event) => setDayChanges((current) => ({ ...current, [id]: { ...current[id], exceptionTime: event.target.value } }))} type="time" value={value.exceptionTime ?? ""} /></div>; })}<Input defaultValue="Chốt ngày" label="Lý do" minLength={3} name="reason" required /><div className="action-row"><Button onClick={() => setClosingDay(false)}>Hủy</Button><Button type="submit" variant="primary">Xác nhận chốt ngày</Button></div></form></Card> : null}
    {session.photos.length ? <Card><div className="worker-photo-grid">{session.photos.map((photo, index) => <button className="worker-photo-button" key={photo.id} onClick={() => setSelectedPhoto(photo.id)} type="button"><Image alt={`Ảnh điểm danh ${index + 1}`} height={240} src={`/api/v1/worker-attendance/photos/${photo.id}?size=thumbnail`} unoptimized width={320} /></button>)}</div></Card> : null}
    {session.workNote ? <Card><div className="panel-header"><h3 className="section-title">Nội dung công việc</h3>{session.submittedAt ? <Link href={`/projects/${session.projectId}/updates/new?worksiteId=${session.worksiteId}&attendanceSessionId=${session.id}&content=${encodeURIComponent(session.workNote)}`}><Button variant="primary">Tạo cập nhật dự án</Button></Link> : null}</div><p className="worker-note">{session.workNote}</p></Card> : null}
    {session.adjustments.length ? <Card><h3 className="section-title">Lịch sử điều chỉnh</h3><ol className="worker-adjustments">{session.adjustments.map((item) => <li key={item.id}><span>{new Date(item.createdAt).toLocaleString("vi-VN")}</span><strong>{item.reason}</strong></li>)}</ol></Card> : null}
    <ImageLightbox images={images} initialImageId={selectedPhoto} onClose={() => setSelectedPhoto(undefined)} open={Boolean(selectedPhoto)} />
  </div>;
}
