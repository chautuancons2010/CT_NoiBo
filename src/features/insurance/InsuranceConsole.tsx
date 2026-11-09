"use client";

/* eslint-disable react-hooks/set-state-in-effect -- insurance state is loaded from the API. */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Input, SearchInput, Select, Textarea } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { FieldGroup, FormActions, SectionedForm } from "@/components/shared/FormLayout";
import { FilterBar } from "@/components/shared/FilterBar";
import { ErrorState } from "@/components/shared/States";
import { FileUpload } from "@/components/shared/Uploads";
import { PageHeader } from "@/components/shared/PageHeader";
import { ListPageLayout, ListWorkspace } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getBusinessDateKey } from "@/lib/time/timezone";
import { InsuranceDetails } from "./InsuranceDetails";
import type { InsuranceRecord, InsuranceEmployee, InsurancePaymentStatus, InsuranceParticipationStatus } from "./sharedtypes";
import { insuranceMonth, insuranceMoney as money, insurancePaymentLabels as paymentLabels, insuranceParticipationLabels as participationLabels, latestInsuranceContribution } from "./insurancePresentation";
import styles from "./InsuranceConsole.module.css";

type PaymentStatus = InsurancePaymentStatus;
type ParticipationStatus = InsuranceParticipationStatus;
type RecordItem = InsuranceRecord;
type Employee = InsuranceEmployee;

