"use client";

import { Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, IconButton } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Input, Select, Textarea } from "@/components/shared/FormControls";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { InventoryDocument, InventoryDocumentType, InventoryItem, Warehouse } from "@/features/warehouse/types/warehouseTypes";

type DocumentType = Exclude<InventoryDocumentType, "reversal">;
type EditLine = { itemId: string; quantity: number; adjustmentQuantity?: number; uomId: string; reference?: string };
type TransactionType = { code: string; label: string };
type References = { projects: Array<{ id: string; code: string; name: string }>; worksites: Array<{ id: string; projectId: string; name: string }> };
type Attachment = { id: string; fileId: string; fileName: string; sizeBytes: number };
type ApiBody<T> = { ok: boolean; data?: T; error?: { message?: string } };
const paths: Record<DocumentType, string> = { receipt: "receipts", issue: "issues", transfer: "transfers", adjustment: "adjustments" };
const labels: Record<DocumentType, string> = { receipt: "Nhập kho", issue: "Xuất kho", transfer: "Chuyển kho", adjustment: "Điều chỉnh kho" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init); const body = await response.json() as ApiBody<T>;
  if (!response.ok || body.data === undefined) throw new Error(body.error?.message || "Không thể xử lý yêu cầu.");
  return body.data;
}
function today() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); }

