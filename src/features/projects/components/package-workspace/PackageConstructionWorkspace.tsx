"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { Input, Select } from "@/components/shared/FormControls";
import { Modal } from "@/components/shared/Overlays";
import type { ProjectProgressNode } from "@/features/projects/types/projectTypes";

import { FieldOperationSheets } from "./FieldOperationSheets";
import styles from "./PackageWorkspace.module.css";
import { ProgressBoard } from "./ProgressBoard";

interface AssigneeOption { id: string; label: string }

const typeLabels: Record<ProjectProgressNode["nodeType"], string> = { phase: "Giai đoạn", work_item: "Gói công việc", task: "Đầu việc", milestone: "Mốc kiểm soát", acceptance: "Nghiệm thu" };
const statusLabels: Record<ProjectProgressNode["status"], string> = { not_started: "Chưa triển khai", in_progress: "Đang thi công", blocked: "Đang vướng", completed: "Hoàn thành", cancelled: "Đã hủy" };

export function PackageConstructionWorkspace({ accountId, projectId, selectedWorksiteId, canEdit, canFieldUpdate, initialNodes, onNodesChange, initialLoadError }: {
  accountId: string;
  projectId: string;
  selectedWorksiteId?: string;
  canEdit: boolean;
  canFieldUpdate: boolean;
  initialNodes: ProjectProgressNode[];
  onNodesChange: (nodes: ProjectProgressNode[]) => void;
  initialLoadError?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nodes = initialNodes;
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [editing, setEditing] = useState<ProjectProgressNode>();
  const [parentId, setParentId] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState(initialLoadError ?? "");
  const [mutating, setMutating] = useState<string>();
  const [todayKey] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()));
  const mode = searchParams.get("mode");
  const operationMode = mode === "field-update" || mode === "report-issue" ? mode : undefined;
  const operationNodeId = searchParams.get("task") ?? undefined;

  function saveNodes(next: ProjectProgressNode[]) { onNodesChange(next); }
  useEffect(() => {
    if (!editorOpen || assignees.length || !canEdit) return;
    const controller = new AbortController();
    async function loadAssignees() {
      setLoadingAssignees(true);
      try {
        const response = await fetch("/api/v1/employees?status=active&pageSize=100", { signal: controller.signal });
        const body = await response.json() as { data?: { employees?: { items?: Array<{ id: string; employeeCode: string; displayName: string }> } }; error?: { message?: string } };
        if (!response.ok) throw new Error(body.error?.message ?? "Không thể tải danh sách nhân sự.");
        setAssignees((body.data?.employees?.items ?? []).map((employee) => ({ id: employee.id, label: employee.displayName })));
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Không thể tải danh sách nhân sự.");
      } finally { if (!controller.signal.aborted) setLoadingAssignees(false); }
    }
    void loadAssignees();
    return () => controller.abort();
  }, [assignees.length, canEdit, editorOpen]);

  function openOperation(nextMode: "field-update" | "report-issue", nodeId?: string) {
    const next = new URLSearchParams(searchParams.toString()); next.set("mode", nextMode);
    if (nodeId) next.set("task", nodeId); else next.delete("task");
    window.history.pushState(null, "", `${pathname}?${next}`);
  }
  function closeOperation() {
    const next = new URLSearchParams(searchParams.toString()); next.delete("mode"); next.delete("task");
    window.history.replaceState(null, "", next.toString() ? `${pathname}?${next}` : pathname);
  }
  function openCreate(nextParentId?: string) { setEditing(undefined); setParentId(nextParentId); setError(""); setEditorOpen(true); }
  function openEdit(node: ProjectProgressNode) { setEditing(node); setParentId(undefined); setError(""); setEditorOpen(true); }
  function closeEditor() { setEditorOpen(false); setEditing(undefined); setParentId(undefined); setError(""); }

  async function quickUpdate(node: ProjectProgressNode, patch: Partial<Pick<ProjectProgressNode, "status" | "completionPercent">>, action: string) {
    if (mutating) return;
    setMutating(`${node.id}:${action}`); setError("");
    try {
      const completionPercent = patch.status === "completed" ? 100 : Math.min(100, Math.max(0, patch.completionPercent ?? node.completionPercent));
      const response = await fetch(`/api/v1/projects/${projectId}/progress`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...node, ...patch, completionPercent }) });
      const body = await response.json() as { data?: ProjectProgressNode[]; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể cập nhật tiến độ.");
      saveNodes(body.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể cập nhật tiến độ."); }
    finally { setMutating(undefined); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/projects/${projectId}/progress`, { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editing?.id, rowVersion: editing?.rowVersion, parentId: editing?.parentId ?? parentId, nodeType: form.get("nodeType"), name: form.get("name"), status: form.get("status"), completionPercent: Number(form.get("completionPercent")), deadline: form.get("deadline") || undefined, assigneeEmployeeId: form.get("assigneeEmployeeId") || undefined, sortOrder: editing?.sortOrder ?? nodes.length }) });
    const body = await response.json() as { data?: ProjectProgressNode[]; error?: { message?: string } };
    if (!response.ok || !body.data) { setError(body.error?.message ?? "Không thể lưu công việc."); return; }
    saveNodes(body.data); closeEditor();
  }

  return <>
    <ProgressBoard canEdit={canEdit} canFieldUpdate={canFieldUpdate} error={!editorOpen ? error : undefined} mutating={mutating} nodes={nodes} onComplete={(node) => void quickUpdate(node, { status: "completed", completionPercent: 100 }, "completed")} onCreate={openCreate} onEdit={openEdit} onOperation={openOperation} today={todayKey} />
    <FieldOperationSheets accountId={accountId} initialNodeId={operationNodeId} key={`${operationMode}-${operationNodeId ?? "new"}`} mode={canFieldUpdate ? operationMode : undefined} nodes={nodes} onClose={closeOperation} onSaved={saveNodes} projectId={projectId} selectedWorksiteId={selectedWorksiteId} />
    <Modal onClose={closeEditor} open={editorOpen} title={editing ? "Cập nhật công việc" : parentId ? "Thêm công việc con" : "Thêm công việc"}><form className={styles.editorForm} key={editing?.id ?? parentId ?? "new"} onSubmit={submit}><Input defaultValue={editing?.name} label="Tên công việc" name="name" required /><Select defaultValue={editing?.nodeType ?? (parentId ? "task" : "work_item")} label="Loại công việc" name="nodeType" options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} /><Select defaultValue={editing?.status ?? "not_started"} label="Trạng thái" name="status" options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /><Input defaultValue={editing?.completionPercent ?? 0} label="Hoàn thành (%)" max="100" min="0" name="completionPercent" required type="number" /><Input defaultValue={editing?.deadline} label="Hạn hoàn thành" name="deadline" type="date" /><Select defaultValue={editing?.assigneeEmployeeId} disabled={loadingAssignees} label="Người phụ trách" name="assigneeEmployeeId" options={assignees.map((employee) => ({ value: employee.id, label: employee.label }))} placeholder={loadingAssignees ? "Đang tải" : "Chưa phân công"} />{error ? <p className={styles.inlineError} role="alert">{error}</p> : null}<footer className={styles.drawerFooter}><span /><div><Button onClick={closeEditor}>Hủy</Button><Button type="submit" variant="primary">Lưu</Button></div></footer></form></Modal>
  </>;
}
