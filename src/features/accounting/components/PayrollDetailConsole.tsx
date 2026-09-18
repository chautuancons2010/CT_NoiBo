"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Card, StatCard } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Input } from "@/components/shared/FormControls";
import { DataSurface, DetailPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { PayrollDetail, PayrollLine } from "../types";

const money=(value:number)=>new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(value);
const labels={draft:"Nháp",calculated:"Đã tính",reviewed:"Đã kiểm tra",locked:"Đã khóa",published:"Đã phát hành"};

export function PayrollDetailConsole({id,permissions}:{id:string;permissions:{calculate:boolean;edit:boolean;lock:boolean;publish:boolean;export:boolean}}){
  const[data,setData]=useState<PayrollDetail>(),[editing,setEditing]=useState<PayrollLine>(),[error,setError]=useState("");
  const load=useCallback(async()=>{const response=await fetch(`/api/v1/accounting/payroll/${id}`,{cache:"no-store"}),body=await response.json();if(!response.ok)throw new Error(body.error?.message);setData(body.data);},[id]);
  useEffect(()=>{queueMicrotask(()=>void load().catch(reason=>setError(reason.message)));},[load]);
  async function patch(payload:Record<string,unknown>){if(!data)return false;const response=await fetch(`/api/v1/accounting/payroll/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({rowVersion:data.rowVersion,...payload})}),body=await response.json();if(!response.ok){setError(body.error?.message);return false;}setData(body.data);setError("");return true;}
  async function updateLine(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!editing)return;const reason=window.prompt("Lý do điều chỉnh bảng lương");if(!reason?.trim())return;const form=new FormData(event.currentTarget),saved=await patch({action:"update_line",lineId:editing.id,lineRowVersion:editing.rowVersion,allowance:Number(form.get("allowance")),bonus:Number(form.get("bonus")),deduction:Number(form.get("deduction")),reason});if(saved)setEditing(undefined);}
  async function reopen(){const reason=window.prompt("Lý do mở lại bảng lương để điều chỉnh");if(reason?.trim())await patch({action:"reopen",reason});}
  if(!data)return <Card>{error?<p className="form-error">{error}</p>:<p>Đang tải…</p>}</Card>;
  const gross=data.lines.reduce((sum,item)=>sum+item.baseSalary+item.allowance+item.bonus,0),deductions=data.lines.reduce((sum,item)=>sum+item.deduction,0),net=data.lines.reduce((sum,item)=>sum+item.netSalary,0),editable=permissions.edit&&!['locked','published'].includes(data.status);
  const columns: DataTableColumn<PayrollLine>[] = [
    { id: "employee", header: "Nhân viên", cell: (item) => <><strong>{item.employeeName}</strong><br /><small>{item.employeeCode}</small></> },
    { id: "days", header: "Ngày công", cell: (item) => String(item.workDays) },
    { id: "salary", header: "Lương", cell: (item) => money(item.baseSalary) },
    { id: "allowance", header: "Phụ cấp", cell: (item) => money(item.allowance), hiddenOnMobile: true },
    { id: "bonus", header: "Thưởng", cell: (item) => money(item.bonus), hiddenOnMobile: true },
    { id: "deduction", header: "Khấu trừ", cell: (item) => money(item.deduction), hiddenOnMobile: true },
    { id: "net", header: "Thực nhận", cell: (item) => <strong>{money(item.netSalary)}</strong> }
  ];
  return <DetailPageLayout>
    <div className="panel-header"><div><h2>Kỳ {data.periodMonth.slice(0,7)}</h2><StatusBadge tone={data.status==="locked"||data.status==="published"?"success":data.status==="draft"?"neutral":"info"}>{labels[data.status]}</StatusBadge></div><div className="form-actions">
      {permissions.export?<a className="button button--secondary button--md" href={`/api/v1/accounting/payroll/${id}/export`}>Xuất Excel</a>:null}
      {permissions.calculate&&["draft","calculated"].includes(data.status)?<Button onClick={()=>void patch({action:"calculate"})}>{data.status==="draft"?"Lấy dữ liệu công":"Tính lại"}</Button>:null}
      {permissions.edit&&data.status==="calculated"?<Button onClick={()=>void patch({action:"review"})}>Xác nhận kiểm tra</Button>:null}
      {permissions.lock&&data.status==="reviewed"?<Button onClick={()=>void patch({action:"lock"})} variant="primary">Khóa bảng lương</Button>:null}
      {permissions.publish&&data.status==="locked"?<Button onClick={()=>void patch({action:"publish"})} variant="primary">Tạo và phát hành phiếu lương</Button>:null}
      {permissions.edit&&["locked","published"].includes(data.status)?<Button onClick={()=>void reopen()} variant="secondary">Mở lại điều chỉnh</Button>:null}
    </div></div>
    <div className="content-grid dashboard-kpi-grid"><StatCard label="Nhân viên" value={String(data.lines.length)}/><StatCard label="Tổng thu nhập" value={money(gross)}/><StatCard label="Khấu trừ" value={money(deductions)}/><StatCard label="Thực nhận" value={money(net)}/></div>
    <DataSurface><DataTable actions={editable?(item)=><DropdownMenu label={`Thao tác lương ${item.employeeName}`}><button onClick={()=>setEditing(item)} type="button">Điều chỉnh</button></DropdownMenu>:undefined} columns={columns} data={data.lines} emptyDescription="" emptyTitle="Chưa có dữ liệu lương" getRowId={(item)=>item.id}/></DataSurface>
    {editing?<Card><div className="panel-header"><h3>Điều chỉnh · {editing.employeeName}</h3><Button onClick={()=>setEditing(undefined)}>Hủy</Button></div><form className="inline-form" key={editing.id} onSubmit={updateLine}><Input defaultValue={editing.allowance} label="Phụ cấp" min="0" name="allowance" required type="number"/><Input defaultValue={editing.bonus} label="Thưởng" min="0" name="bonus" required type="number"/><Input defaultValue={editing.deduction} label="Khấu trừ" min="0" name="deduction" required type="number"/><Button type="submit" variant="primary">Lưu điều chỉnh</Button></form></Card>:null}
    {error?<p className="form-error">{error}</p>:null}
  </DetailPageLayout>;
}
