"use client";

import { ArrowUpRight, CalendarDays, ClipboardCheck, HardHat, MapPin, RefreshCw, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, IconButton } from "@/components/shared/Button";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { ListWorkspace } from "@/components/shared/PageLayouts";
import { FilterBar } from "@/components/shared/FilterBar";
import { Input, SearchInput, Select } from "@/components/shared/FormControls";
import { AttendanceExport } from "@/features/attendance/components/AttendanceExport";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { cacheWorkerTasks, getLatestCachedWorkerTasks, listWorkerDrafts, saveWorkerDraft, type CachedWorkerTasks, type WorkerLocalDraft } from "@/features/worker-attendance/client/workerDraftStore";
import { readWorkerResponse } from "@/features/worker-attendance/client/workerAttendanceSync";
import type { WorkerAttendanceSession, WorkerAttendanceTask } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import styles from "./WorkerAttendanceWorkspace.module.css";
import { createWorkerSafetyReport } from "../services/workerSafetyReport";
import { formatBusinessDate, getBusinessDateKey } from "@/lib/time/timezone";
import { can } from "@/lib/auth/permissions";
import { WorkerSessionEvidenceCards } from "./WorkerSessionEvidenceCards";

const sessionLabels: Record<string, string> = { draft: "Nháp", in_progress: "Đang điểm danh", submitted: "Đã điểm danh", locked: "Đã khóa", needs_review: "Cần rà soát" };
const sessionTones: Record<string, "neutral" | "info" | "success" | "warning"> = { draft: "neutral", in_progress: "info", submitted: "success", locked: "neutral", needs_review: "warning" };

function makeLocalSession(task: WorkerAttendanceTask, clientSessionId: string, location?: WorkerLocalDraft["location"]): WorkerAttendanceSession {
  const now = new Date().toISOString();
  return {
    id: `local-${clientSessionId}`, clientSessionId, projectId: task.projectId, projectName: task.projectName,
    worksiteId: task.worksiteId, worksiteName: task.worksiteName, date: task.date, shiftCode: task.shiftCode,
    shiftName: task.shiftName, sessionType: "morning", supervisorEmployeeId: "local", supervisorName: "",
    startedAt: now, capturedAtClient: now, geofenceStatus: location ? location.accuracy > (task.allowedAccuracyThresholdMeters ?? 100) ? "accuracy_low" : "valid" : task.gpsRequired === false ? "not_required" : "unavailable", latitude: location?.latitude, longitude: location?.longitude, accuracyMeters: location?.accuracy, status: "in_progress", syncStatus: "local_pending",
    photoStatus: "pending_upload", version: 1, selectionMode: true, safetyConfirmed: false, safetyReport: createWorkerSafetyReport(), minimumPhotos: 1, photos: [], adjustments: [], checklist: task.checklist, checklistResponses: [],
    entries: task.roster.map((worker) => ({ id: `local-${worker.workerId}`, sessionId: `local-${clientSessionId}`, workerId: worker.workerId, employeeCode: worker.employeeCode, workerName: worker.workerName, assignmentRole: worker.assignmentRole, isSelected: false, status: worker.approvedLeave ? "leave" : "unconfirmed", exceptionReason: worker.approvedLeave ? "approved_leave" : undefined, note: worker.approvedLeave ? `${worker.approvedLeave.leaveTypeName} · ${worker.approvedLeave.requestNumber}` : undefined, dayException: "none", isUnplanned: false }))
  };
}

