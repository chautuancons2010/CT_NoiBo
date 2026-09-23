"use client";

import { CircleAlert, FilePlus2, MoreHorizontal, Pencil, Plus, RefreshCw, Users } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/shared/Button";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Checkbox, Input, SearchInput, Select, Textarea } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { EmptyState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { DailySchedule, ProjectProgressNode } from "@/features/projects/types/projectTypes";

import { MobileActionBar } from "./MobileActionBar";
import styles from "./PackageWorkspace.module.css";

interface AssigneeOption { id: string; label: string }

const typeLabels: Record<ProjectProgressNode["nodeType"], string> = {
  phase: "Giai đoạn",
  work_item: "Gói công việc",
  task: "Đầu việc",
  milestone: "Mốc kiểm soát",
  acceptance: "Nghiệm thu"
};

const statusLabels: Record<ProjectProgressNode["status"], string> = {
  not_started: "Chưa triển khai",
  in_progress: "Đang thi công",
  blocked: "Đang vướng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy"
};

function statusTone(status: ProjectProgressNode["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "blocked") return "error" as const;
  if (status === "in_progress") return "info" as const;
  return "neutral" as const;
}

function formatDate(value?: string) {
  if (!value) return "Chưa đặt hạn";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
}

export function PackageConstructionWorkspace({
  projectId,
  canEdit,
  canFieldUpdate,
  initialNodes,
  schedule,
  initialLoadError,
  scheduleLoadError
}: {
  projectId: string;
  canEdit: boolean;
  canFieldUpdate: boolean;
  initialNodes: ProjectProgressNode[];
  schedule: DailySchedule[];
  initialLoadError?: string;
  scheduleLoadError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [nodes, setNodes] = useState(initialNodes);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [editing, setEditing] = useState<ProjectProgressNode>();
  const [parentId, setParentId] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(initialLoadError ?? "");
  const [mutating, setMutating] = useState<string>();
  const fieldUpdateOpen = searchParams.get("mode") === "field-update";
  const fieldUpdateNodeId = searchParams.get("task") ?? undefined;

  useEffect(() => {
    if (!editorOpen || assignees.length || !canEdit) return;
    const controller = new AbortController();
    async function loadAssignees() {
      setLoadingAssignees(true);
      try {
        const response = await fetch("/api/v1/employees?status=active&pageSize=100", { signal: controller.signal });
        const body = await response.json() as { data?: { employees?: { items?: Array<{ id: string; employeeCode: string; displayName: string }> } }; error?: { message?: string } };
        if (!response.ok) throw new Error(body.error?.message ?? "Không thể tải danh sách nhân sự.");
        setAssignees((body.data?.employees?.items ?? []).map((employee) => ({ id: employee.id, label: `${employee.employeeCode} · ${employee.displayName}` })));
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Không thể tải danh sách nhân sự.");
      } finally {
        if (!controller.signal.aborted) setLoadingAssignees(false);
      }
    }
    void loadAssignees();
    return () => controller.abort();
  }, [assignees.length, canEdit, editorOpen]);

  const roots = useMemo(() => nodes.filter((node) => !node.parentId), [nodes]);
  const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
  const visibleNodeIds = useMemo(() => {
    const visible = new Set<string>();
    const children = new Map<string, ProjectProgressNode[]>();
    for (const node of nodes) if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
    function visit(node: ProjectProgressNode): boolean {
      const childMatches = (children.get(node.id) ?? []).some(visit);
      const queryMatches = !normalizedQuery || `${node.name} ${node.assigneeName ?? ""}`.toLocaleLowerCase("vi-VN").includes(normalizedQuery);
      const statusMatches = statusFilter === "all" || node.status === statusFilter;
      if ((queryMatches && statusMatches) || childMatches) visible.add(node.id);
      return (queryMatches && statusMatches) || childMatches;
    }
    roots.forEach(visit);
    return visible;
  }, [nodes, normalizedQuery, roots, statusFilter]);
  const overall = roots.length ? Math.round(roots.reduce((sum, node) => sum + node.completionPercent, 0) / roots.length) : 0;
  const blocked = nodes.filter((node) => node.status === "blocked");

  function openCreate(nextParentId?: string) {
    setEditing(undefined);
    setParentId(nextParentId);
    setError("");
    setEditorOpen(true);
  }

  function openEdit(node: ProjectProgressNode) {
    setEditing(node);
    setParentId(undefined);
    setError("");
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(undefined);
    setParentId(undefined);
    setError("");
  }

  function setFieldUpdateMode(nodeId?: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("mode", "field-update");
    if (nodeId) next.set("task", nodeId); else next.delete("task");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function closeFieldUpdate() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("mode");
    next.delete("task");
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  }

  async function quickUpdate(node: ProjectProgressNode, patch: Partial<Pick<ProjectProgressNode, "status" | "completionPercent">>, action: string) {
    if (mutating) return;
    setMutating(`${node.id}:${action}`);
    setError("");
    try {
      const completionPercent = patch.status === "completed" ? 100 : Math.min(100, Math.max(0, patch.completionPercent ?? node.completionPercent));
      const response = await fetch(`/api/v1/projects/${projectId}/progress`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...node, ...patch, completionPercent })
      });
      const body = await response.json() as { data?: ProjectProgressNode[]; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể cập nhật tiến độ.");
      setNodes(body.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật tiến độ.");
    } finally {
      setMutating(undefined);
    }
  }

  async function reload() {
    setReloading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/progress`, { cache: "no-store" });
      const body = await response.json() as { data?: ProjectProgressNode[]; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải tiến độ thi công.");
      setNodes(body.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải tiến độ thi công.");
    } finally {
      setReloading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/projects/${projectId}/progress`, {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        rowVersion: editing?.rowVersion,
        parentId: editing?.parentId ?? parentId,
        nodeType: form.get("nodeType"),
        name: form.get("name"),
        status: form.get("status"),
        completionPercent: Number(form.get("completionPercent")),
        deadline: form.get("deadline") || undefined,
        assigneeEmployeeId: form.get("assigneeEmployeeId") || undefined,
        sortOrder: editing?.sortOrder ?? nodes.length
      })
    });
    const body = await response.json() as { data?: ProjectProgressNode[]; error?: { message?: string } };
    if (!response.ok || !body.data) { setError(body.error?.message ?? "Không thể lưu công việc."); return; }
    setNodes(body.data);
    closeEditor();
  }

  function branch(node: ProjectProgressNode, depth = 0): ReactNode {
    if (!visibleNodeIds.has(node.id)) return null;
    const children = nodes.filter((item) => item.parentId === node.id);
    return (
      <div className={styles.taskBranch} key={node.id}>
        <article className={styles.taskRow} data-status={node.status} style={{ "--task-depth": depth } as CSSProperties}>
          <button className={styles.taskName} onClick={() => canFieldUpdate ? setFieldUpdateMode(node.id) : undefined} type="button">
            <strong>{node.name}</strong><small>{typeLabels[node.nodeType]}</small>
          </button>
          <span className={styles.taskOwner}>{node.assigneeName ?? "Chưa phân công"}</span>
          <time className={styles.taskDeadline} dateTime={node.deadline}>{formatDate(node.deadline)}</time>
          <span className={styles.taskProgress}><span><i style={{ width: `${node.completionPercent}%` }} /></span><strong>{node.completionPercent}%</strong></span>
          <StatusBadge tone={statusTone(node.status)}>{statusLabels[node.status]}</StatusBadge>
          {canEdit ? (
            <DropdownMenu label={`Thao tác ${node.name}`} trigger={<span className={styles.rowMenu}><MoreHorizontal aria-hidden="true" size={18} /></span>}>
              <button disabled={mutating?.startsWith(node.id)} onClick={() => void quickUpdate(node, { completionPercent: node.completionPercent + 5, status: "in_progress" }, "plus-5")} type="button">+5% tiến độ</button>
              <button disabled={mutating?.startsWith(node.id)} onClick={() => void quickUpdate(node, { completionPercent: node.completionPercent + 10, status: "in_progress" }, "plus-10")} type="button">+10% tiến độ</button>
              <button disabled={mutating?.startsWith(node.id)} onClick={() => void quickUpdate(node, { status: "blocked" }, "blocked")} type="button">Đánh dấu vướng</button>
              <button disabled={mutating?.startsWith(node.id)} onClick={() => void quickUpdate(node, { status: "completed", completionPercent: 100 }, "completed")} type="button">Hoàn thành</button>
              <button onClick={() => openEdit(node)} type="button"><Pencil aria-hidden="true" size={15} /> Chỉnh sửa</button>
              <button onClick={() => openCreate(node.id)} type="button"><Plus aria-hidden="true" size={15} /> Thêm cấp con</button>
            </DropdownMenu>
          ) : <span />}
          {canEdit ? (
            <div className={styles.mobileQuickActions}>
              <button disabled={mutating?.startsWith(node.id)} onClick={() => void quickUpdate(node, { completionPercent: node.completionPercent + 5, status: "in_progress" }, "plus-5")} type="button">+5%</button>
              <button disabled={mutating?.startsWith(node.id)} onClick={() => void quickUpdate(node, { completionPercent: node.completionPercent + 10, status: "in_progress" }, "plus-10")} type="button">+10%</button>
              <button disabled={mutating?.startsWith(node.id)} onClick={() => void quickUpdate(node, { status: "blocked" }, "blocked")} type="button">Vướng</button>
            </div>
          ) : null}
        </article>
        {children.map((child) => branch(child, depth + 1))}
      </div>
    );
  }

  const updateButton = canFieldUpdate ? (
    <Button leftIcon={<FilePlus2 aria-hidden="true" size={17} />} onClick={() => setFieldUpdateMode()} variant="primary">Cập nhật hiện trường</Button>
  ) : null;

  return (
    <section className={styles.constructionWorkspace}>
      <header className={styles.workspaceHeading}>
        <div><h2>Thi công &amp; Tiến độ</h2><p>{overall}% hoàn thành · {nodes.filter((node) => node.status === "in_progress").length} đang thi công · {blocked.length} vướng</p></div>
        <div className={styles.headingActions}>
          <Button aria-label="Tải lại tiến độ" disabled={reloading} leftIcon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => void reload()}>{reloading ? "Đang tải" : "Tải lại"}</Button>
          {canEdit ? <Button leftIcon={<Plus aria-hidden="true" size={16} />} onClick={() => openCreate()}>Công việc</Button> : null}
          <div className={styles.desktopOnly}>{updateButton}</div>
        </div>
      </header>
      <div className={styles.constructionLayout}>
        <div className={styles.taskPanel}>
          <div className={styles.taskToolbar}>
            <div className={styles.panelTitle}><h3>Hạng mục &amp; Công việc</h3><span>{roots.length}</span></div>
            <div className={styles.taskFilters}>
              <SearchInput label="Tìm công việc" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm công việc, phụ trách" value={query} />
              <Select label="Trạng thái" labelHidden onChange={(event) => setStatusFilter(event.target.value)} options={[{ value: "all", label: "Tất cả trạng thái" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} value={statusFilter} />
            </div>
          </div>
          {error && !editorOpen ? <div className={styles.inlineError} role="alert"><CircleAlert aria-hidden="true" size={17} /> <span>{error}</span></div> : null}
          <div className={styles.taskTableHeader} aria-hidden="true"><span>Công việc</span><span>Phụ trách</span><span>Hạn</span><span>Tiến độ</span><span>Trạng thái</span><span /></div>
          <div className={styles.taskList}>
            {roots.some((node) => visibleNodeIds.has(node.id)) ? roots.map((node) => branch(node)) : <EmptyState action={canEdit && !nodes.length ? <Button onClick={() => openCreate()} variant="primary">Thêm công việc</Button> : undefined} title={nodes.length ? "Không có công việc phù hợp" : "Chưa có công việc"} />}
          </div>
        </div>
        <aside className={styles.lookaheadPanel}>
          <div className={styles.panelTitle}><h3>Hôm nay &amp; 7 ngày</h3><span>{schedule.reduce((sum, day) => sum + day.workerCount, 0)} lượt công</span></div>
          {scheduleLoadError ? <p className={styles.inlineError} role="alert">{scheduleLoadError}</p> : null}
          <div className={styles.lookaheadList}>
            {schedule.map((day) => (
              <article key={`${day.date}-${day.worksiteId}`}>
                <time dateTime={day.date}>{formatDate(day.date)}</time>
                <span><strong>{day.worksiteName}</strong><small>{day.supervisorNames.join(", ") || "Chưa có giám sát"}</small></span>
                <span><Users aria-hidden="true" size={14} /> {day.workerCount}</span>
              </article>
            ))}
            {!schedule.length ? <EmptyState title="Chưa có lịch thi công" /> : null}
          </div>
          {blocked.length ? (
            <section className={styles.blockedPanel}>
              <h4><CircleAlert aria-hidden="true" size={16} /> Đang vướng</h4>
              {blocked.slice(0, 5).map((node) => <button key={node.id} onClick={() => canFieldUpdate ? setFieldUpdateMode(node.id) : undefined} type="button"><span>{node.name}</span><strong>{node.completionPercent}%</strong></button>)}
            </section>
          ) : null}
        </aside>
      </div>
      {updateButton ? <MobileActionBar>{updateButton}</MobileActionBar> : null}
      <FieldUpdateDrawer initialNodeId={fieldUpdateNodeId} key={`${fieldUpdateOpen}-${fieldUpdateNodeId ?? "new"}`} nodes={nodes} onClose={closeFieldUpdate} onSaved={setNodes} open={canFieldUpdate && fieldUpdateOpen} projectId={projectId} />
      <Drawer onClose={closeEditor} open={editorOpen} title={editing ? "Cập nhật công việc" : parentId ? "Thêm công việc con" : "Thêm công việc"}>
        <form className={styles.editorForm} key={editing?.id ?? parentId ?? "new"} onSubmit={submit}>
          <Input defaultValue={editing?.name} label="Tên công việc" name="name" required />
          <Select defaultValue={editing?.nodeType ?? (parentId ? "task" : "work_item")} label="Loại công việc" name="nodeType" options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} />
          <Select defaultValue={editing?.status ?? "not_started"} label="Trạng thái" name="status" options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
          <Input defaultValue={editing?.completionPercent ?? 0} label="Hoàn thành (%)" max="100" min="0" name="completionPercent" required type="number" />
          <Input defaultValue={editing?.deadline} label="Hạn hoàn thành" name="deadline" type="date" />
          <Select defaultValue={editing?.assigneeEmployeeId} disabled={loadingAssignees} label="Người phụ trách" name="assigneeEmployeeId" options={assignees.map((employee) => ({ value: employee.id, label: employee.label }))} placeholder={loadingAssignees ? "Đang tải" : "Chưa phân công"} />
          {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
          <footer className={styles.drawerFooter}><span /><div><Button onClick={closeEditor}>Hủy</Button><Button type="submit" variant="primary">Lưu</Button></div></footer>
        </form>
      </Drawer>
    </section>
  );
}

