"use client";

import { Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button, IconButton } from "@/components/shared/Button";
import { Input, Select, Textarea } from "@/components/shared/FormControls";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CommandBar, Inspector, WorkbenchLayout, WorkCanvas } from "@/components/shared/Workbench";
import { ItemImagePreview } from "@/features/warehouse/components/ItemImagePreview";
import type { InventoryDocument, InventoryDocumentType, InventoryItem, Warehouse } from "@/features/warehouse/types/warehouseTypes";

type DocumentType = Exclude<InventoryDocumentType, "reversal">;
type EditLine = { itemId: string; quantity: number; adjustmentQuantity?: number; uomId: string; reference?: string };
type TransactionType = { code: string; label: string };
type References = { projects: Array<{ id: string; code: string; name: string }>; worksites: Array<{ id: string; projectId: string; name: string }> };
type Attachment = { id: string; fileId: string; fileName: string; sizeBytes: number };
type ApiBody<T> = { ok: boolean; data?: T; error?: { message?: string } };

const paths: Record<DocumentType, string> = { receipt: "receipts", issue: "issues", transfer: "transfers", adjustment: "adjustments" };
const labels: Record<DocumentType, string> = { receipt: "Phiếu nhập kho", issue: "Phiếu xuất kho", transfer: "Phiếu chuyển kho", adjustment: "Phiếu điều chỉnh kho" };
const statusLabels: Record<string, string> = { draft: "Nháp", submitted: "Chờ ghi sổ", posted: "Đã ghi sổ", cancelled: "Đã hủy", reversed: "Đã đảo" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json() as ApiBody<T>;
  if (!response.ok || body.data === undefined) throw new Error(body.error?.message || "Không thể xử lý yêu cầu.");
  return body.data;
}

