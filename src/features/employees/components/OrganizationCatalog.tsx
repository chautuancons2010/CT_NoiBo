"use client";

/* eslint-disable react-hooks/set-state-in-effect -- catalog state is hydrated from the API. */
import Link from "next/link";
import { FilePlus2, FileUp, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FieldGroup, FormActions, SectionedForm } from "@/components/shared/FormLayout";
import { ErrorState } from "@/components/shared/States";
import { FileUpload } from "@/components/shared/Uploads";
import { FilterBar } from "@/components/shared/FilterBar";
import { DatePicker, Input, SearchInput, Select, Textarea } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { PageHeader } from "@/components/shared/PageHeader";
import { ListPageLayout, ListWorkspace } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBusinessDate } from "@/lib/time/timezone";
import contractStyles from "./EmployeeContractManager.module.css";
import styles from "./OrganizationCatalog.module.css";

type EmployeeOption = { id: string; code: string; name: string };
type DepartmentRow = { id:string;code:string;name:string;parentDepartmentId?:string;managerEmployeeId?:string;managerName?:string;active:boolean;sortOrder:number;headcount:number };
type PositionRow = { id:string;code:string;name:string;departmentId?:string;departmentName?:string;active:boolean;sortOrder:number;headcount:number };
type Catalog = { departments:DepartmentRow[];positions:PositionRow[];employees:EmployeeOption[] };
type DepartmentDraft = Omit<DepartmentRow,"id"|"managerName"|"headcount">;
type PositionDraft = Omit<PositionRow,"id"|"departmentName"|"headcount">;
type ContractRow = { id:string;employeeId:string;employeeCode:string;employeeName:string;departmentName?:string;positionName?:string;contractNumber:string;contractType:string;signedDate?:string;effectiveDate:string;endDate?:string;status:string;archivedAt?:string;attachmentFileId?:string;attachmentFileName?:string;attachmentMimeType?:string };
type ContractEmployeeOption={id:string;code:string;name:string;departmentName?:string;positionName?:string};
type ContractTemplateOption={id:string;name:string;fileAssetId?:string;createdAt:string};
type ContractWorkspace={contracts:ContractRow[];employees:ContractEmployeeOption[];templates:ContractTemplateOption[]};

const emptyDepartment:DepartmentDraft={code:"",name:"",active:true,sortOrder:0};
const emptyPosition:PositionDraft={code:"",name:"",active:true,sortOrder:0};
const contractStatus:Record<string,string>={draft:"Nháp",active:"Đang hiệu lực",expired:"Hết hạn",terminated:"Đã chấm dứt"};

async function request<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(30_000),...init});
  const body=await response.json() as{data?:T;error?:{message?:string}};
  if(!response.ok||body.data===undefined)throw new Error(body.error?.message??"Không thể xử lý yêu cầu.");
  return body.data;
}

function activeBadge(active:boolean){return <StatusBadge tone={active?"success":"neutral"}>{active?"Đang dùng":"Ngừng dùng"}</StatusBadge>;}

