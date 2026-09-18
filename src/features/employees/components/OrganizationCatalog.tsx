"use client";

/* eslint-disable react-hooks/set-state-in-effect -- catalog state is hydrated from the API. */
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { FilterBar } from "@/components/shared/FilterBar";
import { Input, SearchInput, Select } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBusinessDate } from "@/lib/time/timezone";

type EmployeeOption = { id: string; code: string; name: string };
type DepartmentRow = { id:string;code:string;name:string;parentDepartmentId?:string;managerEmployeeId?:string;managerName?:string;active:boolean;sortOrder:number;headcount:number };
type PositionRow = { id:string;code:string;name:string;departmentId?:string;departmentName?:string;active:boolean;sortOrder:number;headcount:number };
type Catalog = { departments:DepartmentRow[];positions:PositionRow[];employees:EmployeeOption[] };
type DepartmentDraft = Omit<DepartmentRow,"id"|"managerName"|"headcount">;
type PositionDraft = Omit<PositionRow,"id"|"departmentName"|"headcount">;
type ContractRow = { id:string;employeeId:string;employeeCode:string;employeeName:string;departmentName?:string;positionName?:string;contractNumber:string;contractType:string;signedDate?:string;effectiveDate:string;endDate?:string;status:string;archivedAt?:string;attachmentFileId?:string };

const emptyDepartment:DepartmentDraft={code:"",name:"",active:true,sortOrder:0};
const emptyPosition:PositionDraft={code:"",name:"",active:true,sortOrder:0};
const contractStatus:Record<string,string>={draft:"Nháp",active:"Đang hiệu lực",expired:"Hết hạn",terminated:"Đã chấm dứt"};

async function request<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{cache:"no-store",...init});
  const body=await response.json() as{data?:T;error?:{message?:string}};
  if(!response.ok||body.data===undefined)throw new Error(body.error?.message??"Không thể xử lý yêu cầu.");
  return body.data;
}

function activeBadge(active:boolean){return <StatusBadge tone={active?"success":"neutral"}>{active?"Đang dùng":"Ngừng dùng"}</StatusBadge>;}