function FieldUpdateDrawer({ projectId, nodes, initialNodeId, open, onClose, onSaved }: { projectId: string; nodes: ProjectProgressNode[]; initialNodeId?: string; open: boolean; onClose: () => void; onSaved: (nodes: ProjectProgressNode[]) => void }) {
  const selectableNodes = nodes.filter((node) => node.nodeType !== "phase");
  const initialNode = selectableNodes.find((node) => node.id === initialNodeId) ?? selectableNodes[0];
  const [nodeId, setNodeId] = useState(initialNode?.id ?? "");
  const [status, setStatus] = useState<ProjectProgressNode["status"]>(initialNode?.status === "completed" ? "completed" : initialNode?.status === "blocked" ? "blocked" : "in_progress");
  const [percent, setPercent] = useState(initialNode?.completionPercent ?? 0);
  const [hasIssue, setHasIssue] = useState(initialNode?.status === "blocked");
  const [issue, setIssue] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clientUpdateId, setClientUpdateId] = useState(() => crypto.randomUUID());
  const selectedNode = nodes.find((node) => node.id === nodeId);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function chooseNode(nextId: string) {
    const nextNode = nodes.find((node) => node.id === nextId);
    setNodeId(nextId);
    if (!nextNode) return;
    setPercent(nextNode.completionPercent);
    setStatus(nextNode.status === "completed" ? "completed" : nextNode.status === "blocked" ? "blocked" : "in_progress");
    setHasIssue(nextNode.status === "blocked");
  }

  function changeFiles(nextFiles: File[]) {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNode || saving) return;
    setSaving(true);
    setError("");
    try {
      const finalStatus = hasIssue ? "blocked" : status;
      const finalPercent = finalStatus === "completed" ? 100 : percent;
      const progressResponse = await fetch(`/api/v1/projects/${projectId}/progress`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...selectedNode, status: finalStatus, completionPercent: finalPercent })
      });
      const progressBody = await progressResponse.json() as { data?: ProjectProgressNode[]; error?: { message?: string } };
      if (!progressResponse.ok || !progressBody.data) throw new Error(progressBody.error?.message ?? "Không thể cập nhật tiến độ.");
      onSaved(progressBody.data);
      const content = [`${selectedNode.name}: ${finalPercent}% · ${statusLabels[finalStatus]}`, hasIssue && issue.trim() ? `Vướng mắc: ${issue.trim()}` : "", note.trim()].filter(Boolean).join("\n");
      const updateResponse = await fetch(`/api/v1/projects/${projectId}/updates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientUpdateId, updateType: hasIssue ? "issue" : "progress", title: selectedNode.name, content, status: hasIssue ? "waiting" : finalStatus === "completed" ? "done" : "in_progress", publishStatus: "published", issueFlag: hasIssue, issueSeverity: hasIssue ? "medium" : undefined, capturedAtClient: new Date().toISOString() })
      });
      const updateBody = await updateResponse.json() as { data?: { id: string }; error?: { message?: string } };
      if (!updateResponse.ok || !updateBody.data) throw new Error(updateBody.error?.message ?? "Không thể lưu cập nhật hiện trường.");
      for (const file of files) {
        const payload = new FormData();
        payload.set("file", file);
        const uploadResponse = await fetch(`/api/v1/project-updates/${updateBody.data.id}/attachments`, { method: "POST", body: payload });
        if (!uploadResponse.ok) throw new Error("Đã lưu tiến độ nhưng chưa tải được một ảnh hiện trường.");
      }
      setClientUpdateId(crypto.randomUUID());
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu cập nhật hiện trường.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer onClose={() => { if (!saving) onClose(); }} open={open} title="Cập nhật hiện trường">
      <form className={styles.fieldUpdateForm} onSubmit={save}>
        <Select label="Hạng mục" name="nodeId" onChange={(event) => chooseNode(event.target.value)} options={selectableNodes.map((node) => ({ value: node.id, label: node.name }))} placeholder="Chọn hạng mục" required value={nodeId} />
        <fieldset className={styles.segmentedControl}><legend>Trạng thái</legend>{(["in_progress", "blocked", "completed"] as const).map((value) => <button aria-pressed={status === value} key={value} onClick={() => { setStatus(value); if (value === "blocked") setHasIssue(true); if (value === "completed") setPercent(100); }} type="button">{statusLabels[value]}</button>)}</fieldset>
        <div className={styles.progressEditor}><header><span>Tiến độ</span><strong>{percent}%</strong></header><div><i style={{ width: `${percent}%` }} /></div><section><Button onClick={() => setPercent((value) => Math.max(0, value - 5))} size="sm">−5</Button><Button onClick={() => setPercent((value) => Math.min(100, value + 5))} size="sm">+5</Button><Button onClick={() => setPercent((value) => Math.min(100, value + 10))} size="sm">+10</Button><Button onClick={() => setPercent(100)} size="sm">100%</Button></section></div>
        <Checkbox checked={hasIssue} label="Có vướng mắc" onChange={(event) => { setHasIssue(event.target.checked); if (event.target.checked) setStatus("blocked"); }} />
        {hasIssue ? <Input label="Vướng mắc" maxLength={180} onChange={(event) => setIssue(event.target.value)} required value={issue} /> : null}
        <label className={styles.photoUpload}><span>Ảnh hiện trường</span><strong><FilePlus2 aria-hidden="true" size={17} /> Chụp ảnh / Tải ảnh</strong><input accept="image/jpeg,image/png,image/webp" capture="environment" multiple onChange={(event) => changeFiles(Array.from(event.target.files ?? []))} type="file" /></label>
        {previews.length ? <div className={styles.photoPreviews}>{previews.map((url, index) => <Image alt={`Ảnh hiện trường ${index + 1}`} height={96} key={url} src={url} unoptimized width={128} />)}</div> : null}
        <Textarea label="Ghi chú" maxLength={500} onChange={(event) => setNote(event.target.value)} rows={3} value={note} />
        {error ? <p className={styles.inlineError} role="alert">{error}</p> : null}
        <footer className={styles.drawerFooter}><span /><div><Button disabled={saving} onClick={onClose}>Hủy</Button><Button disabled={saving || !selectedNode} type="submit" variant="primary">{saving ? "Đang lưu" : "Lưu cập nhật"}</Button></div></footer>
      </form>
    </Drawer>
  );
}
