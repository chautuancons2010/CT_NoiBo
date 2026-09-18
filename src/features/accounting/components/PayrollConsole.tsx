"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Input, Select } from "@/components/shared/FormControls";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBusinessDate } from "@/lib/time/timezone";
import type { PayrollPeriod } from "../types";

type TimesheetReference = { id:string;code:string;name:string;startDate:string;endDate:string };
const money=(value:number)=>new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(value);
const month=(value:string)=>{const[year,monthValue]=value.slice(0,7).split("-");return `${monthValue}/${year}`;};
const labels={draft:"Nháp",calculated:"Đã tính",reviewed:"Đã kiểm tra",locked:"Đã khóa",published:"Đã phát hành"};
const payrollColumns:DataTableColumn<PayrollPeriod>[]=[
  {id:"month",header:"Tháng",cell:item=><Link className="text-link" href={`/accounting/payroll/${item.id}`}>{month(item.periodMonth)}</Link>},
  {id:"status",header:"Trạng thái",cell:item=><StatusBadge tone={item.status==="published"||item.status==="locked"?"success":item.status==="draft"?"neutral":"info"}>{labels[item.status]}</StatusBadge>},
  {id:"people",header:"Nhân viên",accessor:"lineCount",align:"right"},
  {id:"gross",header:"Tổng thu nhập",cell:item=>money(item.grossTotal),align:"right"},
  {id:"deduction",header:"Khấu trừ",cell:item=>money(item.deductionTotal),align:"right"},
  {id:"net",header:"Thực nhận",cell:item=><strong>{money(item.netTotal)}</strong>,align:"right"}
];

export function PayrollConsole({canCreate}:{canCreate:boolean}){
  const[items,setItems]=useState<PayrollPeriod[]>([]),[references,setReferences]=useState<TimesheetReference[]>([]),[error,setError]=useState("");
  const load=useCallback(async()=>{const response=await fetch("/api/v1/accounting/payroll",{cache:"no-store"}),body=await response.json();if(!response.ok)throw new Error(body.error?.message);setItems(body.data);},[]);
  useEffect(()=>{queueMicrotask(()=>void load().catch(reason=>setError(reason.message)));if(canCreate)queueMicrotask(()=>void fetch("/api/v1/accounting/payroll/references",{cache:"no-store"}).then(response=>response.json()).then(body=>setReferences(body.data??[])));},[canCreate,load]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget),response=await fetch("/api/v1/accounting/payroll",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({periodMonth:form.get("periodMonth"),timesheetPeriodId:form.get("timesheetPeriodId"),note:form.get("note")||undefined})}),body=await response.json();if(!response.ok){setError(body.error?.message);return;}event.currentTarget.reset();await load();}
  return <ListPageLayout>
    {canCreate?<Card><form className="inline-form" onSubmit={submit}><Input label="Tháng lương" name="periodMonth" required type="month"/><Select label="Kỳ công đã khóa" name="timesheetPeriodId" options={references.map(item=>({value:item.id,label:`${item.code} · ${formatBusinessDate(item.startDate)} → ${formatBusinessDate(item.endDate)}`}))} placeholder="Chọn kỳ công" required/><Input label="Ghi chú" name="note"/><Button type="submit" variant="primary">Tạo kỳ lương</Button></form></Card>:null}
    <DataSurface><DataTable columns={payrollColumns} data={items} emptyDescription="" emptyTitle="Chưa có kỳ lương" error={error} getRowId={item=>item.id} rowHrefPrefix="/accounting/payroll/" /></DataSurface>
  </ListPageLayout>;
}
