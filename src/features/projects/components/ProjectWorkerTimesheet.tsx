"use client";

import { CalendarDays, Camera, ChevronLeft, ChevronRight, RefreshCw, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button, IconButton } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Input, SearchInput, Select } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WorkerAttendanceSessionDetail } from "@/features/worker-attendance/components/WorkerAttendanceSessionDetail";
import { readWorkerResponse } from "@/features/worker-attendance/client/workerAttendanceSync";
import { aggregateWorkerDay } from "@/features/worker-attendance/services/workerAttendanceDay";
import type { WorkerAttendanceEntry, WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";
import type { ProjectDetail } from "@/features/projects/types/projectTypes";
import { can } from "@/lib/auth/permissions";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import { formatBusinessDate, getBusinessDateKey } from "@/lib/time/timezone";
import styles from "./ProjectWorkerTimesheet.module.css";

type Observation = WorkerAttendanceEntry & { session: WorkerAttendanceSession; observedAt: string; breakMinutes: number };
type DayStatus = "present" | "late" | "absent" | "leave" | "transferred" | "unconfirmed" | "not_recorded" | "missing_in" | "missing_out" | "needs_review";
export interface ProjectWorkerDay {
  id: string; date: string; workerId: string; employeeCode: string; workerName: string;
  checkedInAt?: string; checkedOutAt?: string; workMinutes: number; workFraction: number;
  hasConfirmedHours: boolean; status: DayStatus; sessions: WorkerAttendanceSession[];
  observations: Observation[]; photoCount: number; worksiteNames: string; shiftNames: string;
}

const statusLabels: Record<DayStatus, string> = { present: "Có mặt", late: "Đi trễ", absent: "Vắng", leave: "Nghỉ phép", transferred: "Điều chuyển", unconfirmed: "Chưa xác nhận", not_recorded: "Chưa điểm danh", missing_in: "Thiếu giờ vào", missing_out: "Thiếu giờ ra", needs_review: "Cần rà soát" };
const hours = (minutes: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(minutes / 60);
const clock = (value?: string) => value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value)) : "—";
const normalize = (value: string) => value.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const unique = (values: string[]) => [...new Set(values)].join(" · ");
const monthBounds = (month: string) => { const [year, number] = month.split("-").map(Number); return { from: `${month}-01`, to: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10) }; };

export function buildProjectWorkerDays(sessions: WorkerAttendanceSession[]): ProjectWorkerDay[] {
  const grouped = new Map<string, Observation[]>();
  for (const session of [...new Map(sessions.map(item => [item.id, item])).values()]) {
    if (!session.submittedAt && session.status !== "submitted" && session.status !== "locked") continue;
    for (const entry of session.entries.filter(item => item.isSelected !== false)) {
      const id = `${session.date}:${entry.workerId}`;
      grouped.set(id, [...(grouped.get(id) ?? []), { ...entry, sessionId: session.id, session, observedAt: session.startedAt, breakMinutes: session.shiftBreakMinutes ?? 0 }]);
    }
  }
  return [...grouped].map(([id, observations]) => {
    const daily = aggregateWorkerDay(observations)!;
    const rounds = [...new Map(observations.map(item => [item.session.id, item.session])).values()].sort((first, second) => first.startedAt.localeCompare(second.startedAt));
    const presence = daily.workFraction > 0;
    const status: DayStatus = presence && daily.missingCheckIn ? "missing_in" : presence && daily.missingCheckOut ? "missing_out" : rounds.some(item => item.status === "needs_review") ? "needs_review" : observations.some(item => item.status === "late") ? "late" : daily.status;
    return {
      id, date: daily.session.date, workerId: daily.workerId, employeeCode: daily.employeeCode, workerName: daily.workerName,
      checkedInAt: daily.checkedInAt, checkedOutAt: daily.checkedOutAt, workMinutes: daily.workMinutes, workFraction: daily.workFraction,
      hasConfirmedHours: daily.complete || daily.presenceMinutes > 0, status, sessions: rounds, observations,
      photoCount: new Set(rounds.flatMap(item => item.photos.map(photo => photo.id))).size,
      worksiteNames: unique(rounds.map(item => item.worksiteName)), shiftNames: unique(rounds.map(item => item.shiftName))
    };
  }).sort((first, second) => second.date.localeCompare(first.date) || first.workerName.localeCompare(second.workerName, "vi"));
}

