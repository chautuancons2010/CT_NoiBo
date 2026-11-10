"use client";

import { ArrowUpRight, Camera, CheckCheck, Download, HardHat, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { WorkerAttendanceSession } from "../types/workerAttendanceTypes";
import { formatBusinessDate } from "@/lib/time/timezone";
import styles from "./WorkerSessionEvidenceCards.module.css";

const labels: Record<string, string> = { draft: "Nháp", in_progress: "Đang điểm danh", submitted: "Đã gửi", locked: "Đã khóa", needs_review: "Cần rà soát" };
const time = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function WorkerSessionEvidenceCards({ sessions, canViewPhotos, canExport, detailBasePath = "/worker-attendance/sessions" }: { sessions: WorkerAttendanceSession[]; canViewPhotos: boolean; canExport: boolean; detailBasePath?: string }) {
  return <div aria-label="Bộ ảnh theo phiên điểm danh" className={styles.grid}>{sessions.map(session => {
    const selected = session.entries.filter(entry => entry.isSelected !== false && (entry.status === "present" || entry.status === "late"));
    const availablePhotos = session.photos.filter(photo => photo.evidenceStatus !== "expired");
    const href = `${detailBasePath}/${session.id}`;
    return <article className={styles.session} key={session.id}>
      <header><span className={styles.icon}><HardHat aria-hidden="true" size={21} /></span><div><h2><Link href={href}>{session.projectName}</Link></h2><span><MapPin aria-hidden="true" size={13} />{session.worksiteName}</span></div><StatusBadge tone={session.status === "submitted" ? "success" : session.status === "needs_review" ? "warning" : "neutral"}>{labels[session.status]}</StatusBadge></header>
      <div className={styles.meta}><time dateTime={session.startedAt}>{formatBusinessDate(session.date)} · {time(session.startedAt)}</time><span>{session.shiftName}</span></div>
      {canViewPhotos && availablePhotos.length ? <Link aria-label={`Xem ${session.photos.length} ảnh của phiên ${session.projectName}`} className={styles.photos} href={href}>{availablePhotos.slice(0, 3).map((photo, index) => <span key={photo.id}><Image alt={`Ảnh hiện trường ${index + 1}`} height={180} loading="lazy" src={`/api/v1/worker-attendance/photos/${photo.id}?size=thumbnail`} unoptimized width={240} />{index === 2 && availablePhotos.length > 3 ? <b>+{availablePhotos.length - 3}</b> : null}</span>)}</Link> : <div className={styles.noPhoto}><Camera aria-hidden="true" size={21} />{!canViewPhotos ? "Ảnh theo quyền truy cập" : session.photos.length ? "Ảnh đã hết hạn lưu 45 ngày" : "Chưa có ảnh hiện trường"}</div>}
      <div className={styles.crew}><strong><Users aria-hidden="true" size={16} />{selected.length} công nhân</strong><span>{session.photos.length} ảnh · 1 phiên</span></div>
      <div className={styles.names}>{selected.slice(0, 4).map(entry => <span key={entry.id}><CheckCheck aria-hidden="true" size={13} />{entry.workerName}</span>)}{selected.length > 4 ? <Link href={href}>+{selected.length - 4} người</Link> : null}</div>
      <footer><span>Giám sát · {session.supervisorName}</span><div>{canExport ? <a aria-label={`Xuất Excel ${session.projectName}`} className={styles.export} href={`/api/v1/worker-attendance/export?projectId=${session.projectId}&month=${session.date.slice(0, 7)}`}><Download aria-hidden="true" size={17} />Excel</a> : null}<Link href={href}>Xem phiên<ArrowUpRight aria-hidden="true" size={17} /></Link></div></footer>
    </article>;
  })}</div>;
}
