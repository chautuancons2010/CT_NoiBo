"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Input, Select } from "@/components/shared/FormControls";
import type { Shift } from "../types/timesheetTypes";
import { getBusinessDateKey } from "@/lib/time/timezone";
export function ShiftAssignmentForm({ shifts, projects, onAssigned }: { shifts: Shift[]; projects: {id:string;name:string}[]; onAssigned?:()=>void }) {
  const [message,setMessage]=useState(""); const [saving,setSaving]=useState(false);
  const [weekdays,setWeekdays]=useState([1,2,3,4,5,6]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(saving)return; const form=new FormData(event.currentTarget);setSaving(true);setMessage("");
    try { const response=await fetch("/api/v1/shifts/assignments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({shiftId:form.get("shiftId"),scopeType:"project",scopeId:form.get("projectId"),effectiveFrom:form.get("effectiveFrom"),effectiveTo:form.get("effectiveTo")||undefined,weekdays})});const body=await response.json();if(!response.ok)throw new Error(body.error?.message??"Không thể gán ca.");onAssigned?.(); }
    catch(error){setMessage(error instanceof Error?error.message:"Không thể gán ca.");}finally{setSaving(false);}
  }
  return <form className="form-grid" onSubmit={submit}>
    <Select label="Gói công trường" name="projectId" placeholder="Chọn gói" options={projects.map(p=>({value:p.id,label:p.name}))} required/>
    <Select label="Ca làm" name="shiftId" options={shifts.filter(s=>s.active).map(s=>({value:s.id,label:`${s.name} · ${s.startTime} – ${s.endTime}`}))} required/>
    <Input label="Hiệu lực từ" defaultValue={getBusinessDateKey()} name="effectiveFrom" required type="date"/>
    <Input label="Hiệu lực đến" name="effectiveTo" type="date"/>
    <fieldset className="form-field--full"><legend>Ngày làm việc</legend><div className="form-actions">{[1,2,3,4,5,6,0].map(day=><label className="choice-field" key={day}><input type="checkbox" checked={weekdays.includes(day)} onChange={event=>setWeekdays(values=>event.target.checked?[...values,day]:values.filter(value=>value!==day))}/>{day===0?"CN":`T${day+1}`}</label>)}</div></fieldset>
    {message?<p className="form-error" role="alert">{message}</p>:null}<div className="form-actions"><Button disabled={!projects.length||!weekdays.length} busy={saving} type="submit" variant="primary">Gán ca theo gói</Button></div>
  </form>;
}