export function InsuranceConsole({ canEdit, canUpload }: { canEdit: boolean; canUpload: boolean }) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editing, setEditing] = useState<RecordItem>();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [contributionsAvailable, setContributionsAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [canViewHistory, setCanViewHistory] = useState(false);
  const [detailEmployeeId, setDetailEmployeeId] = useState<string>();
  const mutation = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
    const response = await fetch("/api/v1/insurance", { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setRecords(body.data.records ?? []);
    setEmployees(body.data.employees ?? []);
    setCanViewHistory(Boolean(body.data.canViewHistory));
    setContributionsAvailable(body.data.contributionsAvailable !== false);
    setLoaded(true);
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Không thể tải hồ sơ bảo hiểm.");
      throw reason;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load().catch(() => undefined); }, [load]);
  const retry = () => { void load().catch(() => undefined); };

  function edit(item?: RecordItem) {
    setError("");
    setEditing(item);
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.current || !contributionsAvailable) return;
    mutation.current = true;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const isExistingRecord = Boolean(editing);
    const rawBase = String(form.get("contributionBase") ?? "");
    const rawRate = String(form.get("contributionRatePercent") ?? "");
    const metadata = {
      employeeId: String(form.get("employeeId") || editing?.employeeId || ""),
      socialInsuranceNumber: String(form.get("socialInsuranceNumber") ?? ""),
      participationStatus: String(form.get("participationStatus")) as ParticipationStatus,
      startDate: String(form.get("startDate") ?? "") || undefined,
      contributionBase: rawBase ? Number(rawBase) : undefined,
      contributionRatePercent: rawRate ? Number(rawRate) : undefined,
      paymentStatus: editing?.paymentStatus ?? "pending" as PaymentStatus,
      recordContribution: false,
      socialInsuranceEnabled: form.get("socialInsuranceEnabled") === "on",
      healthInsuranceEnabled: form.get("healthInsuranceEnabled") === "on",
      unemploymentInsuranceEnabled: form.get("unemploymentInsuranceEnabled") === "on",
      changeType: !isExistingRecord ? "joined" : form.get("participationStatus") === "suspended" ? "suspended" : form.get("participationStatus") === "ended" ? "ended" : editing?.participationStatus === "suspended" && form.get("participationStatus") === "active" ? "resumed" : "adjusted",
      effectiveDate: String(form.get("effectiveDate") || getBusinessDateKey()),
      reason: String(form.get("reason") ?? "").trim(),
      expectedUpdatedAt: editing?.updatedAt
    };
    const payload = new FormData();
    payload.set("metadata", JSON.stringify(metadata));
    const file = form.get("file");
    if (file instanceof File && file.size) payload.set("file", file);
    try {
      const response = await fetch("/api/v1/insurance", { method: "POST", body: payload, signal: AbortSignal.timeout(30_000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể lưu hồ sơ bảo hiểm.");
      setOpen(false);
      setEditing(undefined);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu hồ sơ bảo hiểm.");
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }

  const columns = useMemo<DataTableColumn<RecordItem>[]>(() => [
    { id: "employee", header: "Nhân viên", priority: "primary", cell: (item) => <button aria-label={`Xem BHXH của ${item.employeeName}`} className={styles.employeeButton} onClick={() => setDetailEmployeeId(item.employeeId)} type="button"><strong>{item.employeeName}</strong><small>{item.employeeCode}</small></button> },
    { id: "number", header: "Mã số BHXH", accessor: "socialInsuranceNumber", hiddenOnMobile: true },
    { id: "participation", header: "Tham gia", cell: (item) => participationLabels[item.participationStatus] ?? "—", hiddenOnMobile: true },
    { id: "base", header: "Mức lương đóng", cell: (item) => money(item.contributionBase), align: "right" },
    { id: "period", header: "Kỳ gần nhất", cell: (item) => insuranceMonth(latestInsuranceContribution(item.contributions)?.contributionMonth ?? item.contributionMonth) },
    { id: "payment_status", header: "Tình trạng đóng", cell: (item) => { const latest = latestInsuranceContribution(item.contributions), recorded = Boolean(latest || item.contributionMonth), status = latest?.paymentStatus ?? item.paymentStatus; return <StatusBadge tone={recorded && status === "paid" ? "success" : recorded && status === "overdue" ? "warning" : "neutral"}>{recorded ? paymentLabels[status] : "Chưa ghi nhận kỳ đóng"}</StatusBadge>; } }
  ], []);
  const filtered = records.filter((item) => { const latest = latestInsuranceContribution(item.contributions), recorded = Boolean(latest || item.contributionMonth), status = recorded ? latest?.paymentStatus ?? item.paymentStatus : "unrecorded"; return (!paymentFilter || status === paymentFilter) && `${item.employeeName} ${item.employeeCode} ${item.socialInsuranceNumber}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")); });
  const detailRecord = records.find((item) => item.employeeId === detailEmployeeId);

  const employeeOptions = employees.map(item => ({ value: item.id, label: item.code + " · " + item.name }));
  if (editing && !employees.some(item => item.id === editing.employeeId)) employeeOptions.unshift({ value: editing.employeeId, label: editing.employeeCode + " · " + editing.employeeName });
  const filteredEmpty = Boolean(search.trim() || paymentFilter);

  return (
    <ListPageLayout className={styles.workspace}>
      <PageHeader title="Bảo hiểm xã hội" action={canEdit ? <Button disabled={!loaded || loading || !contributionsAvailable} leftIcon={<Plus aria-hidden="true" size={16} />} onClick={() => edit()} variant="primary">Thêm thông tin</Button> : undefined} />
      <ListWorkspace label="Hồ sơ bảo hiểm xã hội" filters={<><FilterBar busy={loading}>
          <SearchInput aria-label="Tìm nhân viên hoặc mã BHXH" placeholder="Nhân viên, mã BHXH" value={search} onChange={event => setSearch(event.target.value)} />
          <Select label="Tình trạng đóng" value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)} options={[{ value: "", label: "Tất cả" }, { value: "unrecorded", label: "Chưa ghi nhận kỳ đóng" }, ...Object.entries(paymentLabels).map(([value, label]) => ({ value, label }))]} />
        </FilterBar></>} status={loaded ? <div className="worklist-summary"><span role="status">{filteredEmpty ? filtered.length + " / " + records.length : records.length} hồ sơ</span>{filteredEmpty ? <Button onClick={() => { setSearch(""); setPaymentFilter(""); }} size="sm" variant="ghost">Xóa bộ lọc</Button> : null}</div> : null}>
{loaded && !contributionsAvailable ? <div className={styles.availability} role="status"><ShieldAlert aria-hidden="true" size={18} /><span>Quá trình đóng BHXH chưa sẵn sàng</span><StatusBadge tone="warning">Chỉ đọc hồ sơ</StatusBadge></div> : null}
{loaded && loadError ? <ErrorState title="Không thể cập nhật danh sách" description={loadError} action={<Button onClick={retry}>Thử lại</Button>} /> : null}
<DataTable<RecordItem>
          ariaLabel="Hồ sơ bảo hiểm xã hội"
          actions={item => <div className={styles.rowActions}><Button aria-label={"Xem chi tiết BHXH " + item.employeeName} onClick={() => setDetailEmployeeId(item.employeeId)} size="sm">Xem chi tiết</Button>{canEdit && contributionsAvailable ? <DropdownMenu label={"Thao tác hồ sơ " + item.employeeName}><button disabled={saving} onClick={() => edit(item)} type="button">Cập nhật</button></DropdownMenu> : null}</div>}
          columns={columns} data={filtered} emptyDescription=""
          emptyTitle={filteredEmpty ? "Không có hồ sơ phù hợp" : "Chưa có hồ sơ bảo hiểm"}
          error={!loaded ? loadError : undefined} onRetry={retry}
          getRowId={item => item.employeeId} loading={!loaded && loading}
        />
</ListWorkspace>
      {detailRecord && !open ? <InsuranceDetails key={detailRecord.employeeId} record={detailRecord} canEdit={canEdit && contributionsAvailable} canViewHistory={canViewHistory} onClose={() => setDetailEmployeeId(undefined)} onEditProfile={() => edit(detailRecord)} onUpdated={load} /> : null}
      <Drawer onClose={() => { if (!saving) { setOpen(false); setError(""); } }} open={open} title={editing ? "Cập nhật thông tin BHXH" : "Thêm thông tin BHXH"}>
        <SectionedForm key={editing?.employeeId ?? "new"} onSubmit={submit}>
          {!contributionsAvailable ? <div className={styles.availability} role="status"><ShieldAlert aria-hidden="true" size={18} /><span>Chức năng lưu hồ sơ BHXH chưa sẵn sàng</span></div> : null}
          <FieldGroup title="Hồ sơ tham gia">
            <div className={styles.fullWidth}><Select defaultValue={editing?.employeeId} disabled={Boolean(editing)} label="Nhân viên" name="employeeId" options={employeeOptions.filter(item => item.value === editing?.employeeId || !records.some(record => record.employeeId === item.value))} placeholder="Chọn nhân viên" required /></div>
            <Input defaultValue={editing?.socialInsuranceNumber} label="Mã số BHXH" name="socialInsuranceNumber" minLength={5} maxLength={30} required />
            <Select defaultValue={editing?.participationStatus ?? "active"} label="Tình trạng tham gia" name="participationStatus" options={Object.entries(participationLabels).map(([value, label]) => ({ value, label }))} />
            <Input defaultValue={editing?.startDate} label="Ngày bắt đầu" name="startDate" type="date" />
          </FieldGroup>
          <FieldGroup title="Mức đóng & khoản tham gia">
            <Input defaultValue={editing?.contributionBase} label="Mức lương đóng" min="0" name="contributionBase" type="number" />
            <Input defaultValue={editing?.contributionRatePercent} label="Tỷ lệ đóng (%)" max="100" min="0" name="contributionRatePercent" step="0.01" type="number" />
            <fieldset className={styles.coverage}><legend>Khoản tham gia</legend>
              <label><input defaultChecked={editing?.socialInsuranceEnabled ?? true} name="socialInsuranceEnabled" type="checkbox" /><span>BHXH</span></label>
              <label><input defaultChecked={editing?.healthInsuranceEnabled ?? true} name="healthInsuranceEnabled" type="checkbox" /><span>BHYT</span></label>
              <label><input defaultChecked={editing?.unemploymentInsuranceEnabled ?? true} name="unemploymentInsuranceEnabled" type="checkbox" /><span>BHTN</span></label>
            </fieldset>
          </FieldGroup>
          <FieldGroup title="Hiệu lực & tài liệu">
            <Input defaultValue={getBusinessDateKey()} label="Ngày hiệu lực" name="effectiveDate" required type="date" />
            <div className={styles.fullWidth}><Textarea defaultValue={editing ? "Điều chỉnh hồ sơ BHXH" : "Tham gia BHXH"} label="Lý do" minLength={3} maxLength={500} name="reason" required /></div>
            {canUpload ? <div className={styles.fullWidth}><FileUpload accept="application/pdf,image/jpeg,image/png,image/webp" label="Tài liệu bảo hiểm" name="file" /></div> : null}
          </FieldGroup>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <FormActions><Button disabled={saving} onClick={() => setOpen(false)} type="button">Hủy</Button><Button disabled={saving || !contributionsAvailable} type="submit" variant="primary" busy={saving}>Lưu thông tin</Button></FormActions>
        </SectionedForm>
      </Drawer>
    </ListPageLayout>
  );
}