export function WorkerAttendanceToday({ projectId, worksiteId, embedded = false }: { projectId?: string; worksiteId?: string; embedded?: boolean }) {
  const user = useCurrentUser();
  const canCreate = can(user.permissions, "worker_attendance.create");
  const router = useRouter();
  const [data, setData] = useState<CachedWorkerTasks>();
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<string>();
  const [selectedTaskKey, setSelectedTaskKey] = useState("");
  const [query, setQuery] = useState("");
  const [localDrafts, setLocalDrafts] = useState<WorkerLocalDraft[]>([]);
  const loadingRequest = useRef<Promise<void> | null>(null);
  const date = getBusinessDateKey();
  const visibleTasks = useMemo(() => data?.tasks.filter((task) => (!projectId || task.projectId === projectId) && (!worksiteId || task.worksiteId === worksiteId) && `${task.projectName} ${task.worksiteName} ${task.shiftName}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))) ?? [], [data?.tasks, projectId, worksiteId, query]);
  const selectedTask = visibleTasks.find((task) => `${task.worksiteId}:${task.shiftCode}` === selectedTaskKey);

  const load = useCallback(() => {
    if (loadingRequest.current) return loadingRequest.current;
    const pending = (async () => {
    setLoading(true); setError("");
    void listWorkerDrafts().then(setLocalDrafts).catch(() => undefined);
    try {
      const result = await readWorkerResponse<Omit<CachedWorkerTasks, "key" | "date" | "cachedAt">>(await fetch(`/api/v1/worker-attendance/today?date=${date}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) }));
      const cache = { ...result, key: `${result.accountId}:${date}`, date, cachedAt: new Date().toISOString() };
      setData(cache); setOffline(false);
      void cacheWorkerTasks(cache).catch(() => undefined);
    } catch (caught) {
      const cached = await getLatestCachedWorkerTasks(date);
      if (cached && cached.accountId === user.id) { setData(cached); setOffline(true); }
      else setError(caught instanceof Error ? caught.message : "Không thể tải lịch điểm danh.");
    } finally { setLoading(false); }
    })();
    loadingRequest.current = pending;
    void pending.finally(() => { if (loadingRequest.current === pending) loadingRequest.current = null; }).catch(() => undefined);
    return pending;
  }, [date, user.id]);

  useEffect(() => {
    // Initial client-side data load.
    void load();
  }, [load]);
  useDomainReconciliation("worker-attendance", load);
  useDomainReconciliation("attendance", load);
  useDomainReconciliation("timesheets", load);

  async function start(task: WorkerAttendanceTask) {
    if (task.existingSessionId && (!canCreate || !["submitted", "locked", "needs_review"].includes(task.existingStatus ?? ""))) {
      router.push(!canCreate || task.existingStatus === "submitted" || task.existingStatus === "locked" || task.existingStatus === "needs_review" ? `/worker-attendance/sessions/${task.existingSessionId}` : `/worker-attendance/sessions/${task.existingSessionId}/roster`);
      return;
    }
    if (!canCreate) return;
    if (data?.personalAttendanceReady === false) { router.push("/attendance/quick"); return; }
    const resumable = localDrafts.find((item) => item.ownerAccountId === data?.accountId && item.session.projectId === task.projectId && item.session.worksiteId === task.worksiteId && item.session.date === task.date && item.session.shiftCode === task.shiftCode);
    if (resumable) { router.push(`/worker-attendance/sessions/${resumable.id}/roster`); return; }
    setStarting(`${task.worksiteId}:${task.shiftCode}`);
    setError("");
    const clientSessionId = crypto.randomUUID();
    const localSession = { ...makeLocalSession(task, clientSessionId), minimumPhotos: Math.max(1, data?.policy.minimumPhotos ?? 1) };
    const draft: WorkerLocalDraft = { id: localSession.id, ownerAccountId: data!.accountId, clientSessionId, session: localSession, photos: [], pendingSubmit: false, retryCount: 0, updatedAt: new Date().toISOString() };
    try { await saveWorkerDraft(draft); }
    catch { setStarting(undefined); setError("Không thể lưu điểm danh trên thiết bị. Vui lòng thử lại."); return; }
    router.push(`/worker-attendance/sessions/${localSession.id}/roster`);
    setStarting(undefined);
  }

  if (loading && !data) return <LoadingState title="Đang mở lịch điểm danh" />;
  if (error && !data) return <ErrorState description={error} action={<Button onClick={() => void load()}>Thử lại</Button>} />;
  const finished = visibleTasks.filter(task => task.existingStatus === "submitted" || task.existingStatus === "locked").length;
  const deviceDrafts = localDrafts.filter(draft => draft.ownerAccountId === data?.accountId && draft.session.date === date && (!projectId || draft.session.projectId === projectId) && (!worksiteId || draft.session.worksiteId === worksiteId));
  return <div className={styles.home} aria-busy={loading}>
    <div className={styles.todayHeader}>
      <time dateTime={date}><CalendarDays aria-hidden="true" size={17} />{formatBusinessDate(date)}</time>
      <div>{offline || error ? <StatusBadge tone="warning">Dữ liệu trên máy</StatusBadge> : <span className={styles.updatedAt}>Cập nhật {data?.cachedAt ? new Date(data.cachedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "—"}</span>}<IconButton aria-busy={loading} disabled={loading} label="Cập nhật lịch điểm danh" onClick={() => void load()}><RefreshCw aria-hidden="true" size={16} /></IconButton></div>
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {canCreate && data?.personalAttendanceReady === false ? <Link className="button button--primary button--lg" href="/attendance/quick">Chụp ảnh chấm công cá nhân</Link> : null}
    {!embedded ? <><ol className={styles.flowSteps} aria-label="Các bước chấm công"><li aria-current="step"><span>1</span>Gói</li><li><span>2</span>Công nhân</li><li><span>3</span>An toàn</li><li><span>4</span>Chụp ảnh</li></ol>
    <dl className={styles.summary}><div><dt>Gói / ca làm</dt><dd>{visibleTasks.length}</dd></div><div><dt>Đã điểm danh</dt><dd>{finished}</dd></div><div><dt>Bản nháp trên máy</dt><dd>{deviceDrafts.length}</dd></div></dl>
    <SearchInput aria-label="Tìm gói chấm công" placeholder="Tên gói, công trường, ca làm" value={query} onChange={event => setQuery(event.target.value)} /></> : null}
    <div className={styles.taskGrid}>
      {visibleTasks.map(task => {
        const hasLocalDraft = deviceDrafts.some(item => item.session.projectId === task.projectId && item.session.worksiteId === task.worksiteId && item.session.date === task.date && item.session.shiftCode === task.shiftCode);
        const taskKey = `${task.worksiteId}:${task.shiftCode}`;
        return <article className={styles.task} data-selected={selectedTaskKey === taskKey} key={`${task.projectId}-${task.worksiteId}-${task.shiftCode}`}>
          <header>
            {canCreate ? <input aria-label={`Chọn gói ${task.projectName} · ${task.worksiteName} · ${task.shiftName}`} checked={selectedTaskKey === taskKey} className={styles.packageRadio} disabled={Boolean(starting)} id={`attendance-package-${taskKey}`} name="attendance-package" onChange={() => setSelectedTaskKey(taskKey)} type="radio" /> : <span className={styles.taskIcon}><HardHat aria-hidden="true" size={22} /></span>}
            <div><h2>{canCreate ? <label htmlFor={`attendance-package-${taskKey}`}>{task.projectName}</label> : task.projectName}</h2><span><MapPin aria-hidden="true" size={14} />{task.worksiteName}</span></div>
          </header>
          <div className={styles.taskStatus}><StatusBadge tone={task.existingStatus ? sessionTones[task.existingStatus] : hasLocalDraft ? "warning" : "neutral"}>{task.existingStatus ? sessionLabels[task.existingStatus] : hasLocalDraft ? "Bản nháp" : "Chưa điểm danh"}</StatusBadge></div>
          <dl className={styles.taskFacts}><div><dt><Users aria-hidden="true" size={16} />Công nhân dự kiến</dt><dd>{task.expectedWorkers}</dd></div><div><dt><ClipboardCheck aria-hidden="true" size={16} />Ca làm</dt><dd>{task.shiftName}</dd></div></dl>
          <footer className={styles.taskActions}>
            {canCreate && selectedTaskKey === taskKey ? <Button busy={Boolean(starting)} disabled={Boolean(starting) || !task.roster.length} onClick={() => void start(task)} variant="primary">{task.existingSessionId && ["submitted", "locked", "needs_review"].includes(task.existingStatus ?? "") ? "Điểm danh lượt mới" : "Tiếp tục"}</Button> : null}
            {task.existingSessionId ? <Link className="button button--secondary" href={`/worker-attendance/sessions/${task.existingSessionId}`}>Xem điểm danh<ArrowUpRight aria-hidden="true" size={17} /></Link> : null}
            {!canCreate && can(user.permissions, "project.view") ? <Link aria-label={`Mở công trường ${task.projectName}`} className={styles.projectLink} href={`/projects/${task.projectId}/today`}>Công trường<ArrowUpRight aria-hidden="true" size={16} /></Link> : null}
          </footer>
        </article>;
      })}
    </div>
    {!visibleTasks.length ? <EmptyState title={query ? "Không tìm thấy gói" : "Chưa có gói đang hoạt động"} description="" /> : null}
    {canCreate && !selectedTask ? <div className={styles.selectionActions}><span>Chưa chọn gói</span><Button disabled variant="primary">Tiếp tục</Button></div> : null}
    {selectedTask && !selectedTask.roster.length && !selectedTask.existingSessionId ? <p role="status">Gói chưa có công nhân.</p> : null}
    {can(user.permissions, "worker_attendance.view") ? <Link className={styles.historyLink} href="/worker-attendance">Lịch sử điểm danh<ArrowUpRight aria-hidden="true" size={16} /></Link> : null}
  </div>;
}