export function includeAssignedWorkers(project: ProjectDetail, date: string, worksiteId: string, recorded: ProjectWorkerDay[]): ProjectWorkerDay[] {
  const rows = new Map(recorded.map(day => [day.workerId, day]));
  const assignments = project.assignments.filter(item => item.assignmentRole === "worker" && item.status === "active" && item.startDate <= date && (!item.endDate || item.endDate >= date) && (!worksiteId || !item.worksiteId || item.worksiteId === worksiteId));
  for (const worker of assignments) if (!rows.has(worker.employeeId)) rows.set(worker.employeeId, {
    id: `${date}:${worker.employeeId}`, date, workerId: worker.employeeId, employeeCode: worker.employeeCode, workerName: worker.employeeName,
    workMinutes: 0, workFraction: 0, hasConfirmedHours: false, status: "not_recorded", sessions: [], observations: [], photoCount: 0,
    worksiteNames: unique(assignments.filter(item => item.employeeId === worker.employeeId).map(item => item.worksiteName ?? "")),
    shiftNames: unique(assignments.filter(item => item.employeeId === worker.employeeId).map(item => item.shiftName))
  });
  return [...rows.values()].sort((first, second) => first.workerName.localeCompare(second.workerName, "vi"));
}

export function ProjectWorkerTimesheet({ project, initialDate, initialSessions }: { project: ProjectDetail; initialDate?: string; initialSessions?: WorkerAttendanceSession[] }) {
  const user = useCurrentUser();
  const [date, setDate] = useState(initialDate ?? getBusinessDateKey);
  const [view, setView] = useState<"day" | "month">("day");
  const [worksiteId, setWorksiteId] = useState("");
  const [query, setQuery] = useState("");
  const [activeDayId, setActiveDayId] = useState<string>();
  const [activeWorker, setActiveWorker] = useState<ProjectWorkerDay>();
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const month = date.slice(0, 7), scope = `${project.id}:${month}`;
  const [loaded, setLoaded] = useState({ scope, sessions: initialSessions ?? [] });
  const [loading, setLoading] = useState(initialSessions === undefined);
  const [error, setError] = useState("");
  const inFlight = useRef<{ scope: string; controller: AbortController; pending: Promise<void> } | null>(null);
  const canReadPhotos = can(user.permissions, "worker_attendance.view_photo") || can(user.permissions, "worker_attendance.create");
  const load = useCallback(() => {
    if (inFlight.current?.scope === scope && !inFlight.current.controller.signal.aborted) return inFlight.current.pending;
    inFlight.current?.controller.abort();
    const controller = new AbortController();
    const pending = (async () => {
      setLoading(true); setError("");
      try {
        const { from, to } = monthBounds(month);
        const params = new URLSearchParams({ projectId: project.id, from, to });
        const sessions = await readWorkerResponse<WorkerAttendanceSession[]>(await fetch(`/api/v1/worker-attendance/sessions?${params}`, { cache: "no-store", signal: controller.signal }));
        if (!controller.signal.aborted) setLoaded({ scope, sessions });
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải bảng công."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    inFlight.current = { scope, controller, pending };
    void pending.finally(() => { if (inFlight.current?.pending === pending) inFlight.current = null; });
    return pending;
  }, [month, project.id, scope]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => { window.clearTimeout(timer); inFlight.current?.controller.abort(); inFlight.current = null; }; }, [load]);
  useDomainReconciliation("worker-attendance", load);
  const monthlyDays = useMemo(() => buildProjectWorkerDays(loaded.scope === scope ? loaded.sessions.filter(session => session.projectId === project.id && session.date.startsWith(`${month}-`) && (!worksiteId || session.worksiteId === worksiteId)) : []), [loaded, scope, project.id, month, worksiteId]);
  const visible = useMemo(() => {
    const rows = view === "month" ? monthlyDays : loaded.scope === scope && (!error || loaded.sessions.length) ? includeAssignedWorkers(project, date, worksiteId, monthlyDays.filter(day => day.date === date)) : [];
    return rows.filter(day => normalize(`${day.employeeCode} ${day.workerName}`).includes(normalize(query.trim())));
  }, [monthlyDays, date, query, view, loaded, scope, error, project, worksiteId]);
  const activeDay = monthlyDays.find(day => day.id === activeDayId) ?? (activeWorker ? includeAssignedWorkers(project, activeDayId?.slice(0, 10) ?? date, worksiteId, []).find(day => day.workerId === activeWorker.workerId) ?? { ...activeWorker, id: activeDayId ?? activeWorker.id, date: activeDayId?.slice(0, 10) ?? date, sessions: [], observations: [], workMinutes: 0, photoCount: 0, hasConfirmedHours: false } : undefined);
  const activeSession = activeDay?.sessions.find(session => session.id === activeSessionId);
  const clearInspection = () => { setActiveDayId(undefined); setActiveSessionId(undefined); setActiveWorker(undefined); };
  const changeDate = (value: string) => { if (/^\d{4}-\d{2}-\d{2}$/.test(value)) { clearInspection(); setDate(value); } };
  const changeMonth = (value: string) => { if (/^\d{4}-\d{2}$/.test(value)) changeDate(`${value}-${date.slice(8) > monthBounds(value).to.slice(8) ? monthBounds(value).to.slice(8) : date.slice(8)}`); };
  const moveDate = (direction: number) => {
    if (view === "day") { const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + direction); changeDate(next.toISOString().slice(0, 10)); }
    else { const next = new Date(`${month}-15T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + direction); changeMonth(next.toISOString().slice(0, 7)); }
  };
  const openDay = (day: ProjectWorkerDay) => { setActiveWorker(day); setActiveDayId(day.id); setActiveSessionId(undefined); };
  const totalMinutes = monthlyDays.reduce((total, day) => total + day.workMinutes, 0);
  const monthLabel = `${month.slice(5)}/${month.slice(0, 4)}`;
  const columns: DataTableColumn<ProjectWorkerDay>[] = [
    { id: "worker", header: "Công nhân", priority: "primary", sortable: true, sortValue: day => day.workerName, cell: day => <button aria-label={`Xem điểm danh ${day.workerName}`} className={styles.worker} onClick={() => openDay(day)} type="button"><span><strong>{day.workerName}</strong><small>{view === "month" ? formatBusinessDate(day.date) : ""}<span className={styles.mobileHours}> · {day.hasConfirmedHours ? `${hours(day.workMinutes)} giờ` : "Chưa đủ giờ"}</span></small></span><ChevronRight aria-hidden="true" size={17}/></button> },
    ...(view === "month" ? [{ id: "date", header: "Ngày", accessor: "date", hiddenOnMobile: true, sortable: true, cell: (day: ProjectWorkerDay) => formatBusinessDate(day.date) } satisfies DataTableColumn<ProjectWorkerDay>] : []),
    { id: "checkIn", header: "Giờ vào", cell: day => <time className={styles.clock} dateTime={day.checkedInAt}>{clock(day.checkedInAt)}</time> },
    { id: "checkOut", header: "Giờ ra", cell: day => <time className={styles.clock} dateTime={day.checkedOutAt}>{clock(day.checkedOutAt)}</time> },
    { id: "hours", header: "Giờ công", sortable: true, sortValue: day => day.workMinutes, align: "right", cell: day => day.hasConfirmedHours ? <strong className={styles.hours}>{hours(day.workMinutes)}</strong> : "—" },
    { id: "rounds", header: "Minh chứng", cell: day => day.sessions.length ? <Button className={styles.evidence} leftIcon={<Camera aria-hidden="true" size={15}/>} onClick={() => openDay(day)} size="sm" variant="ghost">{day.sessions.length} lượt · {day.photoCount} ảnh</Button> : "—" },
    { id: "site", header: "Công trường / ca", hiddenOnMobile: true, cell: day => <span className="record-identity"><span>{day.worksiteNames}</span><small>{day.shiftNames}</small></span> },
    { id: "status", header: "Trạng thái", cell: day => <StatusBadge tone={day.status === "present" ? "success" : ["missing_in", "missing_out", "needs_review", "late"].includes(day.status) ? "warning" : "neutral"}>{statusLabels[day.status]}</StatusBadge> }
  ];
  return <div className={styles.page}>
    <header className={styles.heading}><span className={styles.projectIcon}><UsersRound aria-hidden="true" size={21}/></span><div><h2>{project.name}</h2><span>{project.code}</span></div></header>
    <section aria-label={`Tổng hợp công nhân tháng ${monthLabel}`} className={styles.monthSummary}><header><CalendarDays aria-hidden="true" size={17}/><strong>Tháng {monthLabel}</strong>{loading ? <span role="status">Đang cập nhật…</span> : null}</header><dl><div><dt>Công nhân</dt><dd>{new Set(monthlyDays.filter(day => day.workFraction > 0).map(day => day.workerId)).size}</dd></div><div><dt>Ngày công</dt><dd>{new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(monthlyDays.reduce((total, day) => total + day.workFraction, 0))}</dd></div><div><dt>Giờ đã ghi</dt><dd>{hours(totalMinutes)}</dd></div><div><dt>Thiếu giờ</dt><dd>{monthlyDays.filter(day => day.status === "missing_in" || day.status === "missing_out").length}</dd></div></dl></section>
    <section aria-label="Bảng công công nhân của gói" className={styles.sheet}>
      <div className={styles.filters}><div className={styles.dateRow}><div aria-label="Phạm vi thời gian" className={styles.viewSwitch} role="group"><button aria-pressed={view === "day"} onClick={() => { clearInspection(); setView("day"); }} type="button">Ngày</button><button aria-pressed={view === "month"} onClick={() => { clearInspection(); setView("month"); }} type="button">Tháng</button></div><div className={styles.dateControl}><IconButton label={view === "day" ? "Ngày trước" : "Tháng trước"} onClick={() => moveDate(-1)}><ChevronLeft aria-hidden="true" size={17}/></IconButton>{view === "day" ? <Input label="Ngày xem công" onChange={event => changeDate(event.target.value)} type="date" value={date}/> : <Input label="Tháng xem công" onChange={event => changeMonth(event.target.value)} type="month" value={month}/>}<IconButton label={view === "day" ? "Ngày sau" : "Tháng sau"} onClick={() => moveDate(1)}><ChevronRight aria-hidden="true" size={17}/></IconButton></div><Button onClick={() => changeDate(getBusinessDateKey())} variant="ghost">{view === "day" ? "Hôm nay" : "Tháng này"}</Button></div><div className={styles.searchRow}><SearchInput label="Tìm công nhân trong bảng công" mobilePlaceholder="Tìm tên hoặc mã công nhân" onChange={event => { clearInspection(); setQuery(event.target.value); }} placeholder="Tìm tên hoặc mã công nhân" value={query}/>{project.worksites.length > 1 ? <Select label="Công trường" options={project.worksites.map(site => ({ value: site.id, label: site.name }))} placeholder="Tất cả công trường" onChange={event => { clearInspection(); setWorksiteId(event.target.value); }} value={worksiteId}/> : null}<IconButton disabled={loading} label="Cập nhật bảng công công nhân" onClick={() => void load()}><RefreshCw aria-hidden="true" size={17}/></IconButton></div></div>
      <div className={styles.tableStatus} role="status">{view === "day" ? formatBusinessDate(date) : `Tháng ${monthLabel}`} · {visible.length} dòng công</div>
      {error && visible.length ? <div className={styles.error} role="alert"><span>{error}</span><Button onClick={() => void load()} size="sm">Thử lại</Button></div> : null}
      <DataTable ariaLabel="Bảng công công nhân" className={`${styles.table} ${visible.length < 6 ? styles.compactTable : ""}`} columns={columns} data={visible} emptyDescription="" emptyTitle={query ? "Không tìm thấy công nhân" : view === "day" ? "Chưa có điểm danh trong ngày" : "Chưa có điểm danh trong tháng"} error={!visible.length ? error : undefined} getRowId={day => day.id} loading={loading && loaded.scope !== scope || loading && !loaded.sessions.length} onRetry={() => void load()} pageSize={15}/>
    </section>
    <Drawer className={styles.inspector} onClose={clearInspection} open={Boolean(activeDay)} title={activeDay ? `${activeDay.workerName} · ${formatBusinessDate(activeDay.date)}` : "Minh chứng điểm danh"}>
      {activeDay ? <div className={styles.inspectorBody}><div className={styles.calendarToolbar}><IconButton label="Tháng trước trong lịch công" onClick={() => { const next = new Date(`${month}-15T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() - 1); setDate(next.toISOString().slice(0,10)); setActiveDayId(`${next.toISOString().slice(0,7)}-01:${activeDay.workerId}`); setActiveSessionId(undefined); }}><ChevronLeft size={17}/></IconButton><strong>Tháng {monthLabel}</strong><IconButton label="Tháng sau trong lịch công" onClick={() => { const next = new Date(`${month}-15T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1); setDate(next.toISOString().slice(0,10)); setActiveDayId(`${next.toISOString().slice(0,7)}-01:${activeDay.workerId}`); setActiveSessionId(undefined); }}><ChevronRight size={17}/></IconButton></div><div className={styles.calendar} aria-label={`Lịch chấm công ${activeDay.workerName}`}><div className={styles.calendarWeek}>{["T2","T3","T4","T5","T6","T7","CN"].map(label => <span key={label}>{label}</span>)}</div><div className={styles.calendarDays}>{Array.from({ length: (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7 }, (_, i) => <span key={`blank-${i}`}/>)}{Array.from({ length: Number(monthBounds(month).to.slice(8)) }, (_, i) => { const dayDate = `${month}-${String(i+1).padStart(2,"0")}`; const item = monthlyDays.find(day => day.workerId === activeDay.workerId && day.date === dayDate); return <button key={dayDate} type="button" aria-label={`${formatBusinessDate(dayDate)} · ${item ? `${hours(item.workMinutes)} giờ · ${item.sessions.length} lượt` : "Chưa điểm danh"}`} aria-pressed={activeDay.date === dayDate} data-recorded={Boolean(item)} onClick={() => { setActiveDayId(`${dayDate}:${activeDay.workerId}`); setActiveSessionId(undefined); }}><strong>{i+1}</strong><small>{item ? `${hours(item.workMinutes)}h` : "—"}</small></button>; })}</div></div>{!activeDay.sessions.length ? <p role="status">Chưa có điểm danh ngày {formatBusinessDate(activeDay.date)}</p> : null}<div className={styles.dayTotal}><strong>{activeDay.hasConfirmedHours ? `${hours(activeDay.workMinutes)} giờ công` : "Chưa đủ giờ vào / ra"}</strong><span>{activeDay.sessions.length} lượt · {activeDay.photoCount} ảnh</span></div>{activeSession ? <><Button leftIcon={<ChevronLeft aria-hidden="true" size={16}/>} onClick={() => setActiveSessionId(undefined)} size="sm" variant="ghost">Các lượt điểm danh</Button><WorkerAttendanceSessionDetail embedded readOnly reviewOnly sessionId={activeSession.id}/></> : <div className={styles.rounds}>{activeDay.observations.map(observation => <article key={observation.session.id}><header><strong>{clock(observation.session.startedAt)}</strong><StatusBadge tone={observation.session.status === "needs_review" ? "warning" : "success"}>{observation.session.status === "needs_review" ? "Cần rà soát" : "Đã gửi"}</StatusBadge></header><span>{observation.session.worksiteName} · {observation.session.shiftName}</span><span>Giám sát · {observation.session.supervisorName}</span><dl><div><dt>Giờ vào</dt><dd>{clock(observation.checkedInAt)}</dd></div><div><dt>Giờ ra</dt><dd>{clock(observation.checkedOutAt)}</dd></div></dl>{canReadPhotos ? <Button onClick={() => setActiveSessionId(observation.session.id)} rightIcon={<ChevronRight aria-hidden="true" size={16}/>} variant="secondary">Xem lượt · {observation.session.photos.length} ảnh</Button> : <span>{observation.session.photos.length} ảnh · Theo quyền truy cập</span>}</article>)}</div>}</div> : null}
    </Drawer>
  </div>;
}
