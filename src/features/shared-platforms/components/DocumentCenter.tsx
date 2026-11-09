"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback,useEffect,useRef,useState } from "react";import { Button } from "@/components/shared/Button";import { Card } from "@/components/shared/Card";import { Input,SearchInput,Select } from "@/components/shared/FormControls";import { StatusBadge } from "@/components/shared/StatusBadge";import type { DocumentRecord } from "@/features/shared-platforms/types";

import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { ListPageLayout, ListWorkspace } from "@/components/shared/PageLayouts";
import { InlineForm, FormFields, FormActions } from "@/components/shared/FormLayout";
import { FileUpload } from "@/components/shared/Uploads";
const documentOwnerLabels: Record<string,string> = { message: "Trao đổi", project_update: "Dự án", employee_document: "Nhân sự", employee_identity_document: "Hồ sơ nhân viên", inventory_document: "Kho", shipment_document: "Lô hàng", company_document: "Nội bộ", worker_attendance_session: "Điểm danh", attendance_event: "Chấm công" };
interface Type{id:string;name:string}function size(value:number){if(value<1024)return`${value} B`;if(value<1048576)return`${(value/1024).toFixed(1)} KB`;return`${(value/1048576).toFixed(1)} MB`;}
export function DocumentCenter({view="all"}:{view?:"all"|"recent"|"shared"}){const[uploadError,setUploadError]=useState("");const[uploading,setUploading]=useState(false);const uploadPending=useRef(false);const[items,setItems]=useState<DocumentRecord[]>([]),[types,setTypes]=useState<Type[]>([]),[q,setQ]=useState(""),[typeId,setTypeId]=useState(""),[module,setModule]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState(""),[showUpload,setShowUpload]=useState(false),[title,setTitle]=useState(""),[uploadType,setUploadType]=useState(""),[expiry,setExpiry]=useState(""),fileRef=useRef<HTMLInputElement>(null);const load=useCallback(async()=>{setLoading(true);try{const params=new URLSearchParams({view});if(q)params.set("q",q);if(typeId)params.set("typeId",typeId);if(module)params.set("module",module);const response=await fetch(`/api/v1/documents?${params}`),body=await response.json() as{data?:DocumentRecord[];error?:{message:string}};if(!response.ok)throw new Error(body.error?.message??"Không thể tải tài liệu.");setItems(body.data??[]);setError("");}catch(reason){setError(reason instanceof Error?reason.message:"Không thể tải tài liệu.");}finally{setLoading(false);}},[module,q,typeId,view]);useEffect(()=>{void load();},[load]);useEffect(()=>{void(async()=>{const response=await fetch("/api/v1/document-types"),body=await response.json() as{data?:Type[]};setTypes(body.data??[]);})();},[]);async function upload(event:React.FormEvent){event.preventDefault();const file=fileRef.current?.files?.[0];if(!file||uploadPending.current)return;uploadPending.current=true;setUploading(true);setUploadError("");try{const form=new FormData();form.set("file",file);form.set("metadata",JSON.stringify({title,documentTypeId:uploadType,expiryDate:expiry}));const response=await fetch("/api/v1/documents",{method:"POST",body:form}),body=await response.json() as{error?:{message:string}};if(!response.ok)throw new Error(body.error?.message??"Không thể tải tài liệu.");setShowUpload(false);setTitle("");setExpiry("");if(fileRef.current)fileRef.current.value="";await load();}catch(reason){setUploadError(reason instanceof Error?reason.message:"Không thể tải tài liệu.");}finally{uploadPending.current=false;setUploading(false);}}return <ListPageLayout>
  <ListWorkspace label="Danh sách tài liệu" filters={<><FilterBar busy={loading} actions={<Button disabled={loading} onClick={() => { setUploadError(""); setShowUpload(value => !value); }} variant="primary">Tải tài liệu nội bộ</Button>}>
      <SearchInput aria-label="Tìm tài liệu" placeholder="Tìm theo tên tài liệu" value={q} onChange={event => setQ(event.target.value)} />
      <Select label="Loại tài liệu" options={types.map(item => ({ label: item.name, value: item.id }))} placeholder="Tất cả" value={typeId} onChange={event => setTypeId(event.target.value)} />
      <Select label="Module" options={[{ label: "Dự án", value: "project_update" }, { label: "Kho", value: "inventory_document" }, { label: "Xuất nhập khẩu", value: "shipment_document" }, { label: "Nhân sự", value: "employee_document" }, { label: "Nội bộ", value: "company_document" }]} placeholder="Tất cả" value={module} onChange={event => setModule(event.target.value)} />
    </FilterBar></>} status={!loading && !error ? <div className="worklist-summary"><span role="status">{items.length} tài liệu</span>{q || typeId || module ? <Button onClick={() => { setQ(""); setTypeId(""); setModule(""); }} size="sm" variant="ghost">Xóa bộ lọc</Button> : null}</div> : null}>
<DataTable<DocumentRecord> pageSize={15} ariaLabel="Danh sách tài liệu" columns={[
      { id: "title", header: "Tên tài liệu", priority: "primary", sortable: true, accessor: "title", cell: item => <span className="record-identity"><strong>{item.title}</strong><small>{item.documentTypeName}</small></span> },
      { id: "owner", header: "Thuộc", hiddenOnMobile: true, cell: item => item.ownerReference ?? documentOwnerLabels[item.ownerEntityType] ?? "Khác" },
      { id: "version", header: "Phiên bản", cell: item => <StatusBadge tone="info">v{item.currentVersion}</StatusBadge> },
      { id: "size", header: "Dung lượng", align: "right", hiddenOnMobile: true, cell: item => size(item.byteSize) },
      { id: "updated", header: "Cập nhật", sortable: true, accessor: "updatedAt", cell: item => <time dateTime={item.updatedAt}>{new Intl.DateTimeFormat("vi-VN").format(new Date(item.updatedAt))}</time> }
    ]} data={items} error={error} onRetry={() => void load()} loading={loading} emptyDescription="" emptyTitle={q || typeId || module ? "Không có tài liệu phù hợp" : "Chưa có tài liệu"} getRowHref={item => `/documents/${item.id}`} getRowId={item => item.id} rowActivation="open" />
</ListWorkspace>
  {showUpload ? <Card><InlineForm onSubmit={event => void upload(event)}>
    <FormFields>
      <Input required label="Tên tài liệu" value={title} onChange={event => setTitle(event.target.value)} />
      <Select required label="Loại tài liệu" options={types.map(item => ({ label: item.name, value: item.id }))} placeholder="Chọn loại" value={uploadType} onChange={event => setUploadType(event.target.value)} />
      <Input label="Ngày hết hạn" type="date" value={expiry} onChange={event => setExpiry(event.target.value)} />
      <FileUpload label="Tệp tài liệu" ref={fileRef} required />
      {uploadError ? <p className="form-error" role="alert">{uploadError}</p> : null}
    </FormFields>
    <FormActions><Button disabled={uploading} onClick={() => setShowUpload(false)}>Hủy</Button><Button busy={uploading} disabled={uploading} type="submit" variant="primary">Tải lên</Button></FormActions>
  </InlineForm></Card> : null}
</ListPageLayout>;
}
