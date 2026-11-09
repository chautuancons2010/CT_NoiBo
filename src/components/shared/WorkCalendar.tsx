"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./WorkCalendar.module.css";

export type CalendarTone = "neutral" | "success" | "warning" | "info" | "danger";
export interface WorkCalendarDay {
  label: string;
  content?: ReactNode;
  tone?: CalendarTone;
  disabled?: boolean;
  current?: boolean;
  indicator?: boolean;
}
export interface WorkCalendarProps {
  label: string;
  weeks: readonly (readonly (string | null)[])[];
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  getDay: (date: string) => WorkCalendarDay;
}

/** Shared calendar geometry and keyboard behavior; features supply real data. */
export function WorkCalendar({ label, weeks, selectedDate, onSelectDate, getDay }: WorkCalendarProps) {
  const cells = weeks.flat();
  const dates = cells.filter((date): date is string => Boolean(date) && !getDay(date!).disabled);
  const [focusedDate, setFocusedDate] = useState<string>();
  const candidate = focusedDate ?? selectedDate;
  const tabDate = candidate && dates.includes(candidate) ? candidate : dates[0];

  function move(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const index = dates.indexOf(date);
    const weekday = cells.indexOf(date) % 7;
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7, Home: -weekday, End: 6 - weekday };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = dates[Math.max(0, Math.min(dates.length - 1, index + offsets[event.key]))];
    setFocusedDate(next);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus();
  }

  return <section aria-label={label} className={styles.calendar} data-ui="work-calendar">
    <div aria-hidden="true" className={styles.weekdays}>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className={styles.grid}>
      {cells.map((date, index) => {
        if (!date) return <span aria-hidden="true" className={styles.blank} key={`blank-${index}`} />;
        const day = getDay(date);
        return <button aria-current={day.current ? "date" : undefined} aria-label={day.label} aria-pressed={date === selectedDate} className={cn(styles.day, date === selectedDate && styles.selected)} data-date={date} data-tone={day.tone ?? "neutral"} disabled={day.disabled} key={date} onClick={() => onSelectDate(date)} onFocus={() => setFocusedDate(date)} onKeyDown={(event) => move(event, date)} tabIndex={date === tabDate ? 0 : -1} type="button">
          <span className={styles.number}>{date.slice(-2)}{date.endsWith("-01") ? <small>/{date.slice(5, 7)}</small> : null}</span>
          {day.content || day.indicator ? <span aria-hidden={day.indicator || undefined} className={cn(styles.value, day.indicator && styles.indicator)}>{day.content}</span> : null}
        </button>;
      })}
    </div>
  </section>;
}
