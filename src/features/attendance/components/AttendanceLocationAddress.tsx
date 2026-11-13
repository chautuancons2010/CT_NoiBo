"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { lookupAttendanceAddress } from "@/features/attendance/client/attendanceAddressClient";
import { coordinateLabel, validAddressCoordinates } from "@/features/attendance/services/attendanceAddressRules";
import type { AttendanceAddressResult } from "@/features/attendance/types/attendanceAddressTypes";
import styles from "./AttendanceLocationAddress.module.css";

export interface AttendanceLocationAddressProps {
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  referenceName?: string;
  /** Only pass a worksite address after a server-side check that GPS is inside its configured radius. */
  knownAddress?: string;
  className?: string;
  emptyLabel?: string;
  compact?: boolean;
}

export function AttendanceLocationAddress({ latitude, longitude, accuracyMeters, referenceName, knownAddress, className, emptyLabel = "Chưa có GPS", compact = false }: AttendanceLocationAddressProps) {
  const root = useRef<HTMLSpanElement>(null);
  const [lookup, setLookup] = useState<{ key: string; result: AttendanceAddressResult }>();
  const hasCoordinates = validAddressCoordinates({ latitude, longitude });
  const key = hasCoordinates ? coordinateLabel({ latitude: latitude!, longitude: longitude! }) : "";
  const result = lookup?.key === key ? lookup.result : undefined;

  useEffect(() => {
    if (!hasCoordinates || accuracyMeters !== undefined && accuracyMeters > 100) return;
    let active = true;
    let started = false;
    const start = () => {
      if (started || !active) return;
      started = true;
      void lookupAttendanceAddress({ latitude: latitude!, longitude: longitude! }).then((value) => {
        if (active) setLookup({ key, result: value });
      });
    };
    // An admin list only resolves locations that are visible; no background scan of staff GPS.
    const observer = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { start(); observer?.disconnect(); }
    }, { rootMargin: "80px" });
    if (observer && root.current) observer.observe(root.current); else start();
    return () => { active = false; observer?.disconnect(); };
  }, [hasCoordinates, latitude, longitude, accuracyMeters, key]);

  if (!hasCoordinates) return <span className={`${styles.root} ${className ?? ""}`}><span className={styles.map}><MapPin aria-hidden="true" size={15} /><span>{emptyLabel}</span></span></span>;
  const coarse = typeof accuracyMeters === "number" && accuracyMeters > 100;
  const address = !coarse && result?.status === "resolved" ? result.address : undefined;
  const label = coarse ? "Vị trí ước lượng" : address || "Vị trí GPS";
  const accuracy = typeof accuracyMeters === "number" && Number.isFinite(accuracyMeters) && accuracyMeters >= 0 ? `GPS ±${Math.round(accuracyMeters)} m` : "GPS";
  const source = `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}`;

  return <span className={`${styles.root} ${compact ? styles.compact : ""} ${className ?? ""}`} ref={root}>
    <a aria-label={`Vị trí chấm công · ${label} · ${accuracy} · mở bản đồ`} className={styles.map} href={`https://www.google.com/maps?q=${latitude},${longitude}`} rel="noopener noreferrer" target="_blank" title={`${coordinateLabel({ latitude: latitude!, longitude: longitude! })} · ${accuracy}`}>
      <MapPin aria-hidden="true" size={15} /><span className={styles.content}><span className={styles.address}>{label}</span><span className={styles.metadata}>{[source, accuracy].filter(Boolean).join(" · ")}</span></span>
    </a>
    {knownAddress?.trim() ? <span className={styles.reference}>Công trường · {referenceName ? `${referenceName} · ` : ""}{knownAddress}</span> : null}
    {address && result?.attribution ? <a className={styles.attribution} href={result.attributionUrl || "https://www.openstreetmap.org/copyright"} rel="noopener noreferrer" target="_blank">{result.attribution}</a> : null}
  </span>;
}
