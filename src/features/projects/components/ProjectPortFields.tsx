"use client";

import { useState } from "react";
import { Select } from "@/components/shared/FormControls";
import { portSchedulePresets, requiredArrivalTime } from "@/features/timesheets/services/portSchedules";
import { getBusinessDateKey } from "@/lib/time/timezone";
import type { ProjectPortOption } from "../types/projectTypes";

export function ProjectPortFields({schedules=portSchedulePresets.map(item=>({...item,breakStartTime:"11:30",breakEndTime:"13:00"})),date=getBusinessDateKey()}: {schedules?:readonly ProjectPortOption[];date?:string}) {
 const [code,setCode]=useState("");
 const configured=schedules.find(item=>item.code===code);
 const version=configured?.versions?.filter(item=>item.effectiveFrom<=date&&(!item.effectiveTo||item.effectiveTo>=date)).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
 const selected=configured?{...configured,...version}:undefined;
 return <>
  <Select label="Khu vực cảng" name="portShiftCode" required placeholder="Chọn cảng" value={code} onChange={event=>setCode(event.target.value)} options={schedules.map(item=>({value:item.code,label:item.name}))}/>
  {selected ? <dl className="record-fields"><div><dt>Giờ làm</dt><dd>{selected.breakStartTime&&selected.breakEndTime?`${selected.startTime}–${selected.breakStartTime} · ${selected.breakEndTime}–${selected.endTime}`:`${selected.startTime}–${selected.endTime}`}</dd></div><div><dt>Chấm vào trước</dt><dd>{requiredArrivalTime(selected.startTime,10)}</dd></div><div><dt>Đủ ca</dt><dd>1 công · 8 giờ</dd></div></dl> : null}
 </>;
}
