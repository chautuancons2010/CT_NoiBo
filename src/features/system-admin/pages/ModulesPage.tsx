"use client";

import { useRef, useState } from "react";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useStoredSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { moduleKeys, moduleLabels, moduleSettingsSchema, type ModuleKey } from "@/config/systemSettings";
import { AdminPage } from "@/features/system-admin/components/AdminPage";
import styles from "./ModulesPage.module.css";

export function ModulesPage() {
  const { settings, updateGroup } = useStoredSystemSettings();
  const [saving, setSaving] = useState<ModuleKey | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const pending = useRef(false);

  async function toggle(key: ModuleKey) {
    if (pending.current) return;
    pending.current = true;
    const enabled = !settings.modules[key];
    setSaving(key);
    setFeedback(null);
    try {
      const response = await fetch(`/api/v1/modules/${key}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled })
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message ?? "Không thể cập nhật trạng thái module.");
      updateGroup("modules", moduleSettingsSchema.parse(body.data?.value));
      setFeedback({ message: `Đã ${enabled ? "mở khóa" : "khóa"} module ${moduleLabels[key]}.`, error: false });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Không thể cập nhật trạng thái module.", error: true });
    } finally {
      pending.current = false;
      setSaving(null);
    }
  }

  return (
    <AdminPage title="Khóa module">
      <section className="settings-form-card" aria-label="Trạng thái module">
        <div className="module-list">
          {moduleKeys.map((key) => {
            const enabled = settings.modules[key];
            const inheritedLock = key === "reports" && !settings.modules.operations;
            const action = enabled ? "Khóa" : "Mở khóa";
            return (
              <div className={`module-list__row ${styles.row}`} key={key}>
                <strong>{moduleLabels[key]}</strong>
                <StatusBadge tone={enabled && !inheritedLock ? "success" : "warning"}>{inheritedLock ? "Khóa theo Điều hành" : enabled ? "Đang mở" : "Đã khóa"}</StatusBadge>
                <Button aria-label={`${action} module ${moduleLabels[key]}`} disabled={saving !== null || inheritedLock} busy={saving === key} onClick={() => void toggle(key)} leftIcon={enabled ? <LockKeyhole aria-hidden="true" size={16} /> : <LockKeyholeOpen aria-hidden="true" size={16} />}>
                  {saving === key ? "Đang lưu" : action}
                </Button>
              </div>
            );
          })}
        </div>
        {feedback ? <div className="save-feedback" role={feedback.error ? "alert" : "status"}>{feedback.message}</div> : null}
      </section>
    </AdminPage>
  );
}
