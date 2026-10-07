"use client";

import { Select } from "@/components/shared/FormControls";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import type { LeaveType } from "@/features/leave/types/leaveTypes";
import { getBusinessDateKey } from "@/lib/time/timezone";

type Employee={id:string;employeeCode:string;fullName:string;displayName?:string};

export function LeaveAdjustmentForm(){
  const [employees,setEmployees]=useState<Employee[]>([]);const [types,setTypes]=useState<LeaveType[]>([]);const [message,setMessage]=useState("");
  const [form,setForm]=useState(()=>{const today=getBusinessDateKey();return{employeeId:"",leaveTypeId:"",year:Number(today.slice(0,4)),direction:"add",amount:1,reason:"",effectiveDate:today};});
  useEffect(()=>{Promise.all([fetch("/api/v1/employees?pageSize=100").then(r=>r.json()),fetch("/api/v1/leave-types").then(r=>r.json())]).then(([a,b])=>{const employeeItems=a.data?.employees?.items??[];const leaveTypes=(b.data??[]).filter((value:LeaveType)=>value.deductsBalance);setEmployees(employeeItems);setTypes(leaveTypes);setForm(value=>({...value,employeeId:employeeItems[0]?.id??"",leaveTypeId:leaveTypes[0]?.id??""}));});},[]);
  const update=(key:string,value:string|number)=>setForm(current=>({...current,[key]:value}));
  async function submit(event:FormEvent){event.preventDefault();setMessage("");const response=await fetch("/api/v1/leave-balances/adjustments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,idempotencyKey:crypto.randomUUID()})});const body=await response.json();setMessage(response.ok?`Số dư mới: ${body.data.officialRemaining}`:body.error?.message);}
  return <Card><form className="leave-form" onSubmit={submit}><div className="form-grid"><Select label={"Nhân viên"} value={form.employeeId} onChange={e=>update("employeeId",e.target.value)} options={[...(employees.map(value => ({ label: value.displayName ?? value.fullName, value: value.id })))]} /><Select label={"Loại nghỉ"} value={form.leaveTypeId} onChange={e=>update("leaveTypeId",e.target.value)} options={[...(types.map(value => ({ label: value.name, value: value.id })))]} /><label><span>Năm</span><input type="number" value={form.year} onChange={e=>update("year",Number(e.target.value))}/></label><Select label={"Điều chỉnh"} value={form.direction} onChange={e=>update("direction",e.target.value)} options={[{ label: "Cộng", value: "add" }, { label: "Trừ", value: "subtract" }]} /><label><span>Số ngày</span><input type="number" min="0.5" step="0.5" value={form.amount} onChange={e=>update("amount",Number(e.target.value))}/></label><label><span>Ngày hiệu lực</span><input type="date" value={form.effectiveDate} onChange={e=>update("effectiveDate",e.target.value)}/></label></div><label><span>Lý do</span><textarea required value={form.reason} onChange={e=>update("reason",e.target.value)}/></label><Button type="submit" variant="primary">Lưu điều chỉnh</Button>{message?<p>{message}</p>:null}</form></Card>;
}
