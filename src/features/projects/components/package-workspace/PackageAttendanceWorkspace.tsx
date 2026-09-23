"use client";

import { Bell, CheckCircle2, Download, MoreHorizontal, Plus, Search, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Checkbox, Input, Select } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { EmptyState, ErrorState, PermissionDeniedState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { workerCategoryLabels } from "@/features/employees/services/employeeService";
import type { EmployeeSummary, WorkerCategory } from "@/features/employees/types";
import type { AssignmentRole, ProjectAssignment, ProjectDetail } from "@/features/projects/types/projectTypes";
import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";

import { MobileActionBar } from "./MobileActionBar";
import styles from "./PackageWorkspace.module.css";

const roleLabels: Record<AssignmentRole, string> = {
  project_manager: "Quản lý dự án",
  engineer: "Kỹ sư",
  supervisor_main: "Giám sát chính",
  supervisor_replacement: "Giám sát thay thế",
  worker: "Công nhân",
  support: "Hỗ trợ"
};

const attendanceStatus = {
  unconfirmed: { label: "Chưa xử lý", tone: "warning" as const },
  present: { label: "Có mặt", tone: "success" as const },
  absent: { label: "Vắng", tone: "error" as const },
  leave: { label: "Nghỉ", tone: "neutral" as const },
  late: { label: "Đi muộn", tone: "warning" as const },
  transferred: { label: "Điều chuyển", tone: "info" as const }
};

function safeJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export function PackageAttendanceWorkspace({
  project,
  today,
  todayRoster,
  attendanceSessions,
  canManageTeam,
  canOpenAttendance,
  canViewAttendance,
  canAdjustAttendance,
  canExportAttendance
}: {
  project: ProjectDetail;
  today: string;
  todayRoster: ProjectAssignment[];
  attendanceSessions: WorkerAttendanceSession[];
  canManageTeam: boolean;
  canOpenAttendance: boolean;
  canViewAttendance: boolean;
  canAdjustAttendance: boolean;
  canExportAttendance: boolean;
}) {
  const [members, setMembers] = useState(project.assignments);
  const [query, setQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [reminding, setReminding] = useState(false);
  const activeMembers = members.filter((member) => member.status === "active");
  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi-VN");
    return activeMembers.filter((member) => !normalized || `${member.employeeName} ${member.employeeCode} ${roleLabels[member.assignmentRole]}`.toLocaleLowerCase("vi-VN").includes(normalized));
  }, [activeMembers, query]);
  const todaySessions = attendanceSessions.filter((session) => session.date === today);
  const session = todaySessions.find((item) => item.sessionType === "morning") ?? todaySessions[0];
  const entries = session?.entries ?? [];
  const unprocessed = session
    ? entries.filter((entry) => entry.status === "unconfirmed").length
    : todayRoster.filter((member) => member.assignmentRole === "worker" && !member.approvedLeave).length;
  const shift = todayRoster.find((member) => member.assignmentRole === "worker") ?? todayRoster[0];
  const attendanceHref = `/worker-attendance/today?projectId=${project.id}`;
  const month = today.slice(0, 7);

  async function remindSupervisor() {
    setReminding(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/worker-attendance/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id, date: today })
      });
      const body = await safeJson<{ error?: { message?: string } }>(response);
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể gửi nhắc nhở.");
      setMessage("Đã gửi nhắc chấm công.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Không thể gửi nhắc nhở.");
    } finally {
      setReminding(false);
    }
  }

  const startButton = canOpenAttendance || canAdjustAttendance ? (
    <Link className="button button--primary button--md" href={attendanceHref}>
      <span>{session ? "Tiếp tục chấm công" : "Bắt đầu chấm công"}</span>
    </Link>
  ) : null;

  return (
    <section className={styles.attendanceWorkspace}>
      <header className={styles.workspaceHeading}>
        <div>
          <h2>Chấm công</h2>
          <p>{activeMembers.length} nhân sự · {canViewAttendance ? unprocessed : "—"} chưa xử lý · {shift ? `${shift.shiftName} ${shift.shiftStart}–${shift.shiftEnd}` : "Chưa có ca"}</p>
        </div>
        <div className={styles.headingActions}>
          {canManageTeam ? <Button leftIcon={<Plus aria-hidden="true" size={16} />} onClick={() => setAssignOpen(true)}>Phân công</Button> : null}
          <div className={styles.desktopOnly}>{startButton}</div>
        </div>
      </header>
      {message ? <p className={styles.statusMessage} role="status">{message}</p> : null}
      <div className={styles.attendanceLayout}>
        <div className={styles.peoplePanel}>
          <div className={styles.panelTitle}><h3>Danh sách nhân sự</h3><span>{filteredMembers.length}</span></div>
          <label className={styles.searchControl}>
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Tìm nhân sự</span>
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, mã, vai trò" type="search" value={query} />
          </label>
          <div className={styles.peopleList}>
            {filteredMembers.map((member) => {
              const entry = entries.find((item) => item.workerId === member.employeeId);
              const status = entry ? attendanceStatus[entry.status] : attendanceStatus.unconfirmed;
              return (
                <article className={styles.personRow} key={member.id}>
                  <Avatar name={member.employeeName} />
                  <span><strong>{member.employeeName}</strong><small>{member.employeeCode} · {roleLabels[member.assignmentRole]}</small></span>
                  {canViewAttendance ? <StatusBadge tone={status.tone}>{status.label}</StatusBadge> : null}
                  <DropdownMenu label={`Thao tác ${member.employeeName}`} trigger={<span className={styles.rowMenu}><MoreHorizontal aria-hidden="true" size={18} /></span>}>
                    <Link href={`/employees/${member.employeeId}/profile`}>Xem hồ sơ</Link>
                  </DropdownMenu>
                </article>
              );
            })}
            {!filteredMembers.length ? <EmptyState title={activeMembers.length ? "Không tìm thấy nhân sự" : "Chưa có nhân sự"} /> : null}
          </div>
        </div>

        <aside className={styles.sessionPanel}>
          <div className={styles.panelTitle}><h3>Phiên điểm danh hôm nay</h3><span>{new Date(`${today}T12:00:00`).toLocaleDateString("vi-VN")}</span></div>
          {!canViewAttendance ? <PermissionDeniedState title="Không có quyền xem chấm công" /> : session ? (
            <div className={styles.sessionBody}>
              <div className={styles.sessionState}><CheckCircle2 aria-hidden="true" size={20} /><span><strong>{session.shiftName}</strong><small>{session.worksiteName}</small></span><StatusBadge tone={session.status === "submitted" || session.status === "locked" ? "success" : "warning"}>{session.status === "submitted" || session.status === "locked" ? "Đã hoàn tất" : "Đang xử lý"}</StatusBadge></div>
              <dl className={styles.sessionCounts}>
                <div><dt>Có mặt</dt><dd>{entries.filter((entry) => entry.status === "present").length}</dd></div>
                <div><dt>Đi muộn</dt><dd>{entries.filter((entry) => entry.status === "late").length}</dd></div>
                <div><dt>Nghỉ / Vắng</dt><dd>{entries.filter((entry) => entry.status === "leave" || entry.status === "absent").length}</dd></div>
                <div><dt>Chưa xử lý</dt><dd>{unprocessed}</dd></div>
              </dl>
              <div className={styles.sessionEvidence}><span>Ảnh toàn cảnh</span><StatusBadge tone={session.photos.length ? "success" : "warning"}>{session.photos.length ? `${session.photos.length} ảnh` : "Chưa có"}</StatusBadge></div>
            </div>
          ) : (
            <div className={styles.noSession}>
              <UserRoundPlus aria-hidden="true" size={24} />
              <strong>{todayRoster.filter((member) => member.assignmentRole === "worker").length} người đang chờ điểm danh</strong>
              {canAdjustAttendance ? <Button disabled={reminding} leftIcon={<Bell aria-hidden="true" size={16} />} onClick={() => void remindSupervisor()}>{reminding ? "Đang gửi" : "Nhắc chấm công"}</Button> : null}
            </div>
          )}
          <div className={styles.sessionActions}>
            <Link href={`/worker-attendance?projectId=${project.id}`}>Lịch sử</Link>
            {canExportAttendance ? <a href={`/api/v1/worker-attendance/export?projectId=${project.id}&month=${month}`}><Download aria-hidden="true" size={16} /> Xuất Excel</a> : null}
          </div>
        </aside>
      </div>
      {startButton ? <MobileActionBar>{startButton}</MobileActionBar> : null}
      <AssignMembersDrawer
        canManageTeam={canManageTeam}
        onAssigned={(created, nextMessage) => { setMembers((current) => [...created, ...current]); setMessage(nextMessage); }}
        onClose={() => setAssignOpen(false)}
        open={assignOpen}
        project={project}
        today={today}
      />
    </section>
  );
}

