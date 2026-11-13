"use client";

import { ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3, HardHat, MapPin, RefreshCw, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, IconButton } from "@/components/shared/Button";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { ListWorkspace } from "@/components/shared/PageLayouts";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput, Select } from "@/components/shared/FormControls";
import { AttendanceDayPicker } from "@/features/attendance/components/AttendanceDayPicker";
import { WorkerOvertimeEntry } from "./WorkerOvertimeEntry";
import { AttendanceExport } from "@/features/attendance/components/AttendanceExport";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { listPendingAttendance } from "@/features/attendance/client/attendanceQueue";
import { cacheWorkerTasks, getCachedWorkerTasks, listWorkerDrafts, saveWorkerDraft, type CachedWorkerTasks, type WorkerLocalDraft } from "@/features/worker-attendance/client/workerDraftStore";
import { readWorkerResponse } from "@/features/worker-attendance/client/workerAttendanceSync";
import type { WorkerAttendanceSession, WorkerAttendanceTask } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import styles from "./WorkerAttendanceWorkspace.module.css";
import { createWorkerSafetyReport } from "../services/workerSafetyReport";
import { formatBusinessDate, getBusinessDateKey } from "@/lib/time/timezone";
import { can } from "@/lib/auth/permissions";
import { WorkerSessionEvidenceCards } from "./WorkerSessionEvidenceCards";
import { requiredArrivalTime } from "@/features/timesheets/services/portSchedules";

const sessionLabels: Record<string, string> = { draft: "Nháp", in_progress: "Đang điểm danh", submitted: "Đã điểm danh", locked: "Đã khóa", needs_review: "Cần rà soát" };
const sessionTones: Record<string, "neutral" | "info" | "success" | "warning"> = { draft: "neutral", in_progress: "info", submitted: "success", locked: "neutral", needs_review: "warning" };

function makeLocalSession(task: WorkerAttendanceTask, clientSessionId: string, location?: WorkerLocalDraft["location"]): WorkerAttendanceSession {
  const now = new Date().toISOString();
  return {
    id: `local-${clientSessionId}`, clientSessionId, projectId: task.projectId, projectName: task.projectName,
    worksiteId: task.worksiteId, worksiteName: task.worksiteName, date: task.date, shiftCode: task.shiftCode,
    shiftName: task.shiftName, allowedAccuracyThresholdMeters: task.allowedAccuracyThresholdMeters, sessionType: "morning", supervisorEmployeeId: "local", supervisorName: "",
    startedAt: now, capturedAtClient: now, geofenceStatus: location ? location.accuracy > (task.allowedAccuracyThresholdMeters ?? 100) ? "accuracy_low" : "valid" : task.gpsRequired === false ? "not_required" : "unavailable", latitude: location?.latitude, longitude: location?.longitude, accuracyMeters: location?.accuracy, status: "in_progress", syncStatus: "local_pending",
    photoStatus: "pending_upload", version: 1, selectionMode: true, safetyConfirmed: false, safetyReport: createWorkerSafetyReport(), minimumPhotos: 1, photos: [], adjustments: [], checklist: task.checklist, checklistResponses: [],
    entries: task.roster.map((worker) => ({ id: `local-${worker.workerId}`, sessionId: `local-${clientSessionId}`, workerId: worker.workerId, employeeCode: worker.employeeCode, workerName: worker.workerName, assignmentRole: worker.assignmentRole, isSelected: false, status: worker.approvedLeave ? "leave" : "unconfirmed", exceptionReason: worker.approvedLeave ? "approved_leave" : undefined, note: worker.approvedLeave ? `${worker.approvedLeave.leaveTypeName} · ${worker.approvedLeave.requestNumber}` : undefined, dayException: "none", isUnplanned: false }))
  };
}

