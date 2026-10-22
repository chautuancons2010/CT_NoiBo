"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Input, Select, Textarea } from "@/components/shared/FormControls";

import styles from "./ProjectCreateForm.module.css";

export function ProjectCreateForm() {
  const router = useRouter(); const [error, setError] = useState<string>(); const [saving, setSaving] = useState(false);
  const submit = async (form: FormData) => { setSaving(true); setError(undefined); const payload = Object.fromEntries(form); const response = await fetch("/api/v1/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const body = await response.json() as { data?: { id: string }; error?: { message: string } }; setSaving(false); if (!response.ok || !body.data) { setError(body.error?.message ?? "Không thể tạo dự án."); return; } router.push(`/projects/${body.data.id}/today`); };
  return <div className={styles.page}><Card className={styles.card}><form action={submit} className={styles.form}><div className={styles.compactRow}><Input label="Mã gói" name="code" required /><Select label="Trạng thái" name="status" options={[{ label: "Chuẩn bị", value: "preparing" }, { label: "Đang thực hiện", value: "active" }]} /></div><Input label="Tên gói" name="name" required /><Input label="Khách hàng" name="customerName" /><div className={styles.dateRow}><Input label="Ngày bắt đầu" name="startDate" required type="date" /><Input label="Kết thúc dự kiến" name="expectedEndDate" type="date" /></div><Textarea className={styles.summary} label="Tóm tắt" name="summary" />{error ? <div className={styles.error} role="alert">{error}</div> : null}<div className={styles.actions}><Button disabled={saving} type="submit" leftIcon={<Save aria-hidden="true" size={16} />} variant="primary">{saving ? "Đang lưu..." : "Tạo gói"}</Button></div></form></Card></div>;
}
