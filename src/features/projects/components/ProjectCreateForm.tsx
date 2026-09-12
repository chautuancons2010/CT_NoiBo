"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";

import { BackLink } from "@/components/shared/BackLink";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Input, Select, Textarea } from "@/components/shared/FormControls";

export function ProjectCreateForm() {
  const router = useRouter(); const [error, setError] = useState<string>(); const [saving, setSaving] = useState(false);
  const submit = async (form: FormData) => { setSaving(true); setError(undefined); const payload = Object.fromEntries(form); const response = await fetch("/api/v1/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const body = await response.json() as { data?: { id: string }; error?: { message: string } }; setSaving(false); if (!response.ok || !body.data) { setError(body.error?.message ?? "Không thể tạo dự án."); return; } router.push(`/projects/${body.data.id}/overview`); };
  return <div className="project-form-page"><BackLink href="/projects" label="Danh sách dự án" /><Card><form action={submit} className="project-form"><Input label="Mã dự án" name="code" required /><Input label="Tên dự án" name="name" required /><Input label="Khách hàng" name="customerName" /><Input label="Ngày bắt đầu" name="startDate" required type="date" /><Input label="Kết thúc dự kiến" name="expectedEndDate" type="date" /><Select label="Trạng thái" name="status" options={[{ label: "Chuẩn bị", value: "preparing" }, { label: "Đang thực hiện", value: "active" }]} /><Textarea className="project-form__wide" label="Tóm tắt" name="summary" />{error ? <div className="attendance-notice project-form__wide">{error}</div> : null}<div className="action-row project-form__wide"><Button disabled={saving} type="submit" leftIcon={<Save size={16} />} variant="primary">{saving ? "Đang lưu..." : "Tạo dự án"}</Button></div></form></Card></div>;
}