export function WorkerAttendanceToday({ projectId, worksiteId, embedded = false, initialOvertime = false }: { projectId?: string; worksiteId?: string; embedded?: boolean; initialOvertime?: boolean }) {
  const user = useCurrentUser();
  const canCreate = can(user.permissions, "worker_attendance.create");
  const router = useRouter();
  const [data, setData] = useState<CachedWorkerTasks>();
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<string>();
  const [selectedTaskKey, setSelectedTaskKey] = useState("");
  const [selectedPortCode, setSelectedPortCode] = useState("");
  const [query, setQuery] = useState("");
  const [overtime, setOvertime] = useState(() => initialOvertime || new Date(`${getBusinessDateKey()}T12:00:00Z`).getUTCDay() === 0);
  const [overtimeConsent, setOvertimeConsent] = useState(false);
  const [localDrafts, setLocalDrafts] = useState<WorkerLocalDraft[]>([]);
  const loadingRequest = useRef<Promise<void> | null>(null);
  const date = getBusinessDateKey();
  const visibleTasks = useMemo(() => data?.tasks.filter((task) => (!projectId || task.projectId === projectId) && (!worksiteId || task.worksiteId === worksiteId) && `${task.projectName} ${task.worksiteName} ${task.shiftName}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))) ?? [], [data?.tasks, projectId, worksiteId, query]);
  const packageTasks = [...new Map(visibleTasks.map(task => [task.worksiteId, task])).values()];
  const selectedPackage = visibleTasks.find(task => `${task.worksiteId}:${task.shiftCode}` === selectedTaskKey);
  const portTasks = selectedPackage ? visibleTasks.filter(task => task.worksiteId === selectedPackage.worksiteId && ["PORT_SPECIALIZED", "PORT_GENERAL"].includes(task.shiftCode)) : [];
  const selectedTask = portTasks.length ? portTasks.find(task => task.shiftCode === selectedPortCode) : selectedPackage;
  const restDay = selectedTask?.isWorkingDay === false || selectedTask?.isWorkingDay === undefined && new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
  const overtimeMode = overtime || restDay;
  const overtimeDraft = localDrafts.find(item => item.ownerAccountId === user.id && item.session.sessionType === "overtime" && item.session.date === date && item.session.worksiteId === selectedTask?.worksiteId && item.session.shiftCode === selectedTask?.shiftCode);

  const load = useCallback(() => {
    if (loadingRequest.current) return loadingRequest.current;
    const pending = (async () => {
    setLoading(true); setError("");
    void listWorkerDrafts().then(setLocalDrafts).catch(() => undefined);
    try {
      const result = await readWorkerResponse<Omit<CachedWorkerTasks, "key" | "date" | "cachedAt">>(await fetch(`/api/v1/worker-attendance/today?date=${date}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) }));
      const pending = await listPendingAttendance(user.id).catch(() => []);
      const latest = pending.filter(item => getBusinessDateKey(new Date(item.capturedAtClient)) === date).at(-1);
      const cache = { ...result, ...(latest ? { personalAttendanceReady: latest.intendedType === "check_in" } : {}), key: `${result.accountId}:${date}`, date, cachedAt: new Date().toISOString() };
      setData(cache); setOffline(false);
      void cacheWorkerTasks(cache).catch(() => undefined);
    } catch (caught) {
      const cached = await getCachedWorkerTasks(user.id, date);
      if (cached && cached.accountId === user.id) {
        const pending = await listPendingAttendance(user.id).catch(() => []);
        const latest = pending.filter(item => getBusinessDateKey(new Date(item.capturedAtClient)) === date).at(-1);
        setData(latest ? {...cached,personalAttendanceReady:latest.intendedType === "check_in"} : cached); setOffline(true);
      }
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

  function openDraft(id: string) { if (!navigator.onLine) window.location.assign(`/worker-attendance/offline?draft=${encodeURIComponent(id)}&step=roster`); else router.push(`/worker-attendance/sessions/${id}/roster`); }
  async function start(task: WorkerAttendanceTask) {
    if (!overtimeMode && task.existingSessionId && (!canCreate || !["submitted", "locked", "needs_review"].includes(task.existingStatus ?? ""))) {
      router.push(!canCreate || task.existingStatus === "submitted" || task.existingStatus === "locked" || task.existingStatus === "needs_review" ? `/worker-attendance/sessions/${task.existingSessionId}` : `/worker-attendance/sessions/${task.existingSessionId}/roster`);
      return;
    }
    if (!canCreate) return;
    const resumable = localDrafts.find((item) => item.ownerAccountId === data?.accountId && item.session.projectId === task.projectId && item.session.worksiteId === task.worksiteId && item.session.date === task.date && item.session.shiftCode === task.shiftCode && (item.session.sessionType === "overtime") === Boolean(overtimeMode));
    if (resumable) { openDraft(resumable.id); return; }
    setStarting(`${task.worksiteId}:${task.shiftCode}`);
    setError("");
    const clientSessionId = crypto.randomUUID();
    const localSession: WorkerAttendanceSession = { ...makeLocalSession(task, clientSessionId), shiftStart: task.shiftStart, shiftEnd: task.shiftEnd, shiftBreakMinutes: overtimeMode ? 0 : task.shiftBreakMinutes, shiftScheduleRules: task.shiftScheduleRules, sessionType: overtimeMode ? "overtime" : "morning", overtimeConsentConfirmed: overtimeMode ? overtimeConsent : undefined, overtimeStatus: overtimeMode ? "recording" : undefined, overtimeDayType: overtimeMode ? ["holiday","company_holiday"].includes(task.calendarDayType ?? "") ? "holiday" : restDay ? "rest_day" : "working_day" : undefined, minimumPhotos: Math.max(overtimeMode ? 3 : 1, data?.policy.minimumPhotos ?? 1) };
    const draft: WorkerLocalDraft = { id: localSession.id, ownerAccountId: data!.accountId, clientSessionId, session: localSession, photos: [], pendingSubmit: false, retryCount: 0, updatedAt: new Date().toISOString() };
    try { await saveWorkerDraft(draft); }
    catch { setStarting(undefined); setError("Không thể lưu điểm danh trên thiết bị. Vui lòng thử lại."); return; }
    openDraft(localSession.id);
    setStarting(undefined);
  }

  if (loading && !data) return <LoadingState title="Đang mở lịch điểm danh" />;
  if (error && !data) return <ErrorState description={error} action={<Button onClick={() => void load()}>Thử lại</Button>} />;
  const finished = visibleTasks.filter(task => task.existingStatus === "submitted" || task.existingStatus === "locked").length;
  const deviceDrafts = localDrafts.filter(draft => draft.ownerAccountId === data?.accountId && draft.session.date === date && (!projectId || draft.session.projectId === projectId) && (!worksiteId || draft.session.worksiteId === worksiteId));
  return <div className={styles.home} aria-busy={loading}>
    <div className={styles.todayHeader}>
      <time dateTime={date}><CalendarDays aria-hidden="true" size={17} />{formatBusinessDate(date)}</time>
      <div>{offline || error ? <StatusBadge tone="warning">Trên thiết bị</StatusBadge> : <span className={styles.updatedAt}>Cập nhật {data?.cachedAt ? new Date(data.cachedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "—"}</span>}<IconButton aria-busy={loading} disabled={loading} label="Cập nhật lịch điểm danh" onClick={() => void load()}><RefreshCw aria-hidden="true" size={17} /></IconButton></div>
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div className={styles.attendanceToolbar}>
      {canCreate ? <div className={styles.modeSwitch} role="group" aria-label="Loại chấm công"><Button aria-pressed={!overtimeMode} disabled={restDay} onClick={() => setOvertime(false)} variant={!overtimeMode ? "soft" : "ghost"}>Trong ca</Button><Button aria-pressed={Boolean(overtimeMode)} onClick={() => setOvertime(true)} variant={overtimeMode ? "soft" : "ghost"}>{restDay ? "Tăng ca ngày nghỉ" : "Tăng ca"}</Button></div> : null}
      {canCreate && data?.personalAttendanceReady === false ? <Link className={styles.personalLink} href="/attendance/quick"><Clock3 size={16} aria-hidden="true" />Chấm công cá nhân<ArrowUpRight size={16} aria-hidden="true" /></Link> : null}
    </div>
    <section className={styles.packageSection} aria-labelledby="package-selection-title">
      <div className={styles.packageHeading}><h2 id="package-selection-title">{selectedPackage ? "Gói đã chọn" : "Chọn gói công trường"}</h2>{selectedPackage ? <Button disabled={Boolean(starting)} onClick={() => { setSelectedTaskKey(""); setSelectedPortCode(""); setOvertimeConsent(false); }} variant="ghost">Đổi gói</Button> : <span>{packageTasks.length} gói</span>}</div>
      {!embedded && !selectedPackage ? <SearchInput aria-label="Tìm gói chấm công" mobilePlaceholder="Tìm gói công trường" placeholder="Tìm tên gói, công trường…" value={query} onChange={event => setQuery(event.target.value)} /> : null}
      <div className={styles.taskGrid}>
        {packageTasks.filter(task => !selectedPackage || task.worksiteId === selectedPackage.worksiteId).map(task => {
          const hasLocalDraft = deviceDrafts.some(item => item.session.worksiteId === task.worksiteId);
          const taskKey = `${task.worksiteId}:${task.shiftCode}`;
          const isSelected = selectedTaskKey === taskKey;
          return <article className={styles.packageCard} data-selected={isSelected} key={taskKey}>
            <label className={styles.packageChoice}>
              {canCreate ? <input aria-label={`Chọn gói ${task.projectName} · ${task.worksiteName} · ${task.shiftName}`} checked={isSelected} disabled={Boolean(starting)} name="attendance-package" onChange={() => { setSelectedTaskKey(taskKey); setSelectedPortCode(""); setOvertimeConsent(false); }} type="radio" /> : null}
              <span className={styles.packageMark} aria-hidden="true">{isSelected ? <Check size={20} /> : <HardHat size={20} />}</span>
              <span className={styles.packageCopy}><strong>{task.projectName}</strong>{task.worksiteName.trim() !== task.projectName.trim() ? <span><MapPin size={14} aria-hidden="true" />{task.worksiteName}</span> : null}<span className={styles.packageMeta}><span><Users size={15} aria-hidden="true" />{task.expectedWorkers} công nhân</span><StatusBadge tone={task.existingStatus ? sessionTones[task.existingStatus] : hasLocalDraft ? "warning" : "neutral"}>{task.existingStatus ? sessionLabels[task.existingStatus] : hasLocalDraft ? "Bản nháp" : "Chưa điểm danh"}</StatusBadge></span></span>
            </label>
            {task.existingSessionId || !canCreate && can(user.permissions, "project.view") ? <div className={styles.packageLinks}>{task.existingSessionId ? <Link href={`/worker-attendance/sessions/${task.existingSessionId}`}>Xem điểm danh<ArrowUpRight size={16} aria-hidden="true" /></Link> : null}{!canCreate && can(user.permissions, "project.view") ? <Link href={`/projects/${task.projectId}/today`}>Công trường<ArrowUpRight size={16} aria-hidden="true" /></Link> : null}</div> : null}
          </article>;
        })}
      </div>
      {!visibleTasks.length ? <EmptyState title={query ? "Không tìm thấy gói" : "Chưa có gói đang hoạt động"} description="" /> : null}
    </section>
    {canCreate && portTasks.length ? <fieldset className={styles.portSection} disabled={Boolean(starting)}><legend>Chọn cảng làm việc</legend><div className={styles.portOptions}>{portTasks.map(task => <label className={styles.portChoice} data-selected={selectedPortCode === task.shiftCode} key={task.shiftCode}><input type="radio" name="attendance-port" value={task.shiftCode} checked={selectedPortCode === task.shiftCode} onChange={() => { setSelectedPortCode(task.shiftCode); setOvertimeConsent(false); }} /><span><strong>{task.shiftName}</strong><span><Clock3 size={15} aria-hidden="true" />{overtimeMode ? "Giờ tự chọn" : `${task.shiftStart}–${task.shiftEnd}`}</span></span>{selectedPortCode === task.shiftCode ? <Check size={18} aria-hidden="true" /> : null}</label>)}</div>{!overtimeMode && selectedTask?.shiftStart ? <div className={styles.arrivalTime}><span>Có mặt trước <strong>{requiredArrivalTime(selectedTask.shiftStart, selectedTask.shiftScheduleRules?.arrivalLeadMinutes ?? 10)}</strong></span><span>Đủ ca <strong>1 công</strong></span></div> : null}</fieldset> : null}
    {canCreate && selectedPackage && overtimeMode && !overtimeDraft ? <div className={styles.continueSection}>{selectedTask ? <WorkerOvertimeEntry key={`${selectedTask.worksiteId}:${selectedTask.shiftCode}`} task={selectedTask} onSaved={session => router.push(`/worker-attendance/sessions/${session.id}`)} /> : <Button disabled variant="primary" size="lg">Ghi tăng ca</Button>}</div> : canCreate && selectedPackage ? <div className={styles.continueSection}>
      {overtimeMode && !overtimeDraft?.session.overtimeConsentConfirmed ? <label className={styles.consent}><input type="checkbox" checked={overtimeConsent} onChange={event => setOvertimeConsent(event.target.checked)} />Đã xác nhận người tham gia đồng ý tăng ca</label> : null}
      <Button busy={Boolean(starting)} disabled={Boolean(starting) || !selectedTask || Boolean(overtimeMode && !overtimeConsent && !overtimeDraft?.session.overtimeConsentConfirmed)} onClick={() => { if (selectedTask) void start(selectedTask); }} variant="primary" rightIcon={<ArrowRight size={18} aria-hidden="true" />}>{overtimeMode ? overtimeDraft ? "Tiếp tục tăng ca" : "Bắt đầu tăng ca" : selectedTask?.existingSessionId && ["submitted", "locked", "needs_review"].includes(selectedTask.existingStatus ?? "") ? "Điểm danh lượt mới" : "Chọn công nhân"}</Button>
    </div> : null}
    {!embedded ? <div className={styles.homeFooter}><span>{finished} lượt đã điểm danh{deviceDrafts.length ? ` · ${deviceDrafts.length} bản trên thiết bị` : ""}</span>{can(user.permissions, "worker_attendance.view") ? <Link className={styles.historyLink} href="/worker-attendance">Lịch sử<ArrowUpRight size={16} aria-hidden="true" /></Link> : null}</div> : null}
  </div>;
}

export function WorkerAttendanceSessionList({ detailBasePath = "/worker-attendance/sessions", date, onDateChange, showExport = true, supervisorId, onClearSupervisor }: { supervisorId?: string; onClearSupervisor?: () => void; detailBasePath?: string; date?: string; onDateChange?: (date: string) => void; showExport?: boolean }) {
  const user = useCurrentUser();
  const [sessions, setSessions] = useState<WorkerAttendanceSession[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [localDate, setLocalDate] = useState(getBusinessDateKey);
  const selectedDate = date ?? localDate;
  const [exportMonth, setExportMonth] = useState(() => selectedDate.slice(0, 7));
  const changeDate = (value: string) => { if (/^\d{4}-\d{2}-\d{2}$/.test(value)) (onDateChange ?? setLocalDate)(value); };
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [sessionType, setSessionType] = useState("");
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
  const visible = useMemo(() => sessions.filter(session => session.date === selectedDate && (!sessionType || (session.sessionType === "overtime" ? "overtime" : "regular") === sessionType) && (!projectId || session.projectId === projectId) && (!supervisorId || session.supervisorEmployeeId === supervisorId) && (!status || session.status === status || status === "overtime_pending" && session.sessionType === "overtime" && session.overtimeStatus === "pending" || status === "overtime_confirmed" && session.sessionType === "overtime" && session.overtimeStatus === "confirmed") && `${session.projectName} ${session.worksiteName} ${session.supervisorName} ${session.entries.filter(entry => entry.isSelected !== false).map(entry => `${entry.employeeCode} ${entry.workerName}`).join(" ")}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))), [selectedDate, sessions, status, sessionType, query, projectId, supervisorId]);
  const workerCount = new Set(visible.filter(session => session.submittedAt || ["submitted", "locked"].includes(session.status)).flatMap(session => session.entries.filter(entry => entry.isSelected !== false && ["present", "late"].includes(entry.status)).map(entry => entry.workerId))).size;
  return <ListWorkspace label="Điểm danh công trường theo ngày" filters={<><div className={styles.dayReviewFilters}><div className={styles.dayReviewDate}><AttendanceDayPicker date={selectedDate} onChange={changeDate}/><IconButton label="Cập nhật điểm danh" disabled={loading} onClick={() => void load()}><RefreshCw size={17} /></IconButton></div><Select label="Loại điểm danh" placeholder="Tất cả lượt" options={[{value:"regular",label:"Trong ca"},{value:"overtime",label:"Tăng ca"}]} value={sessionType} onChange={event=>setSessionType(event.target.value)}/><Select label="Gói công trường" placeholder="Tất cả gói" options={[...new Map(sessions.filter(s => s.date === selectedDate).map(s => [s.projectId,{value:s.projectId,label:s.projectName}])).values()]} value={projectId} onChange={event => setProjectId(event.target.value)}/>{supervisorId ? <Button variant="secondary" onClick={onClearSupervisor}>Giám sát đã chọn · Xóa lọc</Button> : null}<FilterBar busy={loading}><SearchInput aria-label="Tìm điểm danh trong ngày" placeholder="Công trường, giám sát hoặc công nhân" value={query} onChange={event => setQuery(event.target.value)} /><Select label="Trạng thái" onChange={event => setStatus(event.target.value)} options={[...Object.entries(sessionLabels).map(([value, label]) => ({ value, label })),{value:"overtime_pending",label:"Tăng ca chờ xác nhận"},{value:"overtime_confirmed",label:"Tăng ca đã xác nhận"}]} placeholder="Tất cả trạng thái" value={status} /></FilterBar></div>{showExport ? <AttendanceExport month={exportMonth} onMonthChange={setExportMonth} /> : null}</>} status={<div className={styles.sessionToolbar}><span role="status">{workerCount} công nhân · {visible.length} lượt điểm danh · {visible.reduce((count, session) => count + session.photos.length, 0)} ảnh</span>{status || sessionType || query || projectId ? <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setStatus(""); setProjectId(""); }}>Xóa bộ lọc</Button> : null}</div>}>
    {error ? <ErrorState description={error} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : loading && !visible.length ? <LoadingState title="Đang tải điểm danh trong ngày" /> : visible.length ? <WorkerSessionEvidenceCards detailBasePath={detailBasePath} sessions={visible} canViewPhotos={can(user.permissions, "worker_attendance.view_photo") || can(user.permissions, "worker_attendance.create")} /> : <EmptyState title={status || sessionType || query || projectId ? "Không có điểm danh phù hợp" : "Chưa có điểm danh trong ngày"} description="" />}
  </ListWorkspace>;
}