function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function InventoryDocumentEditor({ type, id, canCreate, canPost, canReverse }: { type: DocumentType; id?: string; canCreate: boolean; canPost: boolean; canReverse: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [references, setReferences] = useState<References>({ projects: [], worksites: [] });
  const [document, setDocument] = useState<Partial<InventoryDocument>>({ type, documentDate: today() });
  const [lines, setLines] = useState<EditLine[]>([{ itemId: "", quantity: 1, uomId: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      api<InventoryItem[]>("/api/v1/items?status=active"),
      api<Warehouse[]>("/api/v1/warehouses"),
      api<TransactionType[]>(`/api/v1/warehouse/transaction-types?type=${type}`),
      api<References>("/api/v1/warehouse/references"),
      id ? api<InventoryDocument>(`/api/v1/warehouse/${paths[type]}/${id}`) : Promise.resolve(undefined)
    ]).then(([itemRows, warehouseRows, types, referenceRows, current]) => {
      setItems(itemRows);
      setWarehouses(warehouseRows.filter((row) => row.status === "active"));
      setTransactionTypes(types);
      setReferences(referenceRows);
      if (current) {
        setDocument(current);
        setLines(current.lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity, adjustmentQuantity: line.adjustmentQuantity, uomId: line.uomId, reference: line.reference })));
      } else if (types[0]) {
        setDocument((value) => ({ ...value, transactionTypeCode: types[0].code }));
      }
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải chứng từ."));
  }, [id, type]);

  function updateLine(index: number, patch: Partial<EditLine>) {
    setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function chooseItem(index: number, itemId: string) {
    updateLine(index, { itemId, uomId: items.find((row) => row.id === itemId)?.baseUomId ?? "" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        documentDate: document.documentDate,
        sourceWarehouseId: document.sourceWarehouseId || undefined,
        targetWarehouseId: document.targetWarehouseId || undefined,
        transactionTypeCode: document.transactionTypeCode,
        supplierReference: document.supplierReference || undefined,
        deliveredBy: document.deliveredBy || undefined,
        projectId: document.projectId || undefined,
        worksiteId: document.worksiteId || undefined,
        receivedBy: document.receivedBy || undefined,
        recipient: document.recipient || undefined,
        receivingDepartment: document.receivingDepartment || undefined,
        note: document.note || undefined,
        lines,
        ...(id ? { rowVersion: document.rowVersion } : { clientRequestId: crypto.randomUUID() })
      };
      const saved = await api<InventoryDocument>(id ? `/api/v1/warehouse/${paths[type]}/${id}` : `/api/v1/warehouse/${paths[type]}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      router.push(`/warehouse/${paths[type]}/${saved.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu chứng từ.");
    } finally {
      setSaving(false);
    }
  }

  const locked = Boolean(id && (document.status !== "draft" || !canCreate));
  const warehouseOptions = warehouses.map((row) => ({ value: row.id, label: `${row.code} · ${row.name}` }));
  const currentWarehouse = document.sourceWarehouseName ?? document.targetWarehouseName ?? "Chưa chọn";

  return (
    <WorkbenchLayout className="warehouse-workbench">
      <form className="warehouse-workbench__main" onSubmit={submit}>
        <CommandBar label="Lệnh chứng từ kho">
          <div className="warehouse-document-heading">
            <strong>{document.documentNumber ?? labels[type]}</strong>
            {document.status ? <StatusBadge tone={document.status === "posted" ? "success" : document.status === "submitted" ? "warning" : "neutral"}>{statusLabels[document.status] ?? document.status}</StatusBadge> : <StatusBadge tone="neutral">Chưa lưu</StatusBadge>}
          </div>
          {!locked ? <div className="warehouse-command-actions"><Button onClick={() => router.back()}>Quay lại</Button><Button disabled={saving} type="submit" variant="primary">{saving ? "Đang lưu…" : "Lưu nháp"}</Button></div> : null}
        </CommandBar>
        <WorkCanvas>
          <section className="warehouse-document-section" aria-labelledby="warehouse-document-information">
            <h2 id="warehouse-document-information">Thông tin chứng từ</h2>
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
          </section>

          <section className="warehouse-document-section warehouse-lines-section" aria-labelledby="warehouse-document-lines">
            <div className="warehouse-lines-heading"><h2 id="warehouse-document-lines">Dòng hàng</h2>{!locked ? <Button leftIcon={<Plus size={16} />} onClick={() => setLines([...lines, { itemId: "", quantity: 1, uomId: "" }])}>Thêm dòng</Button> : null}</div>
            <div className="warehouse-line-list">{lines.map((line, index) => <div className="warehouse-line" key={index}>
              <div className="warehouse-line__item">
                <ItemImagePreview assetId={items.find((row) => row.id === line.itemId)?.imageAssetId} itemName={items.find((row) => row.id === line.itemId)?.name ?? "hàng hóa"} />
                <Select disabled={locked} label="Hàng hóa" required options={items.map((row) => ({ value: row.id, label: `${row.itemCode} · ${row.name}` }))} placeholder="Chọn hàng" value={line.itemId} onChange={(event) => chooseItem(index, event.target.value)} />
              </div>
              {type === "adjustment" ? <Input disabled={locked} label="Chênh lệch" required step="0.0001" type="number" value={line.adjustmentQuantity ?? ""} onChange={(event) => updateLine(index, { adjustmentQuantity: Number(event.target.value), quantity: Math.abs(Number(event.target.value)) || 1 })} /> : <Input disabled={locked} label="Số lượng" min="0.0001" required step="0.0001" type="number" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} />}
              <Input disabled={locked} label="Tham chiếu" value={line.reference ?? ""} onChange={(event) => updateLine(index, { reference: event.target.value })} />
              {!locked && lines.length > 1 ? <IconButton label="Xóa dòng" onClick={() => setLines(lines.filter((_, rowIndex) => rowIndex !== index))} variant="danger"><Trash2 size={16} /></IconButton> : null}
            </div>)}</div>
          </section>
          {error ? <p className="form-error warehouse-workbench__error" role="alert">{error}</p> : null}
        </WorkCanvas>
      </form>

      <Inspector title="Kiểm soát chứng từ">
        <dl className="warehouse-inspector-summary">
          <div><dt>Trạng thái</dt><dd>{statusLabels[document.status ?? ""] ?? "Chưa lưu"}</dd></div>
          <div><dt>Kho</dt><dd>{currentWarehouse}</dd></div>
          <div><dt>Ngày chứng từ</dt><dd>{document.documentDate ?? "—"}</dd></div>
          <div><dt>Số dòng</dt><dd>{lines.length}</dd></div>
          {document.postedByName ? <div><dt>Người ghi sổ</dt><dd>{document.postedByName}</dd></div> : null}
        </dl>
        {id ? <DocumentActions canCreate={canCreate} canPost={canPost} canReverse={canReverse} document={document as InventoryDocument} onChange={setDocument} /> : <p className="warehouse-inspector-note">Lưu nháp để mở thao tác ghi sổ và tệp đính kèm.</p>}
      </Inspector>
    </WorkbenchLayout>
  );
}

function DocumentActions({ document, onChange, canCreate, canPost, canReverse }: { document: InventoryDocument; onChange: (value: InventoryDocument) => void; canCreate: boolean; canPost: boolean; canReverse: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const path = paths[document.type as DocumentType];

  useEffect(() => {
    void api<Attachment[]>(`/api/v1/warehouse/documents/${document.id}/attachments`).then(setAttachments).catch(() => undefined);
  }, [document.id]);

  async function post() {
    setBusy(true); setError("");
    try {
      onChange(await api<InventoryDocument>(`/api/v1/warehouse/${path}/${document.id}/post`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postingDate: today(), idempotencyKey: crypto.randomUUID(), allowNegativeOverride: false }) }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể ghi sổ."); }
    finally { setBusy(false); }
  }

  async function reverse() {
    const reason = window.prompt("Lý do đảo chứng từ");
    if (!reason) return;
    setBusy(true); setError("");
    try {
      onChange(await api<InventoryDocument>(`/api/v1/warehouse/${path}/${document.id}/reverse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, postingDate: today(), idempotencyKey: crypto.randomUUID() }) }));
    } catch (value) { setError(value instanceof Error ? value.message : "Không thể đảo chứng từ."); }
    finally { setBusy(false); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return;
    setBusy(true);
    try {
      const attachment = await api<Attachment>(`/api/v1/warehouse/documents/${document.id}/attachments`, { method: "POST", body: form });
      setAttachments([...attachments, attachment]);
      event.currentTarget.reset();
    } catch (value) { setError(value instanceof Error ? value.message : "Không thể tải tệp."); }
    finally { setBusy(false); }
  }

  return (
    <div className="warehouse-inspector-actions">
      <div className="warehouse-posting-actions">
        {document.status === "draft" && canPost ? <Button disabled={busy} onClick={() => void post()} variant="primary">Ghi sổ</Button> : null}
        {document.status === "posted" && canReverse && ["receipt", "issue"].includes(document.type) ? <Button disabled={busy} onClick={() => void reverse()} variant="danger">Đảo chứng từ</Button> : null}
      </div>
      <section className="warehouse-posting-history" aria-labelledby="posting-history-title">
        <h3 id="posting-history-title">Vòng đời</h3>
        <ol><li className="is-complete"><span>Tạo nháp</span></li><li className={document.status === "posted" || document.status === "reversed" ? "is-complete" : undefined}><span>Ghi sổ</span></li>{document.status === "reversed" ? <li className="is-warning"><span>Đã đảo chứng từ</span></li> : null}</ol>
      </section>
      {canCreate ? <form className="warehouse-upload" onSubmit={upload}>
        <label htmlFor={`warehouse-file-${document.id}`}>Tệp đính kèm</label>
        <input id={`warehouse-file-${document.id}`} name="file" required type="file" />
        <Button disabled={busy} leftIcon={<Upload size={16} />} type="submit">Tải lên</Button>
      </form> : null}
      {attachments.length ? <ul className="warehouse-simple-list">{attachments.map((file) => <li key={file.id}><Link className="text-link" href={`/api/v1/files/${file.fileId}/signed-url`} target="_blank">{file.fileName}</Link><span>{Math.ceil(file.sizeBytes / 1024)} KB</span></li>)}</ul> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
