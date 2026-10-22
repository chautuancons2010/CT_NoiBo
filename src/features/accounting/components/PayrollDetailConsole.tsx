"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Input } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { DataSurface, DetailPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { PayrollDetail, PayrollLine } from "../types";
import styles from "./PayrollDetailConsole.module.css";

const money=(value:number)=>new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(value);
const labels={draft:"Nháp",calculated:"Đã tính",reviewed:"Đã kiểm tra",locked:"Đã khóa",published:"Đã phát hành"};

export function PayrollDetailConsole({id,permissions}:{id:string;permissions:{calculate:boolean;edit:boolean;lock:boolean;publish:boolean;export:boolean}}){
  const[data,setData]=useState<PayrollDetail>(),[editing,setEditing]=useState<PayrollLine>(),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{const response=await fetch(`/api/v1/accounting/payroll/${id}`,{cache:"no-store"}),body=await response.json();if(!response.ok)throw new Error(body.error?.message);setData(body.data);},[id]);
  useEffect(()=>{queueMicrotask(()=>void load().catch(reason=>setError(reason.message)));},[load]);
  async function patch(payload:Record<string,unknown>){
    if(!data||busy)return false;
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/v1/accounting/payroll/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({rowVersion:data.rowVersion,...payload})}),body=await response.json();
      if(!response.ok){setError(body.error?.message??"Không thể cập nhật bảng lương.");return false;}
      setData(body.data);return true;
    }catch{setError("Không thể kết nối. Vui lòng thử lại.");return false;}
    finally{setBusy(false);}
  }
  async function updateLine(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!editing)return;const form=new FormData(event.currentTarget),reason=String(form.get("reason")??"").trim();if(reason.length<3){setError("Lý do điều chỉnh cần ít nhất 3 ký tự.");return;}const saved=await patch({action:"update_line",lineId:editing.id,lineRowVersion:editing.rowVersion,allowance:Number(form.get("allowance")),bonus:Number(form.get("bonus")),deduction:Number(form.get("deduction")),reason});if(saved)setEditing(undefined);}
  async function reopen(){const reason=window.prompt("Lý do mở lại bảng lương để điều chỉnh");if(reason===null)return;if(reason.trim().length<3){setError("Lý do mở lại cần ít nhất 3 ký tự.");return;}await patch({action:"reopen",reason:reason.trim()});}
  if(!data)return <Card>{error?<p className="form-error">{error}</p>:<p>Đang tải…</p>}</Card>;
  const gross=data.lines.reduce((sum,item)=>sum+item.baseSalary+item.allowance+item.bonus,0),deductions=data.lines.reduce((sum,item)=>sum+item.deduction,0),net=data.lines.reduce((sum,item)=>sum+item.netSalary,0),editable=permissions.edit&&!['locked','published'].includes(data.status);
  const columns: DataTableColumn<PayrollLine>[] = [
    { id: "employee", header: "Nhân viên", cell: (item) => <strong>{item.employeeName}</strong> },
    { id: "days", header: "Ngày công", cell: (item) => String(item.workDays) },
    { id: "salary", header: "Lương", cell: (item) => money(item.baseSalary) },
    { id: "allowance", header: "Phụ cấp", cell: (item) => money(item.allowance), hiddenOnMobile: true },
    { id: "bonus", header: "Thưởng", cell: (item) => money(item.bonus), hiddenOnMobile: true },
    { id: "deduction", header: "Khấu trừ", cell: (item) => money(item.deduction), hiddenOnMobile: true },
    { id: "net", header: "Thực nhận", cell: (item) => <strong>{money(item.netSalary)}</strong> }
  ];
  const canImportSalary=permissions.calculate&&["draft","calculated"].includes(data.status);
  return <DetailPageLayout>
    <div className="panel-header"><div><h2>Kỳ {data.periodMonth.slice(0,7)}</h2><StatusBadge status={data.status}>{labels[data.status]}</StatusBadge></div><div className={`form-actions ${styles.actions}`}>
      {permissions.export?<a className={`button button--secondary button--md ${styles.secondaryAction}`} href={`/api/v1/accounting/payroll/${id}/export`}>Xuất Excel</a>:null}
      {canImportSalary?<Link className={`button button--secondary button--md ${styles.secondaryAction}`} href="/accounting/salaries">Nhập lương nhân viên</Link>:null}
      {permissions.calculate&&["draft","calculated"].includes(data.status)?<Button disabled={busy} onClick={()=>void patch({action:"calculate"})} variant="primary">{busy?"Đang xử lý…":data.status==="draft"?"Tính lương từ bảng công":"Tính lại bảng lương"}</Button>:null}
      {permissions.edit&&data.status==="calculated"?<Button disabled={busy} onClick={()=>void patch({action:"review"})}>Xác nhận kiểm tra</Button>:null}
      {permissions.lock&&data.status==="reviewed"?<Button disabled={busy} onClick={()=>void patch({action:"lock"})} variant="primary">Khóa bảng lương</Button>:null}
      {permissions.publish&&data.status==="locked"?<Button disabled={busy} onClick={()=>void patch({action:"publish"})} variant="primary">Tạo và phát hành phiếu lương</Button>:null}
      {permissions.edit&&["locked","published"].includes(data.status)?<Button disabled={busy} onClick={()=>void reopen()} variant="secondary">Mở lại điều chỉnh</Button>:null}
      {permissions.export||canImportSalary?<div className={styles.mobileMore}><DropdownMenu label="Thao tác khác với bảng lương" trigger={<span>Thêm</span>}>{permissions.export?<a href={`/api/v1/accounting/payroll/${id}/export`}>Xuất Excel</a>:null}{canImportSalary?<Link href="/accounting/salaries">Nhập lương nhân viên</Link>:null}</DropdownMenu></div>:null}
    </div></div>
    <section aria-label="Tổng hợp bảng lương" className={styles.summary}>
      <div className={styles.net}><span>Thực nhận</span><strong>{money(net)}</strong></div>
      <dl className={styles.facts}>
        <div><dt>Tổng thu nhập</dt><dd>{money(gross)}</dd></div>
        <div><dt>Khấu trừ</dt><dd>{money(deductions)}</dd></div>
        <div><dt>Nhân viên</dt><dd>{data.lines.length}</dd></div>
      </dl>
    </section>
    <DataSurface className={styles.lines}>
      <DataTable actions={editable?(item)=><DropdownMenu label={`Thao tác lương ${item.employeeName}`}><button onClick={()=>setEditing(item)} type="button">Điều chỉnh</button></DropdownMenu>:undefined} columns={columns} data={data.lines} emptyDescription="" emptyTitle="Chưa có dữ liệu lương" getRowId={(item)=>item.id}/>
      {data.lines.length ? <div aria-label="Lương nhân viên" className={styles.mobileLines}>
        {data.lines.map((item)=><article className={styles.mobileLine} key={item.id}>
          <div className={styles.lineTop}><div><strong>{item.employeeName}</strong></div><div className={styles.lineNet}><small>Thực nhận</small><strong>{money(item.netSalary)}</strong></div></div>
          <dl><div><dt>Ngày công</dt><dd>{item.workDays}</dd></div><div><dt>Lương</dt><dd>{money(item.baseSalary)}</dd></div></dl>
          {editable?<button className={styles.lineEdit} onClick={()=>setEditing(item)} type="button">Điều chỉnh</button>:null}
        </article>)}
      </div>:null}
    </DataSurface>
    <Drawer onClose={()=>setEditing(undefined)} open={Boolean(editing)} title={editing?`Điều chỉnh · ${editing.employeeName}`:"Điều chỉnh lương"}>
      {editing?<form className="drawer-form" key={editing.id} onSubmit={updateLine}><Input defaultValue={editing.allowance} label="Phụ cấp" min="0" name="allowance" required type="number"/><Input defaultValue={editing.bonus} label="Thưởng" min="0" name="bonus" required type="number"/><Input defaultValue={editing.deduction} label="Khấu trừ" min="0" name="deduction" required type="number"/><Input label="Lý do điều chỉnh" name="reason" required/><Button disabled={busy} type="submit" variant="primary">{busy?"Đang lưu…":"Lưu điều chỉnh"}</Button></form>:null}
    </Drawer>
    {error?<p className="form-error">{error}</p>:null}
  </DetailPageLayout>;
}
