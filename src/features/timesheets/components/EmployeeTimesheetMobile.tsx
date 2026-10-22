"use client";

import Link from "next/link";
import { CalendarDays, Clock3, TriangleAlert, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import type { DailyTimesheet, TimesheetPeriod, TimesheetSummary } from "../types/timesheetTypes";
import styles from "./EmployeeTimesheetMobile.module.css";

const label: Record<string, string> = {
  full_work: "Đủ công", late: "Đi trễ", early_leave: "Về sớm", missing_check_in: "Thiếu chấm vào",
  missing_check_out: "Thiếu chấm ra", annual_leave: "Nghỉ phép", unpaid_leave: "Nghỉ không lương",
  absent: "Vắng", business_trip: "Công tác", holiday: "Ngày lễ", rest_day: "Ngày nghỉ",
  worker_site: "Công trường", needs_review: "Cần rà soát"
};
const time = (value?: string) => value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";

export function EmployeeTimesheetMobile({ periodId, employeeId, selectedDate }: { periodId: string; employeeId: string; selectedDate?: string }) {
  const [period, setPeriod] = useState<TimesheetPeriod>();
  const [daily, setDaily] = useState<DailyTimesheet[]>([]);
  const [summary, setSummary] = useState<TimesheetSummary>();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(selectedDate ?? "");
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/timesheet-periods/${periodId}`, { cache: "no-store" });
      const body = await response.json() as { data?: { period: TimesheetPeriod; daily: DailyTimesheet[]; summaries: TimesheetSummary[] }; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải công nhân viên.");
      setPeriod(body.data.period);
      setDaily(body.data.daily.filter((item) => item.employeeId === employeeId));
      setSummary(body.data.summaries.find((item) => item.employeeId === employeeId));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải công nhân viên.");
    }
  }, [periodId, employeeId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useDomainReconciliation("timesheets", load);
  const calendar = useMemo(() => {
    if (!period) return { dates: [] as Array<string | null>, days: [] as Array<Array<string | null>> };
    const dates: Array<string | null> = [];
    const cursor = new Date(`${period.startDate}T00:00:00`);
    const end = new Date(`${period.endDate}T00:00:00`);
    const offset = (cursor.getDay() + 6) % 7;
    for (let index = 0; index < offset; index += 1) dates.push(null);
    while (cursor <= end) {
      dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    while (dates.length % 7) dates.push(null);
    return { dates, days: Array.from({ length: dates.length / 7 }, (_, index) => dates.slice(index * 7, index * 7 + 7)) };
  }, [period]);
  const activeDate = calendar.dates.includes(selected) ? selected : calendar.dates.find((date): date is string => Boolean(date)) || "";
  const activeRecord = daily.find((item) => item.workDate === activeDate);
  const dayLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  if (error) return <Card><p className="form-error" role="alert">{error}</p></Card>;
  if (!period) return <Card>Đang tải…</Card>;
  return <div className={styles.workspace}>
    <Card className={styles.summary}>
      <div className={styles.identity}>
        <div>
          <span className={styles.eyebrow}><UserRound aria-hidden="true" size={15} /> Nhân viên</span>
          <h2>{summary?.employeeName ?? daily[0]?.employeeName ?? "Nhân viên"}</h2>
          <span>{summary?.employeeCode ?? daily[0]?.employeeCode ?? "—"} · {summary?.departmentName ?? daily[0]?.departmentName ?? "—"}</span>
        </div>
        <div className={styles.period}><CalendarDays aria-hidden="true" size={18} /><span><strong>{period.name}</strong><small>{period.startDate} – {period.endDate}</small></span></div>
      </div>
      {summary ? <dl className={styles.metrics}>
        <div><dt>Ngày công</dt><dd>{summary.actualWorkdays}</dd></div>
        <div><dt>Ngày trễ</dt><dd>{summary.lateDays}</dd></div>
        <div><dt>Phép năm</dt><dd>{summary.annualLeaveDays}</dd></div>
        <div><dt>Ngoại lệ</dt><dd>{summary.exceptionCount}</dd></div>
      </dl> : null}
    </Card>
    <Card className={styles.calendar}>
      <header className={styles.calendarHeading}>
        <h2>Lịch chấm công</h2>
        <span>{calendar.dates.filter(Boolean).length} ngày</span>
      </header>
      <div className={styles.weekdays} aria-hidden="true">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className={styles.calendarGrid} role="group" aria-label="Lịch chấm công">
        {calendar.days.flatMap((week, row) => week.map((date, column) => {
          if (!date) return <span aria-hidden="true" key={`blank-${row}-${column}`} />;
          const item = daily.find((entry) => entry.workDate === date);
          const daySymbol: Record<string, string> = { full_work: "X", worker_site: "X", late: "T", early_leave: "S", missing_check_in: "!", missing_check_out: "!", needs_review: "!", annual_leave: "P", business_trip: "CT", holiday: "L", absent: "V", unpaid_leave: "KL", rest_day: "N" };
          return <button aria-label={`${dayLabel(date)}: ${item ? label[item.status] ?? item.status : "Chưa có dữ liệu"}`} aria-pressed={activeDate === date} className={`${styles.day} ${item ? styles[item.status] : styles.empty}`} key={date} onClick={() => setSelected(date)} type="button">
            <span className={styles.dayNumber}>{date.slice(-2)}</span><span className={styles.daySymbol}>{item ? daySymbol[item.status] ?? "•" : "—"}</span>
          </button>;
        }))}
      </div>
      <div className={styles.legend}><span><b> X </b>Đủ công</span><span><b> P </b>Nghỉ phép</span><span><b> ! </b>Cần xử lý</span><span><b> — </b>Chưa có dữ liệu</span></div>
      {activeDate ? <section className={styles.dayDetail} aria-live="polite">
        <header className={styles.dayHeading}><div><h3>{dayLabel(activeDate)}</h3></div>{activeRecord ? <TimesheetStatus item={activeRecord} /> : null}</header>
        {activeRecord ? <dl className={styles.facts}>
          <div><dt>Ca làm</dt><dd>{activeRecord.shiftName || "—"}</dd></div>
          <div><dt>Giờ chấm</dt><dd>{time(activeRecord.effectiveCheckIn)} → {time(activeRecord.effectiveCheckOut)}</dd></div>
          {activeRecord.lateMinutes > 0 ? <div><dt>Đi trễ</dt><dd>{activeRecord.lateMinutes} phút</dd></div> : null}
          {activeRecord.earlyLeaveMinutes > 0 ? <div><dt>Về sớm</dt><dd>{activeRecord.earlyLeaveMinutes} phút</dd></div> : null}
          {activeRecord.exceptionCount > 0 ? <div><dt>Ngoại lệ</dt><dd><Link href={`/timesheets/exceptions?periodId=${periodId}`}>{activeRecord.exceptionCount} · Xem</Link></dd></div> : null}
        </dl> : <p>Chưa có dữ liệu công cho ngày này.</p>}
      </section> : null}
    </Card>
  </div>;
}

function TimesheetStatus({ item }: { item: DailyTimesheet }) {
  return <StatusBadge tone={item.exceptionCount ? "warning" : item.status === "full_work" || item.status === "holiday" ? "success" : "neutral"}>{label[item.status] ?? item.status}</StatusBadge>;
}
