"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import type { LeaveType } from "@/features/leave/types/leaveTypes";

type Employee={id:string;employeeCode:string;fullName:string;displayName?:string};

export function LeaveAdjustmentForm(){
  const [employees,setEmployees]=useState<Employee[]>([]);const [types,setTypes]=useState<LeaveType[]>([]);const [message,setMessage]=useState("");
  const [form,setForm]=useState({employeeId:"",leaveTypeId:"",year:new Date().getFullYear(),direction:"add",amount:1,reason:"",effectiveDate:new Date().toISOString().slice(0,10)});
  useEffect(()=>{Promise.all([fetch("/api/v1/employees?pageSize=100").then(r=>r.json()),fetch("/api/v1/leave-types").then(r=>r.json())]).then(([a,b])=>{const employeeItems=a.data?.employees?.items??[];const leaveTypes=(b.data??[]).filter((value:LeaveType)=>value.deductsBalance);setEmployees(employeeItems);setTypes(leaveTypes);setForm(value=>({...value,employeeId:employeeItems[0]?.id??"",leaveTypeId:leaveTypes[0]?.id??""}));});},[]);
  const update=(key:string,value:string|number)=>setForm(current=>({...current,[key]:value}));
  async function submit(event:FormEvent){event.preventDefault();setMessage("");const response=await fetch("/api/v1/leave-balances/adjustments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,idempotencyKey:crypto.randomUUID()})});const body=await response.json();setMessage(response.ok?`Số dư mới: ${body.data.officialRemaining}`:body.error?.message);}
  return <Card><form className="leave-form" onSubmit={submit}><div className="form-grid"><label><span>Nhân viên</span><select value={form.employeeId} onChange={e=>update("employeeId",e.target.value)}>{employees.map(value=><option key={value.id} value={value.id}>{value.employeeCode} · {value.displayName??value.fullName}</option>)}</select></label><label><span>Loại nghỉ</span><select value={form.leaveTypeId} onChange={e=>update("leaveTypeId",e.target.value)}>{types.map(value=><option key={value.id} value={value.id}>{value.name}</option>)}</select></label><label><span>Năm</span><input type="number" value={form.year} onChange={e=>update("year",Number(e.target.value))}/></label><label><span>Điều chỉnh</span><select value={form.direction} onChange={e=>update("direction",e.target.value)}><option value="add">Cộng</option><option value="subtract">Trừ</option></select></label><label><span>Số ngày</span><input type="number" min="0.5" step="0.5" value={form.amount} onChange={e=>update("amount",Number(e.target.value))}/></label><label><span>Ngày hiệu lực</span><input type="date" value={form.effectiveDate} onChange={e=>update("effectiveDate",e.target.value)}/></label></div><label><span>Lý do</span><textarea required value={form.reason} onChange={e=>update("reason",e.target.value)}/></label><Button type="submit" variant="primary">Lưu điều chỉnh</Button>{message?<p>{message}</p>:null}</form></Card>;
}