export function InventoryDocumentEditor({ type, id }: { type: DocumentType; id?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]); const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [references, setReferences] = useState<References>({ projects: [], worksites: [] });
  const [document, setDocument] = useState<Partial<InventoryDocument>>({ type, documentDate: today() });
  const [lines, setLines] = useState<EditLine[]>([{ itemId: "", quantity: 1, uomId: "" }]);
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      api<InventoryItem[]>("/api/v1/items?status=active"), api<Warehouse[]>("/api/v1/warehouses"),
      api<TransactionType[]>(`/api/v1/warehouse/transaction-types?type=${type}`), api<References>("/api/v1/warehouse/references"),
      id ? api<InventoryDocument>(`/api/v1/warehouse/${paths[type]}/${id}`) : Promise.resolve(undefined)
    ]).then(([itemRows, warehouseRows, types, referenceRows, current]) => {
      setItems(itemRows); setWarehouses(warehouseRows.filter((row) => row.status === "active")); setTransactionTypes(types);
      setReferences(referenceRows);
      if (current) {
        setDocument(current);
        setLines(current.lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity, adjustmentQuantity: line.adjustmentQuantity, uomId: line.uomId, reference: line.reference })));
      } else if (types[0]) setDocument((value) => ({ ...value, transactionTypeCode: types[0].code }));
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải chứng từ."));
  }, [id, type]);

  function updateLine(index: number, patch: Partial<EditLine>) { setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); }
  function chooseItem(index: number, itemId: string) { updateLine(index, { itemId, uomId: items.find((row) => row.id === itemId)?.baseUomId ?? "" }); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = {
        documentDate: document.documentDate, sourceWarehouseId: document.sourceWarehouseId || undefined,
        targetWarehouseId: document.targetWarehouseId || undefined, transactionTypeCode: document.transactionTypeCode,
        supplierReference: document.supplierReference || undefined, deliveredBy: document.deliveredBy || undefined,
        projectId: document.projectId || undefined, worksiteId: document.worksiteId || undefined,
        receivedBy: document.receivedBy || undefined, recipient: document.recipient || undefined,
        receivingDepartment: document.receivingDepartment || undefined, note: document.note || undefined, lines,
        ...(id ? { rowVersion: document.rowVersion } : { clientRequestId: crypto.randomUUID() })
      };
      const saved = await api<InventoryDocument>(id ? `/api/v1/warehouse/${paths[type]}/${id}` : `/api/v1/warehouse/${paths[type]}`, { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      router.push(`/warehouse/${paths[type]}/${saved.id}`); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể lưu chứng từ."); }
    finally { setSaving(false); }
  }

  const locked = Boolean(id && document.status !== "draft");
  const warehouseOptions = warehouses.map((row) => ({ value: row.id, label: `${row.code} · ${row.name}` }));
  return <div className="warehouse-form page-stack"><form className="page-stack" onSubmit={submit}>
    <Card>
      <div className="warehouse-document-heading"><strong>{id ? document.documentNumber : labels[type]}</strong>{document.status ? <StatusBadge tone={document.status === "posted" ? "success" : "neutral"}>{document.status}</StatusBadge> : null}</div>
      <div className="form-grid">
        <Input disabled={locked} label="Ngày chứng từ" required type="date" value={document.documentDate ?? ""} onChange={(event) => setDocument({ ...document, documentDate: event.target.value })} />
        <Select disabled={locked} label="Loại giao dịch" required options={transactionTypes.map((row) => ({ value: row.code, label: row.label }))} placeholder="Chọn loại giao dịch" value={document.transactionTypeCode ?? ""} onChange={(event) => setDocument({ ...document, transactionTypeCode: event.target.value })} />
        {type !== "receipt" ? <Select disabled={locked} label={type === "adjustment" ? "Kho điều chỉnh" : "Kho nguồn"} required options={warehouseOptions} placeholder="Chọn kho" value={document.sourceWarehouseId ?? ""} onChange={(event) => setDocument({ ...document, sourceWarehouseId: event.target.value })} /> : null}
        {type === "receipt" || type === "transfer" ? <Select disabled={locked} label={type === "receipt" ? "Kho nhận" : "Kho đích"} required options={warehouseOptions} placeholder="Chọn kho" value={document.targetWarehouseId ?? ""} onChange={(event) => setDocument({ ...document, targetWarehouseId: event.target.value })} /> : null}
        {type === "receipt" ? <><Input disabled={locked} label="Tham chiếu nhà cung cấp" value={document.supplierReference ?? ""} onChange={(event) => setDocument({ ...document, supplierReference: event.target.value })} /><Input disabled={locked} label="Người giao" value={document.deliveredBy ?? ""} onChange={(event) => setDocument({ ...document, deliveredBy: event.target.value })} /><Input disabled={locked} label="Người nhận" value={document.receivedBy ?? ""} onChange={(event) => setDocument({ ...document, receivedBy: event.target.value })} /></> : null}
        {type === "issue" ? <><Input disabled={locked} label="Người nhận" value={document.recipient ?? ""} onChange={(event) => setDocument({ ...document, recipient: event.target.value })} /><Input disabled={locked} label="Bộ phận nhận" value={document.receivingDepartment ?? ""} onChange={(event) => setDocument({ ...document, receivingDepartment: event.target.value })} /></> : null}
        {type === "issue" ? <><Select disabled={locked} label="Dự án" options={references.projects.map((row) => ({ value: row.id, label: `${row.code} · ${row.name}` }))} placeholder="Không gắn dự án" value={document.projectId ?? ""} onChange={(event) => setDocument({ ...document, projectId: event.target.value, worksiteId: "" })} /><Select disabled={locked || !document.projectId} label="Công trường" options={references.worksites.filter((row) => row.projectId === document.projectId).map((row) => ({ value: row.id, label: row.name }))} placeholder="Không gắn công trường" value={document.worksiteId ?? ""} onChange={(event) => setDocument({ ...document, worksiteId: event.target.value })} /></> : null}
      </div>
      <Textarea disabled={locked} label="Ghi chú" rows={2} value={document.note ?? ""} onChange={(event) => setDocument({ ...document, note: event.target.value })} />
    </Card>
    <Card>
      <div className="warehouse-document-heading"><h3 className="section-title">Dòng hàng</h3>{!locked ? <Button leftIcon={<Plus size={16} />} onClick={() => setLines([...lines, { itemId: "", quantity: 1, uomId: "" }])}>Thêm dòng</Button> : null}</div>
      <div className="warehouse-line-list">{lines.map((line, index) => <div className="warehouse-line" key={index}>
        <Select disabled={locked} label="Hàng hóa" required options={items.map((row) => ({ value: row.id, label: `${row.itemCode} · ${row.name}` }))} placeholder="Chọn hàng" value={line.itemId} onChange={(event) => chooseItem(index, event.target.value)} />
        {type === "adjustment" ? <Input disabled={locked} label="Chênh lệch" required step="0.0001" type="number" value={line.adjustmentQuantity ?? ""} onChange={(event) => updateLine(index, { adjustmentQuantity: Number(event.target.value), quantity: Math.abs(Number(event.target.value)) || 1 })} /> : <Input disabled={locked} label="Số lượng" min="0.0001" required step="0.0001" type="number" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} />}
        <Input disabled={locked} label="Tham chiếu" value={line.reference ?? ""} onChange={(event) => updateLine(index, { reference: event.target.value })} />
        {!locked && lines.length > 1 ? <IconButton label="Xóa dòng" onClick={() => setLines(lines.filter((_, rowIndex) => rowIndex !== index))} variant="danger"><Trash2 size={16} /></IconButton> : null}
      </div>)}</div>
    </Card>
    {error ? <p className="form-error">{error}</p> : null}
    {!locked ? <div className="warehouse-sticky-actions"><Button onClick={() => router.back()}>Quay lại</Button><Button disabled={saving} type="submit" variant="primary">{saving ? "Đang lưu…" : "Lưu nháp"}</Button></div> : null}
  </form>{id ? <DocumentActions document={document as InventoryDocument} onChange={setDocument} /> : null}</div>;
}

