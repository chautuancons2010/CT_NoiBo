"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Archive, FileUp, Plus } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { DatePicker, Input, Select, Textarea } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { DataSurface } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { EmployeeContract } from "@/features/employees/types";
import { buildInternalFileUrl } from "@/services/storage/storageService";

const statusLabels = { draft: "Nháp", active: "Đang hiệu lực", expired: "Hết hạn", terminated: "Đã chấm dứt" } as const;
const date = (value?: string) => value ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)) : "—";

export function EmployeeContractManager({ employeeId, initialContracts, canEdit, canUpload, canViewFile }: { employeeId: string; initialContracts: EmployeeContract[]; canEdit: boolean; canUpload: boolean; canViewFile: boolean }) {
  const [contracts, setContracts] = useState(initialContracts);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileHistory, setFileHistory] = useState<EmployeeContract>();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function reload() {
    const response = await fetch(`/api/v1/employees/${employeeId}/contracts`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? "Không thể đọc lịch sử hợp đồng.");
    const rows = body.data?.contracts ?? [];
    setContracts(rows);
    return rows as EmployeeContract[];
  }

  async function showFileHistory(contract: EmployeeContract) {
    setError("");
    try {
      const rows = await reload();
      setFileHistory(rows.find((row) => row.id === contract.id) ?? contract);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đọc lịch sử file hợp đồng.");
    }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(`/api/v1/employees/${employeeId}/contracts`, { method: "POST", body: new FormData(event.currentTarget) });
    const body = await response.json(); setBusy(false);
    if (!response.ok) { setError(body.error?.message ?? "Không thể tạo hợp đồng."); return; }
    setOpen(false); event.currentTarget.reset(); await reload();
  }

  async function replaceFile(contract: EmployeeContract, file?: File) {
    if (!file) return; setBusy(true); setError("");
    const form = new FormData();
    form.set("contractNumber", contract.contractNumber); form.set("contractType", contract.contractType); form.set("effectiveDate", contract.effectiveDate ?? contract.startDate); form.set("status", contract.status); form.set("file", file);
    if (contract.signedDate) form.set("signedDate", contract.signedDate); if (contract.endDate) form.set("endDate", contract.endDate); if (contract.note) form.set("note", contract.note);
    const response = await fetch(`/api/v1/employees/${employeeId}/contracts/${contract.id}`, { method: "PATCH", body: form });
    const body = await response.json(); setBusy(false);
    if (!response.ok) { setError(body.error?.message ?? "Không thể thay file hợp đồng."); return; }
    await reload();
  }

  async function archive(contract: EmployeeContract) {
    const reason = window.prompt("Lý do lưu trữ hợp đồng"); if (!reason) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/v1/employees/${employeeId}/contracts/${contract.id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
    const body = await response.json(); setBusy(false);
    if (!response.ok) { setError(body.error?.message ?? "Không thể lưu trữ hợp đồng."); return; }
    await reload();
  }

  const columns: DataTableColumn<EmployeeContract>[] = [
    { id: "number", header: "Số hợp đồng", accessor: "contractNumber" },
    { id: "type", header: "Loại", accessor: "contractType" },
    { id: "signed", header: "Ngày ký", cell: (item) => date(item.signedDate), hiddenOnMobile: true },
    { id: "effective", header: "Hiệu lực", cell: (item) => date(item.effectiveDate ?? item.startDate) },
    { id: "end", header: "Hết hạn", cell: (item) => date(item.endDate), hiddenOnMobile: true },
    { id: "status", header: "Trạng thái", cell: (item) => <StatusBadge tone={item.status === "active" ? "success" : "neutral"}>{statusLabels[item.status]}</StatusBadge> },
    { id: "file", header: "Tài liệu", cell: (item) => item.attachmentFileId && canViewFile ? <Link className="private-file-link" href={buildInternalFileUrl(item.attachmentFileId)}>Xem PDF</Link> : "—" }
  ];

  return <>
    <DataSurface>
      <div className="data-surface__toolbar panel-header"><h2>Hợp đồng lao động</h2>{canEdit ? <Button leftIcon={<Plus size={15}/>} onClick={()=>setOpen(true)} size="sm" variant="primary">Thêm hợp đồng</Button> : null}</div>
      {error ? <p className="form-error">{error}</p> : null}
      <DataTable actions={(contract)=><><input accept="application/pdf" hidden onChange={(event)=>void replaceFile(contract,event.target.files?.[0])} ref={(node)=>{fileInputs.current[contract.id]=node;}} type="file"/><DropdownMenu label={`Thao tác hợp đồng ${contract.contractNumber}`}>{canViewFile&&contract.attachmentFileId?<button onClick={()=>void showFileHistory(contract)} type="button">Lịch sử file</button>:null}{canUpload?<button disabled={busy} onClick={()=>fileInputs.current[contract.id]?.click()} type="button"><FileUp size={14}/>{contract.attachmentFileId?"Thay file":"Tải file"}</button>:null}{canEdit&&!contract.archivedAt?<button disabled={busy} onClick={()=>void archive(contract)} type="button"><Archive size={14}/>Lưu trữ</button>:null}</DropdownMenu></>} columns={columns} data={contracts} emptyDescription="" emptyTitle="Chưa có hợp đồng" getRowId={(contract)=>contract.id}/>
    </DataSurface>
    <Drawer onClose={()=>setFileHistory(undefined)} open={Boolean(fileHistory)} title={`Lịch sử file · ${fileHistory?.contractNumber??""}`}>
      <ul className="warehouse-simple-list">{(fileHistory?.fileVersions??[]).map((version,index)=><li key={version.fileId}><Link className="private-file-link" href={buildInternalFileUrl(version.fileId)} target="_blank">{version.fileName}</Link><span>{index===0?"Hiện tại · ":"Bản trước · "}{new Intl.DateTimeFormat("vi-VN",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(version.uploadedAt))}</span></li>)}</ul>
    </Drawer>
    <Drawer onClose={()=>setOpen(false)} open={open} title="Thêm hợp đồng lao động"><form className="overlay-form" onSubmit={create}>
      <Input label="Số hợp đồng" name="contractNumber" required/><Input label="Loại hợp đồng" name="contractType" required/><DatePicker label="Ngày ký" name="signedDate"/><DatePicker label="Ngày hiệu lực" name="effectiveDate" required/><DatePicker label="Ngày hết hạn" name="endDate"/><Select label="Trạng thái" name="status" options={Object.entries(statusLabels).map(([value,label])=>({value,label}))}/>{canUpload?<label><span>File hợp đồng PDF</span><input accept="application/pdf" className="input" name="file" type="file"/></label>:null}<Textarea label="Ghi chú" name="note"/>{error?<p className="form-error">{error}</p>:null}<footer><Button onClick={()=>setOpen(false)}>Hủy</Button><Button disabled={busy} type="submit" variant="primary">{busy?"Đang lưu…":"Lưu hợp đồng"}</Button></footer>
    </form></Drawer>
  </>;
}
