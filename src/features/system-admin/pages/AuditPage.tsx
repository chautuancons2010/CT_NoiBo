"use client";

import { useEffect, useState } from "react";
import { AdminPage } from "@/features/system-admin/components/AdminPage";

interface AuditEntry { id?: string; action: string; actorId?: string; actor_account_id?: string; timestamp?: string; happened_at?: string; entityId?: string; entity_id?: string; }

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void (async () => { const response = await fetch("/api/v1/audit-log"); const body = await response.json() as { data?: { entries: AuditEntry[] }; error?: { message: string } }; setEntries(body.data?.entries ?? []); if (!response.ok) setError(body.error?.message ?? "Không thể tải audit log."); })(); }, []);
  return <AdminPage title="Audit log"><section className="settings-form-card"><div className="history-table" role="table" aria-label="Audit log"><div className="history-table__head audit" role="row"><span>Thao tác</span><span>Đối tượng</span><span>Người thực hiện</span><span>Thời gian</span></div>{entries.length === 0 ? <div className="history-table__empty">{error || "Chưa có dữ liệu"}</div> : entries.map((entry, index) => { const timestamp = entry.timestamp ?? entry.happened_at ?? ""; return <div className="history-table__row audit" key={entry.id ?? `${entry.action}-${index}`} role="row"><strong>{entry.action}</strong><span>{entry.entityId ?? entry.entity_id}</span><span>{entry.actorId ?? entry.actor_account_id ?? "Hệ thống"}</span><time dateTime={timestamp}>{timestamp ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(timestamp)) : "—"}</time></div>; })}</div></section></AdminPage>;
}
