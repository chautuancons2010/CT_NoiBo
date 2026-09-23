"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/shared/Card";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Payslip } from "../types";

const money = (value: unknown) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value ?? 0));

export function PayslipDetail({ id }: { id: string }) {
  const [item, setItem] = useState<Payslip>();
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/v1/accounting/payslips/${id}`, { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setItem(body.data);
    }).catch((reason) => setError(reason.message));
  }, [id]);

  if (error) return <ErrorState action={null} description={error} />;
  if (!item) return <LoadingState />;
  return (
    <div className="content-grid content-grid--two">
      <Card>
        <div className="panel-header">
          <h2>Phiếu lương tháng {item.periodMonth.slice(0, 7)}</h2>
          <StatusBadge status={item.status} />
        </div>
        <dl className="detail-field-list">
          <div><dt>Nhân viên</dt><dd>{item.employeeName}</dd></div>
          <div><dt>Mã nhân viên</dt><dd>{item.employeeCode}</dd></div>
          <div><dt>Phiên bản</dt><dd>v{item.version}</dd></div>
          <div><dt>Ngày công</dt><dd>{String(item.snapshot.workDays ?? 0)}</dd></div>
          <div><dt>Ngày phát hành</dt><dd>{item.publishedAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.publishedAt)) : "—"}</dd></div>
          <div><dt>Đã xem</dt><dd>{item.viewedAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.viewedAt)) : "—"}</dd></div>
        </dl>
      </Card>
      <Card>
        <h2 className="section-title">Thu nhập</h2>
        <dl className="detail-field-list">
          <div><dt>Lương cơ bản</dt><dd>{money(item.snapshot.baseSalary)}</dd></div>
          <div><dt>Phụ cấp</dt><dd>{money(item.snapshot.allowance)}</dd></div>
          <div><dt>Thưởng</dt><dd>{money(item.snapshot.bonus)}</dd></div>
          <div><dt>Khấu trừ</dt><dd>{money(item.snapshot.deduction)}</dd></div>
          <div><dt>Thực nhận</dt><dd><strong>{money(item.snapshot.netSalary)}</strong></dd></div>
        </dl>
        <a className="button button--primary button--md" href={`/api/v1/accounting/payslips/${item.id}/download`}><Download size={16} /><span>Tải PDF</span></a>
      </Card>
      {item.status === "revoked" ? <Card><h2 className="section-title">Thông tin thu hồi</h2><p>{item.revokeReason ?? "—"}</p></Card> : null}
    </div>
  );
}