export function OrganizationCatalog({ kind, canManage }: { kind: "departments" | "positions"; canManage: boolean }) {
  const [catalog, setCatalog] = useState<Catalog>();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [department, setDepartment] = useState<DepartmentDraft>(emptyDepartment);
  const [position, setPosition] = useState<PositionDraft>(emptyPosition);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mutation = useRef(false);
  const endpoint = `/api/v1/hr/${kind}`;
  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try { setCatalog(await request<Catalog>(endpoint)); }
    catch (reason) { setLoadError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu."); }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { void load(); }, [load]);
  function create() { setEditingId(undefined); setDepartment(emptyDepartment); setPosition(emptyPosition); setError(""); setOpen(true); }
  function editDepartment(row: DepartmentRow) { setEditingId(row.id); setDepartment({ code: row.code, name: row.name, parentDepartmentId: row.parentDepartmentId, managerEmployeeId: row.managerEmployeeId, active: row.active, sortOrder: row.sortOrder }); setError(""); setOpen(true); }
  function editPosition(row: PositionRow) { setEditingId(row.id); setPosition({ code: row.code, name: row.name, departmentId: row.departmentId, active: row.active, sortOrder: row.sortOrder }); setError(""); setOpen(true); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (mutation.current) return;
    mutation.current = true; setSaving(true); setError("");
    try {
      const payload = kind === "departments" ? department : position;
      setCatalog(await request<Catalog>(editingId ? `${endpoint}/${editingId}` : endpoint, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
      setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể lưu dữ liệu."); }
    finally { mutation.current = false; setSaving(false); }
  }
  const normalized = query.trim().toLocaleLowerCase("vi");
  const departments = useMemo(() => (catalog?.departments ?? []).filter(row => (!active || row.active === (active === "active")) && `${row.code} ${row.name} ${row.managerName ?? ""}`.toLocaleLowerCase("vi").includes(normalized)), [catalog, normalized, active]);
  const positions = useMemo(() => (catalog?.positions ?? []).filter(row => (!active || row.active === (active === "active")) && `${row.code} ${row.name} ${row.departmentName ?? ""}`.toLocaleLowerCase("vi").includes(normalized)), [catalog, normalized, active]);
  const departmentName = new Map((catalog?.departments ?? []).map(row => [row.id, row.name]));
  const departmentColumns: DataTableColumn<DepartmentRow>[] = [
    { id: "name", header: "Phòng ban", priority: "primary", cell: row => <span className="record-identity"><strong>{row.name}</strong><small>{row.code}</small></span> },
    { id: "parent", header: "Trực thuộc", hiddenOnMobile: true, cell: row => row.parentDepartmentId ? departmentName.get(row.parentDepartmentId) ?? "—" : "—" },
    { id: "manager", header: "Trưởng phòng", hiddenOnMobile: true, cell: row => row.managerName ?? "—" },
    { id: "headcount", header: "Nhân sự", accessor: "headcount", align: "right" },
    { id: "status", header: "Trạng thái", cell: row => activeBadge(row.active) }
  ];
  const positionColumns: DataTableColumn<PositionRow>[] = [
    { id: "name", header: "Chức vụ", priority: "primary", cell: row => <span className="record-identity"><strong>{row.name}</strong><small>{row.code}</small></span> },
    { id: "department", header: "Phòng ban", hiddenOnMobile: true, cell: row => row.departmentName ?? "Dùng chung" },
    { id: "headcount", header: "Nhân sự", accessor: "headcount", align: "right" },
    { id: "status", header: "Trạng thái", cell: row => activeBadge(row.active) }
  ];
  const filtered = Boolean(normalized || active), label = kind === "departments" ? "phòng ban" : "chức vụ";
  const total = kind === "departments" ? catalog?.departments.length : catalog?.positions.length;
  const count = kind === "departments" ? departments.length : positions.length;
  return <ListPageLayout className={styles.workspace}>
    <ListWorkspace label="Danh sách phòng ban" filters={<><FilterBar busy={loading} actions={canManage ? <Button disabled={!catalog || loading} leftIcon={<Plus aria-hidden="true" size={16} />} onClick={create} variant="primary">{kind === "departments" ? "Thêm phòng ban" : "Thêm chức vụ"}</Button> : undefined}>
        <SearchInput aria-label={`Tìm ${label}`} onChange={event => setQuery(event.target.value)} placeholder={kind === "departments" ? "Mã, tên phòng ban, trưởng phòng" : "Mã, tên chức vụ, phòng ban"} value={query} />
        <Select label="Trạng thái" value={active} onChange={event => setActive(event.target.value)} options={[{ value: "", label: "Tất cả trạng thái" }, { value: "active", label: "Đang dùng" }, { value: "inactive", label: "Ngừng dùng" }]} />
      </FilterBar></>} status={catalog ? <div className="worklist-summary"><span role="status">{filtered ? `${count} / ${total}` : total} {label}</span>{filtered ? <Button onClick={() => { setQuery(""); setActive(""); }} size="sm" variant="ghost">Xóa bộ lọc</Button> : null}</div> : null}>
{catalog && loadError ? <ErrorState title="Không thể cập nhật danh sách" description={loadError} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : null}
{kind === "departments" ? <DataTable<DepartmentRow> ariaLabel="Danh sách phòng ban" actions={canManage ? row => <Button aria-label={`Chỉnh sửa ${row.name}`} onClick={() => editDepartment(row)} size="sm">Chỉnh sửa</Button> : undefined} columns={departmentColumns} data={departments} emptyDescription="" emptyTitle={filtered ? "Không có phòng ban phù hợp" : "Chưa có phòng ban"} error={!catalog ? loadError : undefined} onRetry={() => void load()} getRowId={row => row.id} loading={!catalog && loading} /> : <DataTable<PositionRow> ariaLabel="Danh sách chức vụ" actions={canManage ? row => <Button aria-label={`Chỉnh sửa ${row.name}`} onClick={() => editPosition(row)} size="sm">Chỉnh sửa</Button> : undefined} columns={positionColumns} data={positions} emptyDescription="" emptyTitle={filtered ? "Không có chức vụ phù hợp" : "Chưa có chức vụ"} error={!catalog ? loadError : undefined} onRetry={() => void load()} getRowId={row => row.id} loading={!catalog && loading} />}
</ListWorkspace>
    <Drawer onClose={() => { if (!saving) setOpen(false); }} open={open} title={`${editingId ? "Chỉnh sửa" : "Thêm"} ${label}`}>
      <SectionedForm onSubmit={submit}>
        <FieldGroup title="Thông tin chung">
          {kind === "departments" ? <><Input label="Mã phòng ban" required value={department.code} onChange={event => setDepartment({ ...department, code: event.target.value })} /><Input label="Tên phòng ban" required value={department.name} onChange={event => setDepartment({ ...department, name: event.target.value })} /></> : <><Input label="Mã chức vụ" required value={position.code} onChange={event => setPosition({ ...position, code: event.target.value })} /><Input label="Tên chức vụ" required value={position.name} onChange={event => setPosition({ ...position, name: event.target.value })} /></>}
        </FieldGroup>
        <FieldGroup title="Tổ chức & trạng thái">
          {kind === "departments" ? <><Select label="Phòng ban cấp trên" options={(catalog?.departments ?? []).filter(row => row.id !== editingId).map(row => ({ value: row.id, label: `${row.code} · ${row.name}` }))} placeholder="Không có" value={department.parentDepartmentId ?? ""} onChange={event => setDepartment({ ...department, parentDepartmentId: event.target.value || undefined })} /><Select label="Trưởng phòng" options={(catalog?.employees ?? []).map(row => ({ value: row.id, label: `${row.code} · ${row.name}` }))} placeholder="Chưa chọn" value={department.managerEmployeeId ?? ""} onChange={event => setDepartment({ ...department, managerEmployeeId: event.target.value || undefined })} /><Input label="Thứ tự" min="0" type="number" value={department.sortOrder} onChange={event => setDepartment({ ...department, sortOrder: Number(event.target.value) })} /><Select label="Trạng thái" options={[{ value: "active", label: "Đang dùng" }, { value: "inactive", label: "Ngừng dùng" }]} value={department.active ? "active" : "inactive"} onChange={event => setDepartment({ ...department, active: event.target.value === "active" })} /></> : <><Select label="Phòng ban" options={(catalog?.departments ?? []).map(row => ({ value: row.id, label: `${row.code} · ${row.name}` }))} placeholder="Dùng chung" value={position.departmentId ?? ""} onChange={event => setPosition({ ...position, departmentId: event.target.value || undefined })} /><Input label="Thứ tự" min="0" type="number" value={position.sortOrder} onChange={event => setPosition({ ...position, sortOrder: Number(event.target.value) })} /><Select label="Trạng thái" options={[{ value: "active", label: "Đang dùng" }, { value: "inactive", label: "Ngừng dùng" }]} value={position.active ? "active" : "inactive"} onChange={event => setPosition({ ...position, active: event.target.value === "active" })} /></>}
        </FieldGroup>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <FormActions><Button disabled={saving} onClick={() => setOpen(false)}>Hủy</Button><Button disabled={saving} type="submit" variant="primary" busy={saving}>Lưu</Button></FormActions>
      </SectionedForm>
    </Drawer>
  </ListPageLayout>;
}

export function EmployeeContractList({canViewEmployee,canEdit,canUpload}:{canViewEmployee:boolean;canEdit:boolean;canUpload:boolean}){
  const[data,setData]=useState<ContractWorkspace>(),[query,setQuery]=useState(""),[status,setStatus]=useState(""),[error,setError]=useState(""),[contractOpen,setContractOpen]=useState(false),[templateListOpen,setTemplateListOpen]=useState(false),[templateOpen,setTemplateOpen]=useState(false),[saving,setSaving]=useState(false);
  const [documentMode,setDocumentMode]=useState("manual");const mutation=useRef(false);
  const [loadError,setLoadError]=useState(""),[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);setLoadError("");try{setData(await request<ContractWorkspace>("/api/v1/hr/contracts"));}catch(reason){setLoadError(reason instanceof Error?reason.message:"Không thể tải hợp đồng.");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const rows=useMemo(()=>(data?.contracts??[]).filter(row=>(!status||row.status===status)&&`${row.contractNumber} ${row.employeeCode} ${row.employeeName} ${row.contractType}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))),[data,query,status]);
  async function createContract(event:FormEvent<HTMLFormElement>){event.preventDefault();if(mutation.current)return;mutation.current=true;const form=event.currentTarget;setSaving(true);setError("");try{await request<ContractRow>("/api/v1/hr/contracts",{method:"POST",body:new FormData(form)});setContractOpen(false);form.reset();await load();}catch(reason){setError(reason instanceof Error?reason.message:"Không thể tạo hợp đồng.");}finally{mutation.current=false;setSaving(false);}}
  async function uploadTemplate(event:FormEvent<HTMLFormElement>){event.preventDefault();if(mutation.current)return;mutation.current=true;const form=event.currentTarget;setSaving(true);setError("");try{await request<ContractTemplateOption>("/api/v1/hr/contract-templates",{method:"POST",body:new FormData(form)});setTemplateOpen(false);form.reset();await load();}catch(reason){setError(reason instanceof Error?reason.message:"Không thể lưu mẫu Word.");}finally{mutation.current=false;setSaving(false);}}
  const columns: DataTableColumn<ContractRow>[] = [
    { id: "employee", header: "Nhân viên", priority: "primary", sortable: true, sortValue: row => row.employeeName, cell: row => <span className="record-identity">{canViewEmployee ? <Link className="table-link" href={`/employees/${row.employeeId}/contracts`}><strong>{row.employeeName}</strong></Link> : <strong>{row.employeeName}</strong>}<small>{row.employeeCode}</small></span> },
    { id: "number", header: "Hợp đồng", sortable: true, sortValue: row => row.contractNumber, cell: row => <span className="record-identity">{canViewEmployee ? <Link className="text-link" href={`/employees/${row.employeeId}/contracts`}>{row.contractNumber}</Link> : <span>{row.contractNumber}</span>}<small>{row.contractType}</small></span> },
    { id: "organization", header: "Đơn vị", hiddenOnMobile: true, cell: row => <span className="record-identity"><span>{row.departmentName ?? "—"}</span>{row.positionName ? <small>{row.positionName}</small> : null}</span> },
    { id: "dates", header: "Thời hạn", sortable: true, sortValue: row => row.effectiveDate, hiddenOnMobile: true, cell: row => <span className="record-identity"><span>{formatBusinessDate(row.effectiveDate)}</span><small>{row.endDate ? `đến ${formatBusinessDate(row.endDate)}` : "Không thời hạn"}</small></span> },
    { id: "status", header: "Trạng thái", width: "compact", cell: row => <span className="record-identity"><StatusBadge tone={row.status === "active" ? "success" : row.status === "expired" || row.status === "terminated" ? "neutral" : "warning"}>{row.archivedAt ? "Đã lưu trữ" : contractStatus[row.status] ?? row.status}</StatusBadge><small>{row.attachmentFileId ? <a className="text-link" href={`/api/v1/files/${row.attachmentFileId}/signed-url`} rel="noreferrer" target="_blank">{row.attachmentMimeType?.includes("wordprocessingml") ? "Tải Word" : "Xem tài liệu"}</a> : "Chưa có tệp"}</small></span> }
  ];
  const templates=data?.templates??[];
  return <>
      <PageHeader title="Hợp đồng lao động" action={<>{canUpload ? <Button disabled={saving || !data || loading} leftIcon={<FilePlus2 aria-hidden="true" size={16} />} onClick={() => setTemplateListOpen(true)}>Mẫu hợp đồng</Button> : null}{canEdit ? <Button disabled={saving || !data || loading} leftIcon={<Plus aria-hidden="true" size={16} />} onClick={() => { setError(""); setDocumentMode("manual"); setContractOpen(true); }} variant="primary">Tạo hợp đồng</Button> : null}</>} />
      <ListWorkspace className={contractStyles.surface} label="Danh sách hợp đồng lao động" filters={<><FilterBar className="contract-filter-bar"><SearchInput aria-label="Tìm hợp đồng" onChange={event=>setQuery(event.target.value)} placeholder="Số hợp đồng, tên hoặc mã nhân viên" value={query}/><Select label="Trạng thái" options={Object.entries(contractStatus).map(([value,label])=>({value,label}))} placeholder="Tất cả" value={status} onChange={event=>setStatus(event.target.value)}/></FilterBar></>} status={data ? <div className="worklist-summary"><span role="status">{query || status ? `${rows.length} / ${data.contracts.length}` : data.contracts.length} hợp đồng</span>{query || status ? <Button onClick={() => { setQuery(""); setStatus(""); }} size="sm" variant="ghost">Xóa bộ lọc</Button> : null}</div> : null}>
{data && loadError ? <ErrorState title="Không thể cập nhật danh sách" description={loadError} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : null}
<DataTable ariaLabel="Danh sách hợp đồng lao động" pageSize={10} className="employee-contract-list" columns={columns} data={rows} emptyDescription="" emptyTitle={query || status ? "Không có hợp đồng phù hợp" : "Chưa có hợp đồng"} error={!data ? loadError : undefined} onRetry={() => void load()} getRowHref={canViewEmployee?row=>`/employees/${row.employeeId}/contracts`:undefined} getRowId={row=>row.id} loading={!data&&loading}/>
</ListWorkspace>
    <Drawer onClose={()=>setTemplateListOpen(false)} open={templateListOpen} title="Mẫu Word">
      <div className={`contract-template-drawer ${contractStyles.templateList}`}><div className="panel-header"><h3>{templates.length} mẫu</h3>{canUpload?<Button leftIcon={<FileUp size={15}/>} onClick={()=>{setError("");setTemplateListOpen(false);setTemplateOpen(true);}} size="sm">Thêm mẫu</Button>:null}</div>
        <ul className="contract-template-list">{templates.map(template=><li key={template.id}><FilePlus2 aria-hidden="true" size={18}/><span><strong>{template.name}</strong><small>{formatBusinessDate(template.createdAt)}</small></span>{template.fileAssetId?<a className="text-link" href={`/api/v1/files/${template.fileAssetId}/signed-url`} rel="noreferrer" target="_blank">Tải mẫu</a>:null}</li>)}</ul>
        {!templates.length?<div className="compact-empty-state">Chưa có mẫu Word</div>:null}
      </div>
    </Drawer>
    <Drawer onClose={() => { if (!saving) setContractOpen(false); }} open={contractOpen} title="Tạo hợp đồng lao động">
      <SectionedForm onSubmit={createContract}>
        <FieldGroup title="Thông tin hợp đồng">
          <div className={contractStyles.fullWidth}><Select label="Nhân viên" name="employeeId" options={(data?.employees ?? []).map(employee => ({ value: employee.id, label: `${employee.code} · ${employee.name}${employee.departmentName ? ` · ${employee.departmentName}` : ""}` }))} placeholder="Chọn nhân viên" required /></div>
          <Input label="Số hợp đồng" name="contractNumber" required /><Input label="Loại hợp đồng" name="contractType" required />
        </FieldGroup>
        <FieldGroup title="Thời hạn & hiệu lực">
          <DatePicker label="Ngày ký" name="signedDate" /><DatePicker label="Ngày hiệu lực" name="effectiveDate" required /><DatePicker label="Ngày hết hạn" name="endDate" />
          <Select defaultValue="draft" label="Trạng thái" name="status" options={Object.entries(contractStatus).map(([value, label]) => ({ value, label }))} />
        </FieldGroup>
        <FieldGroup title="Tài liệu & ghi chú">
          {canUpload && templates.length ? <Select label="Nguồn tài liệu" options={[{ value: "manual", label: "Nhập thủ công" }, { value: "template", label: "Mẫu Word" }]} value={documentMode} onChange={event => setDocumentMode(event.target.value)} /> : null}
          {documentMode === "template" ? <Select label="Mẫu Word" name="templateId" options={templates.map(template => ({ value: template.id, label: template.name }))} placeholder="Chọn mẫu Word" required /> : canUpload ? <div className={contractStyles.fullWidth}><FileUpload accept="application/pdf" label="File hợp đồng PDF" name="file" /></div> : null}
          <div className={contractStyles.fullWidth}><Textarea label="Ghi chú" name="note" /></div>
        </FieldGroup>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <FormActions><Button disabled={saving} onClick={() => setContractOpen(false)}>Hủy</Button><Button disabled={saving} type="submit" variant="primary" busy={saving}>{documentMode === "template" ? "Tạo và xuất Word" : "Tạo hợp đồng"}</Button></FormActions>
      </SectionedForm>
    </Drawer>
    <Drawer onClose={() => { if (!saving) setTemplateOpen(false); }} open={templateOpen} title="Thêm mẫu Word">
      <SectionedForm onSubmit={uploadTemplate}><FieldGroup title="Mẫu hợp đồng" columns={1}><Input label="Tên mẫu" name="name" required /><FileUpload accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" label="File Word (.docx)" name="file" required /></FieldGroup>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <FormActions><Button disabled={saving} onClick={() => setTemplateOpen(false)}>Hủy</Button><Button disabled={saving} type="submit" variant="primary" busy={saving}>Lưu mẫu</Button></FormActions>
      </SectionedForm>
    </Drawer>
  </>;
}
