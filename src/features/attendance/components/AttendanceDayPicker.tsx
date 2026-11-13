"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, IconButton } from "@/components/shared/Button";
import { Input } from "@/components/shared/FormControls";
import { getBusinessDateKey } from "@/lib/time/timezone";
import styles from "./AttendanceDayPicker.module.css";

export function AttendanceDayPicker({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  function step(delta: number) {
    const day = new Date(`${date}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + delta);
    onChange(day.toISOString().slice(0, 10));
  }
  return <div className={styles.picker}><div className={styles.days}><IconButton label="Ngày trước" onClick={() => step(-1)}><ChevronLeft aria-hidden="true" size={17}/></IconButton><Input label="Ngày" labelHidden type="date" value={date} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) onChange(event.target.value); }}/><IconButton label="Ngày sau" onClick={() => step(1)}><ChevronRight aria-hidden="true" size={17}/></IconButton></div>{date !== getBusinessDateKey() ? <Button variant="ghost" onClick={() => onChange(getBusinessDateKey())}>Hôm nay</Button> : null}</div>;
}