function DocumentActions({ document, onChange }: { document: InventoryDocument; onChange: (value: InventoryDocument) => void }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [attachments, setAttachments] = useState<Attachment[]>([]);
  const path = paths[document.type as DocumentType];
  useEffect(() => { void api<Attachment[]>(`/api/v1/warehouse/documents/${document.id}/attachments`).then(setAttachments).catch(() => undefined); }, [document.id]);
  async function post() { setBusy(true); setError(""); try { onChange(await api<InventoryDocument>(`/api/v1/warehouse/${path}/${document.id}/post`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postingDate: today(), idempotencyKey: crypto.randomUUID(), allowNegativeOverride: false }) })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể ghi sổ."); } finally { setBusy(false); } }
  async function reverse() { const reason = window.prompt("Lý do đảo chứng từ"); if (!reason) return; setBusy(true); setError(""); try { onChange(await api<InventoryDocument>(`/api/v1/warehouse/${path}/${document.id}/reverse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, postingDate: today(), idempotencyKey: crypto.randomUUID() }) })); } catch (value) { setError(value instanceof Error ? value.message : "Không thể đảo chứng từ."); } finally { setBusy(false); } }
  async function upload(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget), file = form.get("file"); if (!(file instanceof File) || !file.size) return; setBusy(true); try { const attachment = await api<Attachment>(`/api/v1/warehouse/documents/${document.id}/attachments`, { method: "POST", body: form }); setAttachments([...attachments, attachment]); event.currentTarget.reset(); } catch (value) { setError(value instanceof Error ? value.message : "Không thể tải tệp."); } finally { setBusy(false); } }
  return <Card><div className="warehouse-document-heading"><div className="form-actions">{document.status === "draft" ? <Button disabled={busy} onClick={() => void post()} variant="primary">Ghi sổ</Button> : null}{document.status === "posted" && ["receipt", "issue"].includes(document.type) ? <Button disabled={busy} onClick={() => void reverse()} variant="danger">Đảo chứng từ</Button> : null}</div><form className="warehouse-upload" onSubmit={upload}><input aria-label="Chọn tệp" name="file" required type="file" /><Button disabled={busy} leftIcon={<Upload size={16} />} type="submit">Tải lên</Button></form></div>{attachments.length ? <ul className="warehouse-simple-list">{attachments.map((file) => <li key={file.id}><Link className="text-link" href={`/api/v1/files/${file.fileId}/signed-url`} target="_blank">{file.fileName}</Link><span>{Math.ceil(file.sizeBytes / 1024)} KB</span></li>)}</ul> : null}{error ? <p className="form-error">{error}</p> : null}</Card>;
}