function AssignMembersDrawer({ project, today, open, onClose, onAssigned, canManageTeam }: { project: ProjectDetail; today: string; open: boolean; onClose: () => void; onAssigned: (created: ProjectAssignment[], message: string) => void; canManageTeam: boolean }) {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<WorkerCategory | "all">("all");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open || employees.length || !canManageTeam) return;
    const controller = new AbortController();
    async function loadEmployees() {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/v1/employees?status=active&pageSize=100", { signal: controller.signal });
        const body = await safeJson<{ data?: { employees?: { items?: EmployeeSummary[] } }; error?: { message?: string } }>(response);
        if (!response.ok) throw new Error(body.error?.message ?? "Không thể tải danh sách nhân sự.");
        setEmployees(body.data?.employees?.items ?? []);
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setLoadError(reason instanceof Error ? reason.message : "Không thể tải danh sách nhân sự.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadEmployees();
    return () => controller.abort();
  }, [canManageTeam, employees.length, open]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi-VN");
    return employees.filter((employee) => (category === "all" || employee.workerCategory === category) && (!normalized || `${employee.employeeCode} ${employee.displayName} ${employee.departmentName}`.toLocaleLowerCase("vi-VN").includes(normalized)));
  }, [category, employees, query]);

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function close() {
    if (submitting) return;
    setSelected(new Set());
    setSubmitError("");
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.size) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      worksiteId: form.get("worksiteId") || undefined,
      assignmentRole: form.get("assignmentRole"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate") || undefined,
      shiftCode: form.get("shiftCode"),
      shiftName: form.get("shiftName"),
      shiftStart: form.get("shiftStart"),
      shiftEnd: form.get("shiftEnd")
    };
    setSubmitting(true);
    setSubmitError("");
    const results = await Promise.allSettled([...selected].map(async (employeeId) => {
      const response = await fetch(`/api/v1/projects/${project.id}/assignments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, employeeId })
      });
      const body = await safeJson<{ data?: ProjectAssignment; error?: { message?: string } }>(response);
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể phân công nhân sự.");
      return body.data;
    }));
    setSubmitting(false);
    const created = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const failed = results.filter((result) => result.status === "rejected");
    if (created.length) onAssigned(created, `Đã phân công ${created.length} nhân sự.`);
    if (failed.length) setSubmitError(failed[0]?.reason instanceof Error ? failed[0].reason.message : "Một số nhân sự chưa được phân công.");
    else close();
  }

  return (
    <Drawer onClose={close} open={open} title="Phân công nhân sự">
      <form className={styles.assignDrawer} onSubmit={submit}>
        <Input label="Tìm nhân sự" onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, phòng ban" value={query} />
        <Select label="Loại nhân sự" onChange={(event) => setCategory(event.target.value as WorkerCategory | "all")} options={[{ value: "all", label: "Tất cả loại" }, ...Object.entries(workerCategoryLabels).map(([value, label]) => ({ value, label }))]} value={category} />
        {loadError ? <ErrorState action={<Button onClick={() => { setEmployees([]); setLoadError(""); }}>Tải lại</Button>} description={loadError} /> : (
          <div className={styles.employeePicker} aria-busy={loading}>
            {loading ? Array.from({ length: 5 }).map((_, index) => <span className={styles.employeeSkeleton} key={index} />) : visible.map((employee) => (
              <label key={employee.id}>
                <Checkbox checked={selected.has(employee.id)} label="" onChange={(event) => toggle(employee.id, event.target.checked)} />
                <Avatar name={employee.displayName} />
                <span><strong>{employee.displayName}</strong><small>{employee.employeeCode} · {employee.departmentName}</small></span>
              </label>
            ))}
          </div>
        )}
        <div className={styles.assignGrid}>
          <Select label="Vai trò dự án" name="assignmentRole" options={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))} required />
          <Select label="Công trường" name="worksiteId" options={project.worksites.filter((site) => site.status === "active").map((site) => ({ value: site.id, label: site.name }))} placeholder="Toàn dự án" />
          <Input defaultValue={today} label="Từ ngày" name="startDate" required type="date" />
          <Input label="Đến ngày" name="endDate" type="date" />
          <Input defaultValue="DAY" label="Mã ca" name="shiftCode" required />
          <Input defaultValue="Ca ngày" label="Tên ca" name="shiftName" required />
          <Input defaultValue="07:00" label="Bắt đầu" name="shiftStart" required type="time" />
          <Input defaultValue="17:00" label="Kết thúc" name="shiftEnd" required type="time" />
        </div>
        {submitError ? <p className={styles.inlineError} role="alert">{submitError}</p> : null}
        <footer className={styles.drawerFooter}><span>{selected.size} người đã chọn</span><div><Button disabled={submitting} onClick={close}>Hủy</Button><Button disabled={!selected.size || submitting} type="submit" variant="primary">{submitting ? "Đang phân công" : "Phân công"}</Button></div></footer>
      </form>
    </Drawer>
  );
}