export function WorkerAttendanceSessionList({ detailBasePath = "/worker-attendance/sessions", date, onDateChange, showExport = true }: { detailBasePath?: string; date?: string; onDateChange?: (date: string) => void; showExport?: boolean }) {
  const user = useCurrentUser();
  const [sessions, setSessions] = useState<WorkerAttendanceSession[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [localDate, setLocalDate] = useState(getBusinessDateKey);
  const selectedDate = date ?? localDate;
  const changeDate = (value: string) => { if (/^\d{4}-\d{2}-\d{2}$/.test(value)) (onDateChange ?? setLocalDate)(value); };
  const [status, setStatus] = useState("");
  const requestRef = useRef<{ date: string; controller: AbortController; pending: Promise<void> } | null>(null);
  const load = useCallback(() => {
    if (requestRef.current?.date === selectedDate && !requestRef.current.controller.signal.aborted) return requestRef.current.pending;
    requestRef.current?.controller.abort();
    const controller = new AbortController();
    const pending = (async () => {
      setLoading(true); setError("");
      try { const result = await readWorkerResponse<WorkerAttendanceSession[]>(await fetch(`/api/v1/worker-attendance/sessions?from=${selectedDate}&to=${selectedDate}`, { cache: "no-store", signal: controller.signal })); if (!controller.signal.aborted) setSessions(result); }
      catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Không thể tải dữ liệu."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    requestRef.current = { date: selectedDate, controller, pending };
    void pending.finally(() => { if (requestRef.current?.pending === pending) requestRef.current = null; });
    return pending;
  }, [selectedDate]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => { window.clearTimeout(timer); requestRef.current?.controller.abort(); requestRef.current = null; }; }, [load]);
  useDomainReconciliation("worker-attendance", load);
  const visible = useMemo(() => sessions.filter(session => session.date === selectedDate && (!status || session.status === status) && `${session.projectName} ${session.worksiteName} ${session.supervisorName} ${session.entries.filter(entry => entry.isSelected !== false).map(entry => `${entry.employeeCode} ${entry.workerName}`).join(" ")}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))), [selectedDate, sessions, status, query]);
  const workerCount = new Set(visible.filter(session => session.submittedAt || ["submitted", "locked"].includes(session.status)).flatMap(session => session.entries.filter(entry => entry.isSelected !== false && ["present", "late"].includes(entry.status)).map(entry => entry.workerId))).size;
  return <ListWorkspace label="Điểm danh công trường theo ngày" filters={<><FilterBar busy={loading}><Input label="Ngày" type="date" value={selectedDate} onChange={event => changeDate(event.target.value)} /><Button onClick={() => changeDate(getBusinessDateKey())} variant="ghost">Hôm nay</Button><SearchInput aria-label="Tìm điểm danh trong ngày" placeholder="Công trường, giám sát hoặc công nhân" value={query} onChange={event => setQuery(event.target.value)} /><Select label="Trạng thái" onChange={event => setStatus(event.target.value)} options={Object.entries(sessionLabels).map(([value, label]) => ({ value, label }))} placeholder="Tất cả trạng thái" value={status} /><IconButton label="Cập nhật điểm danh" disabled={loading} onClick={() => void load()}><RefreshCw size={17} /></IconButton></FilterBar>{showExport ? <AttendanceExport month={selectedDate.slice(0, 7)} onMonthChange={month => changeDate(`${month}-01`)} /> : null}</>} status={<div className={styles.sessionToolbar}><span role="status">{workerCount} công nhân · {visible.length} lượt điểm danh · {visible.reduce((count, session) => count + session.photos.length, 0)} ảnh</span>{status || query ? <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setStatus(""); }}>Xóa bộ lọc</Button> : null}</div>}>
    {error ? <ErrorState description={error} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : loading && !visible.length ? <LoadingState title="Đang tải điểm danh trong ngày" /> : visible.length ? <WorkerSessionEvidenceCards detailBasePath={detailBasePath} sessions={visible} canViewPhotos={can(user.permissions, "worker_attendance.view_photo") || can(user.permissions, "worker_attendance.create")} /> : <EmptyState title={status || query ? "Không có điểm danh phù hợp" : "Chưa có điểm danh trong ngày"} description="" />}
  </ListWorkspace>;
}
