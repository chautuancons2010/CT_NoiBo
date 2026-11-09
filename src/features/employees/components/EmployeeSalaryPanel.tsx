import { ArrowRight, ChevronDown, LockKeyhole, UserRound } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { RecordFields } from "@/components/shared/PageLayouts";
import { EmptyState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { SalaryRecord } from "@/features/accounting/types";
import { formatBusinessDate, formatBusinessDateTime } from "@/lib/time/timezone";
import styles from "./EmployeeDetailWorkspace.module.css";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const money = (value: number) => currency.format(value);
const parts = [{ key: "allowance", label: "Phụ cấp" }, { key: "bonus", label: "Thưởng" }, { key: "deduction", label: "Khấu trừ" }] as const;

export function EmployeeSalaryPanel({ history, canViewHistory }: { history: SalaryRecord[]; canViewHistory: boolean }) {
  if (!history.length) return <EmptyState title="Chưa có hồ sơ lương" />;
  const current = history[0];
  return <div className={styles.salaryLayout} data-has-history={canViewHistory} data-ui="employee-salary">
    <Card className={styles.salaryOverview}>
      <div className={styles.panelHeading}><h2>Hồ sơ lương</h2><StatusBadge><LockKeyhole aria-hidden="true" size={13} />Nhạy cảm</StatusBadge></div>
      <div className={styles.salaryMain}>
        <dl className={styles.salaryBase}><div><dt>Lương cơ bản</dt><dd>{money(current.baseSalary)}</dd></div></dl>
        <div className={styles.salaryDate}><span>Ngày áp dụng</span><time dateTime={current.effectiveDate}>{formatBusinessDate(current.effectiveDate)}</time></div>
      </div>
      <dl className={styles.salaryParts}>{parts.map(part => <div key={part.key}><dt>{part.label}</dt><dd>{money(current[part.key])}</dd></div>)}</dl>
      {current.note ? <section className={styles.salaryNote}><h3>Ghi chú</h3><p>{current.note}</p></section> : null}
    </Card>
    {canViewHistory ? <aside aria-label="Lịch sử lương">
      <Card className={styles.salaryHistory}>
        <div className={styles.panelHeading}><h2>Lịch sử lương</h2><span className={styles.count}>{history.length} mốc</span></div>
        <ol className={styles.historyList}>{history.map((entry,index) => {
          const previous = history[index + 1];
          const baseChanged = previous && previous.baseSalary !== entry.baseSalary;
          const changedParts = previous ? parts.filter(part => entry[part.key] !== previous[part.key]) : [];
          return <li className={styles.historyEntry} data-latest={index === 0 || undefined} key={entry.id}>
            <span aria-hidden="true" className={styles.historyMarker} />
            <article className={styles.historyContent}>
              <div className={styles.historyMeta}><span>Áp dụng <time dateTime={entry.effectiveDate}>{formatBusinessDate(entry.effectiveDate)}</time></span>{index === 0 ? <StatusBadge tone="info">Mới nhất</StatusBadge> : null}</div>
              <h3 className={styles.historyAmount}>{baseChanged ? <><span className="sr-only">Trước: </span><span className={styles.previousAmount}>{money(previous.baseSalary)}</span><ArrowRight aria-hidden="true" size={14} /><span className="sr-only">Sau: </span></> : null}<strong>{money(entry.baseSalary)}</strong></h3>
              {changedParts.length ? <div aria-label="Thành phần thay đổi" className={styles.changedParts} role="list">{changedParts.map(part => <span key={part.key} role="listitem">{part.label}</span>)}</div> : null}
              {entry.reason ? <p className={styles.historyReason}>{entry.reason}</p> : null}
              <div className={styles.historyActor}><UserRound aria-hidden="true" size={13} /><span>{entry.changedByName ? `Bởi ${entry.changedByName}` : "Chưa có thông tin người thực hiện"}</span></div>
              <details className={styles.historyDetails}><summary>Chi tiết mức lương<ChevronDown aria-hidden="true" size={14} /></summary><div><RecordFields items={[...parts.map(part => ({ label: part.label, value: money(entry[part.key]) })), { label: "Cập nhật lúc", value: formatBusinessDateTime(entry.changedAt) }]} />{entry.note ? <p className={styles.historyReason}>{entry.note}</p> : null}</div></details>
            </article>
          </li>;
        })}</ol>
      </Card>
    </aside> : null}
  </div>;
}