export function OrganizationCatalog({kind,canManage}:{kind:"departments"|"positions";canManage:boolean}){
  const[catalog,setCatalog]=useState<Catalog>(),[query,setQuery]=useState(""),[open,setOpen]=useState(false),[editingId,setEditingId]=useState<string>(),[department,setDepartment]=useState<DepartmentDraft>(emptyDepartment),[position,setPosition]=useState<PositionDraft>(emptyPosition),[error,setError]=useState(""),[saving,setSaving]=useState(false);
  const endpoint=`/api/v1/hr/${kind}`;
  const load=useCallback(async()=>{try{setCatalog(await request<Catalog>(endpoint));setError("");}catch(reason){setError(reason instanceof Error?reason.message:"Không thể tải dữ liệu.");}},[endpoint]);
  useEffect(()=>{void load();},[load]);
  function create(){setEditingId(undefined);setDepartment(emptyDepartment);setPosition(emptyPosition);setError("");setOpen(true);}
  function editDepartment(row:DepartmentRow){setEditingId(row.id);setDepartment({code:row.code,name:row.name,parentDepartmentId:row.parentDepartmentId,managerEmployeeId:row.managerEmployeeId,active:row.active,sortOrder:row.sortOrder});setOpen(true);}
  function editPosition(row:PositionRow){setEditingId(row.id);setPosition({code:row.code,name:row.name,departmentId:row.departmentId,active:row.active,sortOrder:row.sortOrder});setOpen(true);}
  async function submit(event:FormEvent){event.preventDefault();setSaving(true);setError("");try{const payload=kind==="departments"?department:position;setCatalog(await request<Catalog>(editingId?`${endpoint}/${editingId}`:endpoint,{method:editingId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}));setOpen(false);}catch(reason){setError(reason instanceof Error?reason.message:"Không thể lưu dữ liệu.");}finally{setSaving(false);}}
  const normalized=query.toLocaleLowerCase("vi");
  const departments=useMemo(()=>(catalog?.departments??[]).filter(row=>`${row.code} ${row.name} ${row.managerName??""}`.toLocaleLowerCase("vi").includes(normalized)),[catalog,normalized]);
  const positions=useMemo(()=>(catalog?.positions??[]).filter(row=>`${row.code} ${row.name} ${row.departmentName??""}`.toLocaleLowerCase("vi").includes(normalized)),[catalog,normalized]);
  const departmentName=new Map((catalog?.departments??[]).map(row=>[row.id,row.name]));
  const departmentColumns:DataTableColumn<DepartmentRow>[]=[{id:"code",header:"Mã",cell:row=><strong>{row.code}</strong>},{id:"name",header:"Phòng ban",accessor:"name"},{id:"parent",header:"Trực thuộc",cell:row=>row.parentDepartmentId?departmentName.get(row.parentDepartmentId)??"—":"—"},{id:"manager",header:"Trưởng phòng",cell:row=>row.managerName??"—"},{id:"headcount",header:"Nhân sự",accessor:"headcount",align:"right"},{id:"status",header:"Trạng thái",cell:row=>activeBadge(row.active)}];
  const positionColumns:DataTableColumn<PositionRow>[]=[{id:"code",header:"Mã",cell:row=><strong>{row.code}</strong>},{id:"name",header:"Chức vụ",accessor:"name"},{id:"department",header:"Phòng ban",cell:row=>row.departmentName??"Dùng chung"},{id:"headcount",header:"Nhân sự",accessor:"headcount",align:"right"},{id:"status",header:"Trạng thái",cell:row=>activeBadge(row.active)}];
  return <ListPageLayout><DataSurface><div className="data-surface__toolbar"><FilterBar actions={canManage?<Button leftIcon={<Plus size={16}/>} onClick={create} variant="primary">{kind==="departments"?"Thêm phòng ban":"Thêm chức vụ"}</Button>:undefined}><SearchInput onChange={event=>setQuery(event.target.value)} placeholder={kind==="departments"?"Mã, tên phòng ban, trưởng phòng":"Mã, tên chức vụ, phòng ban"} value={query}/></FilterBar></div>{kind==="departments"?<DataTable actions={canManage?row=><DropdownMenu label={`Thao tác ${row.name}`}><button onClick={()=>editDepartment(row)} type="button">Chỉnh sửa</button></DropdownMenu>:undefined} columns={departmentColumns} data={departments} emptyDescription="" emptyTitle="Chưa có phòng ban" error={error} getRowId={row=>row.id} loading={!catalog&&!error}/>:<DataTable actions={canManage?row=><DropdownMenu label={`Thao tác ${row.name}`}><button onClick={()=>editPosition(row)} type="button">Chỉnh sửa</button></DropdownMenu>:undefined} columns={positionColumns} data={positions} emptyDescription="" emptyTitle="Chưa có chức vụ" error={error} getRowId={row=>row.id} loading={!catalog&&!error}/>}</DataSurface><Drawer onClose={()=>setOpen(false)} open={open} title={`${editingId?"Chỉnh sửa":"Thêm"} ${kind==="departments"?"phòng ban":"chức vụ"}`}><form className="drawer-form" onSubmit={submit}>{kind==="departments"?<><Input label="Mã phòng ban" required value={department.code} onChange={event=>setDepartment({...department,code:event.target.value})}/><Input label="Tên phòng ban" required value={department.name} onChange={event=>setDepartment({...department,name:event.target.value})}/><Select label="Phòng ban cấp trên" options={(catalog?.departments??[]).filter(row=>row.id!==editingId).map(row=>({value:row.id,label:`${row.code} · ${row.name}`}))} placeholder="Không có" value={department.parentDepartmentId??""} onChange={event=>setDepartment({...department,parentDepartmentId:event.target.value||undefined})}/><Select label="Trưởng phòng" options={(catalog?.employees??[]).map(row=>({value:row.id,label:`${row.code} · ${row.name}`}))} placeholder="Chưa chọn" value={department.managerEmployeeId??""} onChange={event=>setDepartment({...department,managerEmployeeId:event.target.value||undefined})}/><Input label="Thứ tự" min="0" type="number" value={department.sortOrder} onChange={event=>setDepartment({...department,sortOrder:Number(event.target.value)})}/><Select label="Trạng thái" options={[{value:"active",label:"Đang dùng"},{value:"inactive",label:"Ngừng dùng"}]} value={department.active?"active":"inactive"} onChange={event=>setDepartment({...department,active:event.target.value==="active"})}/></>:<><Input label="Mã chức vụ" required value={position.code} onChange={event=>setPosition({...position,code:event.target.value})}/><Input label="Tên chức vụ" required value={position.name} onChange={event=>setPosition({...position,name:event.target.value})}/><Select label="Phòng ban" options={(catalog?.departments??[]).map(row=>({value:row.id,label:`${row.code} · ${row.name}`}))} placeholder="Dùng chung" value={position.departmentId??""} onChange={event=>setPosition({...position,departmentId:event.target.value||undefined})}/><Input label="Thứ tự" min="0" type="number" value={position.sortOrder} onChange={event=>setPosition({...position,sortOrder:Number(event.target.value)})}/><Select label="Trạng thái" options={[{value:"active",label:"Đang dùng"},{value:"inactive",label:"Ngừng dùng"}]} value={position.active?"active":"inactive"} onChange={event=>setPosition({...position,active:event.target.value==="active"})}/></>}{error?<p className="form-error" role="alert">{error}</p>:null}<div className="form-actions"><Button onClick={()=>setOpen(false)} type="button">Hủy</Button><Button disabled={saving} type="submit" variant="primary">{saving?"Đang lưu…":"Lưu"}</Button></div></form></Drawer></ListPageLayout>;
}

