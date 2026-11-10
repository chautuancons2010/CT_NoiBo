"use client";

import { ArrowUpRight, Camera, HardHat, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { WorkerAttendanceSession } from "../types/workerAttendanceTypes";
import styles from "./WorkerSessionEvidenceCards.module.css";

const labels: Record<string, string> = { draft: "Nháp", in_progress: "Đang điểm danh", submitted: "Đã gửi", locked: "Đã khóa", needs_review: "Cần rà soát" };
const time = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function WorkerSessionEvidenceCards({ sessions, canViewPhotos, detailBasePath = "/worker-attendance/sessions" }: { sessions: WorkerAttendanceSession[]; canViewPhotos: boolean; detailBasePath?: string }) {
  const groups = new Map<string, WorkerAttendanceSession[]>();
  for (const session of sessions) {
    const key = `${session.date}:${session.projectId}:${session.worksiteId}:${session.shiftCode}`;
    groups.set(key, [...(groups.get(key) ?? []), session]);
  }
  return <div aria-label="Công trường trong ngày" className={styles.grid}>{[...groups].map(([key, rounds]) => {
    rounds.sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
    const first = rounds[0];
    const confirmed = rounds.filter(round => round.submittedAt || ["submitted", "locked"].includes(round.status));
    const workers = new Set(confirmed.flatMap(round => round.entries.filter(entry => entry.isSelected !== false && ["present", "late"].includes(entry.status)).map(entry => entry.workerId)));
    return <article className={styles.session} key={key}>
      <header><span className={styles.icon}><HardHat aria-hidden="true" size={21} /></span><div><h2>{first.projectName}</h2><span><MapPin aria-hidden="true" size={13} />{first.worksiteName}</span></div></header>
      <div className={styles.meta}><span>{first.shiftName}</span><span>{rounds.length} lượt · {rounds.reduce((total, round) => total + round.photos.length, 0)} ảnh</span></div>
      <div className={styles.crew}><strong><Users aria-hidden="true" size={16} />{workers.size} công nhân</strong><span>{confirmed.length}/{rounds.length} lượt đã gửi</span></div>
      <div className={styles.rounds}>{rounds.map((round, index) => {
        const selected = round.entries.filter(entry => entry.isSelected !== false && ["present", "late"].includes(entry.status));
        const photos = round.photos.filter(photo => photo.evidenceStatus !== "expired");
        const href = `${detailBasePath}/${round.id}`;
        return <details className={styles.round} key={round.id} open={rounds.length === 1 ? true : undefined}>
          <summary><strong>Lượt {index + 1} · <time dateTime={round.startedAt}>{time(round.startedAt)}</time></strong><StatusBadge tone={round.status === "needs_review" ? "warning" : round.submittedAt ? "success" : "neutral"}>{labels[round.status]}</StatusBadge><span>{selected.length} người · {round.photos.length} ảnh</span></summary>
          <div className={styles.roundContent}><span className={styles.supervisor}>Giám sát · {round.supervisorName}</span>
          {canViewPhotos && photos.length ? <Link aria-label={`Xem ảnh lượt ${index + 1} · ${round.projectName}`} className={styles.photos} href={href}>{photos.slice(0, 3).map((photo, photoIndex) => <span key={photo.id}><Image alt={`Ảnh hiện trường lượt ${index + 1}, ảnh ${photoIndex + 1}`} height={180} loading="lazy" src={`/api/v1/worker-attendance/photos/${photo.id}?size=thumbnail`} unoptimized width={240} />{photoIndex === 2 && photos.length > 3 ? <b>+{photos.length - 3}</b> : null}</span>)}</Link> : <div className={styles.noPhoto}><Camera aria-hidden="true" size={20} />{!canViewPhotos ? "Ảnh theo quyền truy cập" : round.photos.length ? "Ảnh đã hết hạn lưu" : "Chưa có ảnh hiện trường"}</div>}
          <div className={styles.names}>{selected.map(entry => <span key={entry.id}>{entry.workerName}</span>)}</div>
          <Link className={styles.roundLink} href={href}>Xem lượt điểm danh<ArrowUpRight aria-hidden="true" size={17} /></Link></div>
        </details>;
      })}</div>
    </article>;
  })}</div>;
}
