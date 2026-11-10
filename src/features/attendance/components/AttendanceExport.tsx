"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/FormControls";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { can } from "@/lib/auth/permissions";
import styles from "./AttendanceExport.module.css";

export function AttendanceExport({month,onMonthChange}:{month:string;onMonthChange:(month:string)=>void}) {
  const user=useCurrentUser();
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const allowed=can(user.permissions,"timesheet.export")&&can(user.permissions,"worker_attendance.view_all")&&(["attendance.view_all","attendance.manage","attendance.log.view"] as const).some(key=>can(user.permissions,key));
  async function download(){
    if(busy||!month)return;
    setBusy(true);setError("");
    try {
      const response=await fetch(`/api/v1/attendance/admin/export?month=${encodeURIComponent(month)}`,{cache:"no-store"});
      if(!response.ok){const body=await response.json();throw new Error(body.error?.message??"Không thể xuất bảng công.");}
      const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download=`Bang_cong_nhan_su_${month}.xlsx`;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(caught){setError(caught instanceof Error?caught.message:"Không thể xuất bảng công.");}
    finally{setBusy(false);}
  }
  return <div className={styles.export}><Input aria-label="Tháng xuất bảng công" disabled={busy} label="Tháng báo cáo" max="2199-12" min="2000-01" onChange={event=>{if(event.target.value)onMonthChange(event.target.value);}} type="month" value={month}/>{allowed?<Button busy={busy} disabled={!month} leftIcon={<Download aria-hidden="true" size={17}/>} onClick={()=>void download()} variant="secondary">Xuất bảng công</Button>:null}{error?<span className={styles.error} role="alert">{error}</span>:null}</div>;
}
