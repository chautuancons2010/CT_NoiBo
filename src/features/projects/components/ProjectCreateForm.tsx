"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BackLink } from "@/components/shared/BackLink";
import { Button } from "@/components/shared/Button";
import { Input, Select, Textarea } from "@/components/shared/FormControls";

import styles from "./ProjectCreateForm.module.css";

export function ProjectCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (form: FormData) => {
    setSaving(true);
    setError(undefined);
    const payload = Object.fromEntries(form);
    const response = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json() as { data?: { id: string }; error?: { message: string } };
    setSaving(false);
    if (!response.ok || !body.data) {
      setError(body.error?.message ?? "Không thể tạo gói.");
      return;
    }
    router.push(`/projects/${body.data.id}/progress`);
  };

  return (
    <div className={styles.page}>
      <BackLink href="/projects" label="Gói công trường" />
      <form action={submit} className={styles.form}>
        <fieldset className={styles.section}>
          <legend>Thông tin gói</legend>
          <div className={styles.grid}>
            <Input label="Mã gói" name="code" required />
            <Input label="Tên gói" name="name" required />
            <div className={styles.full}><Input label="Khách hàng" name="customerName" /></div>
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend>Thời gian &amp; trạng thái</legend>
          <div className={styles.grid}>
            <Input label="Ngày bắt đầu" name="startDate" required type="date" />
            <Input label="Kết thúc dự kiến" name="expectedEndDate" type="date" />
            <div className={styles.full}>
              <Select label="Trạng thái" name="status" options={[{ label: "Chuẩn bị", value: "preparing" }, { label: "Đang thi công", value: "active" }]} />
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend>Nội dung</legend>
          <Textarea label="Tóm tắt" name="summary" rows={5} />
        </fieldset>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        <footer className={styles.footer}>
          <Button onClick={() => router.push("/projects")} type="button">Hủy</Button>
          <Button disabled={saving} leftIcon={<Save aria-hidden="true" size={16} />} type="submit" variant="primary">
            {saving ? "Đang lưu..." : "Tạo gói"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