export function EmployeeContractList({canViewEmployee}:{canViewEmployee:boolean}){
  const[items,setItems]=useState<ContractRow[]>(),[query,setQuery]=useState(""),[status,setStatus]=useState(""),[error,setError]=useState("");
  useEffect(()=>{void request<ContractRow[]>("/api/v1/hr/contracts").then(setItems).catch(reason=>setError(reason instanceof Error?reason.message:"Không thể tải hợp đồng."));},[]);
  const rows=useMemo(()=>(items??[]).filter(row=>(!status||row.status===status)&&`${row.contractNumber} ${row.employeeCode} ${row.employeeName} ${row.contractType}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))),[items,query,status]);
  const columns:DataTableColumn<ContractRow>[]=[
    {id:"number",header:"Hợp đồng",cell:row=><>{canViewEmployee?<Link className="text-link" href={`/employees/${row.employeeId}/contracts`}>{row.contractNumber}</Link>:row.contractNumber}<br/><small>{row.contractType}</small></>},
    {id:"employee",header:"Nhân viên",cell:row=><><strong>{row.employeeName}</strong><br/><small>{row.employeeCode} · {[row.departmentName,row.positionName].filter(Boolean).join(" · ")}</small></>},
    {id:"dates",header:"Hiệu lực / Hết hạn",cell:row=><>{formatBusinessDate(row.effectiveDate)}<br/><small>{row.endDate?formatBusinessDate(row.endDate):"Không thời hạn"}</small></>},
    {id:"status",header:"Trạng thái",cell:row=><StatusBadge tone={row.status==="active"?"success":row.status==="expired"||row.status==="terminated"?"neutral":"warning"}>{row.archivedAt?"Đã lưu trữ":contractStatus[row.status]??row.status}</StatusBadge>},
    {id:"file",header:"File",cell:row=>row.attachmentFileId?<a className="text-link" href={`/api/v1/files/${row.attachmentFileId}/signed-url`} rel="noreferrer" target="_blank">Xem PDF</a>:"—"}
  ];
  return <div className="page-stack"><FilterBar><SearchInput onChange={event=>setQuery(event.target.value)} placeholder="Số hợp đồng, nhân viên, loại hợp đồng" value={query}/><Select label="Trạng thái" options={Object.entries(contractStatus).map(([value,label])=>({value,label}))} placeholder="Tất cả" value={status} onChange={event=>setStatus(event.target.value)}/></FilterBar><DataTable columns={columns} data={rows} emptyDescription="" emptyTitle="Chưa có hợp đồng" error={error} getRowId={row=>row.id} loading={!items&&!error}/></div>;
}
