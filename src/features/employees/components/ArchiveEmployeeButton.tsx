"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/shared/FormControls";
import { ConfirmDialog } from "@/components/shared/Overlays";

export function ArchiveEmployeeButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function archiveEmployee() {
    setSubmitting(true);
    setError(null);
    const response = await fetch(`/api/v1/employees/${employeeId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    const body = await response.json();
    setSubmitting(false);

    if (!body.ok) {
      setError(body.error?.message ?? "Không thể lưu trữ hồ sơ.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">Lưu trữ</button>
      <ConfirmDialog
        confirmLabel={submitting ? "Đang lưu" : "Lưu trữ"}
        danger
        open={open}
        title="Lưu trữ hồ sơ"
        onClose={() => setOpen(false)}
        onConfirm={archiveEmployee}
      >
        <div className="overlay-form">
          {error ? <div className="form-alert form-alert--error">{error}</div> : null}
          <Input
            label="Lý do"
            minLength={3}
            onChange={(event) => setReason(event.target.value)}
            required
            value={reason}
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
