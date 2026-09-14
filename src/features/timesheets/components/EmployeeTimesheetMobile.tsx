"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, TriangleAlert } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import type { DailyTimesheet, TimesheetPeriod, TimesheetSummary } from "../types/timesheetTypes";

const label: Record<string,string> = { full_work:"Đủ công",late:"Đi trễ",early_leave:"Về sớm",missing_check_in:"Thiếu chấm vào",missing_check_out:"Thiếu chấm ra",annual_leave:"Nghỉ phép",unpaid_leave:"Nghỉ không lương",absent:"Vắng",business_trip:"Công tác",holiday:"Ngày lễ",rest_day:"Ngày nghỉ",worker_site:"Công trường",needs_review:"Cần rà soát" };
const time = (value?: string) => value ? new Date(value).toLocaleTimeString("vi-VN", { hour:"2-digit", minute:"2-digit" }) : "—";

export function EmployeeTimesheetMobile({ periodId, employeeId }:{ periodId:string; employeeId:string }) {
  const [period,setPeriod]=useState<TimesheetPeriod>();
  const [daily,setDaily]=useState<DailyTimesheet[]>([]);
  const [summary,setSummary]=useState<TimesheetSummary>();
  const [error,setError]=useState("");
  const load=useCallback(()=>fetch(`/api/v1/timesheet-periods/${periodId}`).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error?.message);setPeriod(body.data.period);setDaily(body.data.daily.filter((item:DailyTimesheet)=>item.employeeId===employeeId));setSummary(body.data.summaries.find((item:TimesheetSummary)=>item.employeeId===employeeId));}).catch(value=>setError(value.message)),[periodId,employeeId]);
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
  useDomainReconciliation("timesheets",load);
  const grouped=useMemo(()=>[...daily].sort((a,b)=>b.workDate.localeCompare(a.workDate)),[daily]);
  if(error)return <Card><p className="form-error">{error}</p></Card>;
  if(!period)return <Card>Đang tải…</Card>;
  return <div className="employee-timesheet"><Card className="employee-timesheet__summary"><div><strong>{period.name}</strong><span>{period.startDate} – {period.endDate}</span></div>{summary?<div className="employee-timesheet__stats"><span><b>{summary.actualWorkdays}</b>Ngày công</span><span><b>{summary.lateDays}</b>Ngày trễ</span><span><b>{summary.annualLeaveDays}</b>Phép năm</span><span><b>{summary.exceptionCount}</b>Ngoại lệ</span></div>:null}</Card><div className="employee-timesheet__days">{grouped.map(item=><Card key={item.id} className="employee-timesheet__day"><div className="employee-timesheet__date"><strong>{new Date(`${item.workDate}T00:00:00`).toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit"})}</strong><TimesheetStatus item={item}/></div><div className="employee-timesheet__time"><Clock3 size={17}/><b>{time(item.effectiveCheckIn)} → {time(item.effectiveCheckOut)}</b><span>{item.shiftName||"—"}</span></div>{item.lateMinutes>0?<span>Đi trễ {item.lateMinutes} phút</span>:null}{item.earlyLeaveMinutes>0?<span>Về sớm {item.earlyLeaveMinutes} phút</span>:null}{item.exceptionCount>0?<a href={`/timesheets/exceptions?periodId=${periodId}`}><TriangleAlert size={16}/>Ngoại lệ: {item.exceptionCount}</a>:null}</Card>)}{!grouped.length?<Card>Chưa có dữ liệu công.</Card>:null}</div></div>;
}

function TimesheetStatus({item}:{item:DailyTimesheet}){return <StatusBadge tone={item.exceptionCount?"warning":item.status==="full_work"||item.status==="holiday"?"success":"neutral"}>{label[item.status]??item.status}</StatusBadge>;}
