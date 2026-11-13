"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Input, Select, Textarea } from "@/components/shared/FormControls";
import { Modal } from "@/components/shared/Overlays";
import type { ProjectSummary } from "../types/projectTypes";
import styles from "./ProjectActions.module.css";

export function ProjectActions({ project, onSaved, onDeleted }: { project: ProjectSummary; onSaved: () => void; onDeleted: () => void }) {
  const [mode, setMode] = useState<"edit" | "delete">();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(project.startDate);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const payload = mode === "edit" ? Object.fromEntries(new FormData(event.currentTarget)) : {};
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/projects/${project.id}`, {
        method: mode === "edit" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, rowVersion: project.rowVersion }),
        signal: AbortSignal.timeout(30_000)
      });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể lưu thay đổi.");
      const deleted = mode === "delete";
      setMode(undefined);
      if (deleted) onDeleted(); else onSaved();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể lưu thay đổi."); }
    finally { setBusy(false); }
  }

  return <>
    <div className={styles.actions} onClick={event => event.stopPropagation()}>
      <Button aria-label={`Sửa gói ${project.name}`} leftIcon={<Pencil aria-hidden="true" size={16} />} onClick={() => { setError(""); setStartDate(project.startDate); setMode("edit"); }} size="sm">Sửa</Button>
      <Button aria-label={`Xóa gói ${project.name}`} leftIcon={<Trash2 aria-hidden="true" size={16} />} onClick={() => { setError(""); setMode("delete"); }} size="sm" variant="danger">Xóa</Button>
    </div>
    <Modal open={Boolean(mode)} onClose={() => { if (!busy) setMode(undefined); }} title={mode === "delete" ? "Xóa gói" : "Sửa gói"}>
      <form className="drawer-form" onSubmit={submit}>
        <fieldset className="form-fieldset" disabled={busy}>
          {mode === "edit" ? <>
            <Input defaultValue={project.code} label="Mã gói" maxLength={40} minLength={2} name="code" required />
            <Input defaultValue={project.name} label="Tên gói" maxLength={180} minLength={3} name="name" required />
            <Select defaultValue={project.status} label="Trạng thái" name="status" options={[{ value: "preparing", label: "Chuẩn bị" }, { value: "active", label: "Đang thực hiện" }, { value: "paused", label: "Tạm dừng" }, { value: "completed", label: "Hoàn thành" }, { value: "closed", label: "Đã đóng" }]} />
            <Input defaultValue={project.customerName ?? ""} label="Khách hàng" maxLength={160} name="customerName" />
            <Input label="Ngày bắt đầu" name="startDate" onChange={event => setStartDate(event.target.value)} required type="date" value={startDate} />
            <Input defaultValue={project.expectedEndDate ?? ""} label="Kết thúc dự kiến" min={startDate} name="expectedEndDate" type="date" />
            <Textarea defaultValue={project.summary ?? ""} label="Tóm tắt" maxLength={500} name="summary" />
          </> : <dl className="record-fields"><div><dt>Gói</dt><dd>{project.code} · {project.name}</dd></div><div><dt>Lịch sử chấm công</dt><dd>Giữ nguyên</dd></div></dl>}
        </fieldset>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="form-actions"><Button disabled={busy} onClick={() => setMode(undefined)}>Hủy</Button><Button busy={busy} type="submit" variant={mode === "delete" ? "danger" : "primary"}>{mode === "delete" ? "Xác nhận xóa" : "Lưu thay đổi"}</Button></div>
      </form>
    </Modal>
  </>;
}
