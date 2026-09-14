"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/shared/Card";
import { StatusBadge, type StatusBadgeTone } from "@/components/shared/StatusBadge";
import type { LeaveRequest } from "@/features/leave/types/leaveTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

const status:Record<string,{label:string;tone:StatusBadgeTone}>={draft:{label:"Nháp",tone:"neutral"},submitted:{label:"Đã gửi",tone:"warning"},pending_approval:{label:"Chờ duyệt",tone:"warning"},approved:{label:"Đã duyệt",tone:"success"},rejected:{label:"Từ chối",tone:"error"},withdrawn:{label:"Đã thu hồi",tone:"neutral"},cancelled:{label:"Đã hủy",tone:"neutral"}};
export function LeaveRequestList({scope="self"}:{scope?:"self"|"all"|"approval"}){
  const [items,setItems]=useState<LeaveRequest[]>([]);const [loading,setLoading]=useState(true);const [filter,setFilter]=useState("all");const [error,setError]=useState("");
  const load=useCallback(()=>fetch(`/api/v1/leave-requests?scope=${scope}`).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error?.message);setItems(body.data);setError("");}).catch(value=>setError(value.message)).finally(()=>setLoading(false)),[scope]);
  useEffect(()=>{void load();},[load]);useDomainReconciliation("leave",load);
  const shown=useMemo(()=>filter==="all"?items:items.filter(item=>item.status===filter),[items,filter]);
  if(loading)return <Card>Đang tải…</Card>;if(error)return <Card><p className="form-error">{error}</p></Card>;
  return <Card className="leave-list-card"><div className="leave-toolbar"><select aria-label="Trạng thái" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(status).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select>{scope==="self"?<Link className="button button--primary button--md" href="/leave/new">Tạo đơn nghỉ</Link>:null}</div><div className="data-table-scroll"><table className="data-table"><thead><tr>{scope!=="self"?<th>Nhân viên</th>:null}<th>Mã đơn</th><th>Loại nghỉ</th><th>Thời gian</th><th>Số ngày</th><th>Trạng thái</th><th></th></tr></thead><tbody>{shown.map(item=><tr key={item.id}>{scope!=="self"?<td><strong>{item.employeeName}</strong><br/><small>{item.employeeCode}</small></td>:null}<td>{item.requestNumber}</td><td>{item.leaveTypeName}</td><td>{item.startDate} – {item.endDate}</td><td>{item.calculatedDays}</td><td><StatusBadge tone={status[item.status]?.tone}>{status[item.status]?.label??item.status}</StatusBadge></td><td><Link href={`/leave/requests/${item.id}`}>Mở</Link></td></tr>)}{!shown.length?<tr><td colSpan={scope==="self"?6:7}>Không có đơn nghỉ.</td></tr>:null}</tbody></table></div></Card>;
}
