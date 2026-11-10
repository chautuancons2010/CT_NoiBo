"use client";

import { ArrowUpRight, CalendarDays, ClipboardCheck, HardHat, MapPin, RefreshCw, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, IconButton } from "@/components/shared/Button";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { ListWorkspace } from "@/components/shared/PageLayouts";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { Input, SearchInput, Select } from "@/components/shared/FormControls";
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

export function WorkerAttendanceToday({ projectId, worksiteId }: { projectId?: string; worksiteId?: string }) {
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
  const date = getBusinessDateKey();
  const visibleTasks = useMemo(() => data?.tasks.filter((task) => (!projectId || task.projectId === projectId) && (!worksiteId || task.worksiteId === worksiteId) && `${task.projectName} ${task.worksiteName} ${task.shiftName}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))) ?? [], [data?.tasks, projectId, worksiteId, query]);
  const selectedTask = visibleTasks.find((task) => `${task.worksiteId}:${task.shiftCode}` === selectedTaskKey);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    setLocalDrafts(await listWorkerDrafts());
    try {
      const result = await readWorkerResponse<Omit<CachedWorkerTasks, "key" | "date" | "cachedAt">>(await fetch(`/api/v1/worker-attendance/today?date=${date}`, { cache: "no-store" }));
      const cache = { ...result, key: `${result.accountId}:${date}`, date, cachedAt: new Date().toISOString() };
      await cacheWorkerTasks(cache); setData(cache); setOffline(false);
    } catch (caught) {
      const cached = await getLatestCachedWorkerTasks(date);
      if (cached && cached.accountId === user.id) { setData(cached); setOffline(true); }
      else setError(caught instanceof Error ? caught.message : "Không thể tải lịch điểm danh.");
    } finally { setLoading(false); }
  }, [date, user.id]);

  useEffect(() => {
    // Initial client-side data load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useDomainReconciliation("worker-attendance", load);
  useDomainReconciliation("attendance", load);
  useDomainReconciliation("timesheets", load);

  async function start(task: WorkerAttendanceTask) {
    if (task.existingSessionId) {
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
    <ol className={styles.flowSteps} aria-label="Các bước chấm công"><li aria-current="step"><span>1</span>Gói</li><li><span>2</span>Công nhân</li><li><span>3</span>An toàn</li><li><span>4</span>Chụp ảnh</li></ol>
    <dl className={styles.summary}><div><dt>Gói / ca làm</dt><dd>{visibleTasks.length}</dd></div><div><dt>Đã điểm danh</dt><dd>{finished}</dd></div><div><dt>Bản nháp trên máy</dt><dd>{deviceDrafts.length}</dd></div></dl>
    <SearchInput aria-label="Tìm gói chấm công" placeholder="Tên gói, công trường, ca làm" value={query} onChange={event => setQuery(event.target.value)} />
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
            {canCreate && !task.existingSessionId && selectedTaskKey === taskKey ? <Button busy={Boolean(starting)} disabled={Boolean(starting) || !task.roster.length} onClick={() => void start(task)} variant="primary">Tiếp tục</Button> : null}
            {task.existingSessionId ? <Button disabled={Boolean(starting)} onClick={() => void start(task)} rightIcon={<ArrowUpRight aria-hidden="true" size={17} />}>{task.existingStatus === "submitted" || task.existingStatus === "locked" || task.existingStatus === "needs_review" || !canCreate ? "Xem điểm danh" : "Tiếp tục điểm danh"}</Button> : null}
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

export function WorkerAttendanceSessionList() {
  const user = useCurrentUser();
  const [sessions, setSessions] = useState<WorkerAttendanceSession[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"sessions" | "table">("sessions");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setSessions(await readWorkerResponse<WorkerAttendanceSession[]>(await fetch("/api/v1/worker-attendance/sessions", { cache: "no-store" }))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useDomainReconciliation("worker-attendance", load);
  const visible = useMemo(() => sessions.filter(session => (!from || session.date >= from) && (!to || session.date <= to) && (!status || session.status === status) && `${session.projectName} ${session.worksiteName}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))), [from, sessions, status, to, query]);
  const filtered = Boolean(from || to || status || query);
  const columns: DataTableColumn<WorkerAttendanceSession>[] = [
    { id: "project", header: "Công trường", priority: "primary", sortable: true, accessor: "projectName", cell: session => <span className="record-identity"><strong>{session.projectName}</strong><small>{session.worksiteName}</small></span> },
    { id: "date", header: "Ngày điểm danh", sortable: true, accessor: "date", cell: session => formatBusinessDate(session.date) },
    { id: "shift", header: "Ca làm", cell: session => session.shiftName },
    { id: "status", header: "Trạng thái", cell: session => <StatusBadge tone={sessionTones[session.status]}>{sessionLabels[session.status]}</StatusBadge> }
  ];
  return <ListWorkspace label="Lịch sử điểm danh công trường" filters={<><FilterBar busy={loading}><SearchInput aria-label="Tìm phiên điểm danh" placeholder="Dự án hoặc công trường" value={query} onChange={event => setQuery(event.target.value)} /><Input label="Từ ngày" onChange={event => setFrom(event.target.value)} type="date" value={from} /><Input label="Đến ngày" onChange={event => setTo(event.target.value)} type="date" value={to} /><Select label="Trạng thái" onChange={event => setStatus(event.target.value)} options={Object.entries(sessionLabels).map(([value, label]) => ({ value, label }))} placeholder="Tất cả" value={status} /></FilterBar></>} status={<div className="worklist-summary"><span role="status">{visible.length} phiên điểm danh</span>{filtered ? <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setFrom(""); setTo(""); setStatus(""); }}>Xóa bộ lọc</Button> : null}</div>}>
{error && sessions.length ? <ErrorState title="Không thể cập nhật danh sách" description={error} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : null}
<div aria-label="Cách xem điểm danh" className="worklist-summary" role="group"><Button aria-pressed={view === "sessions"} onClick={() => setView("sessions")} size="sm" variant={view === "sessions" ? "primary" : "secondary"}>Theo phiên</Button><Button aria-pressed={view === "table"} onClick={() => setView("table")} size="sm" variant={view === "table" ? "primary" : "secondary"}>Danh sách</Button></div>
{view === "sessions" && visible.length ? <WorkerSessionEvidenceCards sessions={visible} canViewPhotos={can(user.permissions, "worker_attendance.view_photo") || can(user.permissions, "worker_attendance.create")} canExport={can(user.permissions, "timesheet.export")} /> : <DataTable ariaLabel="Lịch sử điểm danh công trường" columns={columns} data={visible} error={!sessions.length ? error : undefined} onRetry={() => void load()} loading={loading && !sessions.length} emptyTitle={filtered ? "Không có phiên phù hợp" : "Chưa có phiên điểm danh"} emptyDescription="" getRowId={session => session.id} getRowHref={session => `/worker-attendance/sessions/${session.id}`} pageSize={15} />}
</ListWorkspace>;
}
