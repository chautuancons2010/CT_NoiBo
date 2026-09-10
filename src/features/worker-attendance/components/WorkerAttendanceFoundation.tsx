import { Camera, CheckSquare, ClipboardCheck, Users } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Checkbox, Select } from "@/components/shared/FormControls";
import { StatusBadge } from "@/components/shared/StatusBadge";

const rosterRows = [
  ["CN001", "Nguyễn Văn A", "Có mặt"],
  ["CN002", "Trần Văn B", "Có mặt"],
  ["CN003", "Lê Văn C", "Ngoại lệ"]
] as const;

export function WorkerAttendanceFoundation() {
  return (
    <div className="worker-attendance-layout">
      <Card className="mobile-supervisor-task">
        <header className="panel-header">
          <div>
            <h2>Điểm danh hôm nay</h2>
            <p>Dự án, ngày làm việc, danh sách công nhân và ngoại lệ trong một luồng.</p>
          </div>
          <StatusBadge tone="info">Mobile-first</StatusBadge>
        </header>
        <div className="supervisor-summary">
          <div>
            <Users aria-hidden="true" size={18} />
            <span>Dự kiến</span>
            <strong>Theo phân công</strong>
          </div>
          <div>
            <ClipboardCheck aria-hidden="true" size={18} />
            <span>Ngày</span>
            <strong>09/09/2026</strong>
          </div>
        </div>
        <Button leftIcon={<CheckSquare aria-hidden="true" size={16} />} size="lg" variant="primary">
          Chọn tất cả có mặt
        </Button>
        <div className="worker-list" aria-label="Danh sách công nhân điểm danh">
          {rosterRows.map(([code, name, status]) => (
            <article className="worker-row" key={code}>
              <Checkbox checked={status === "Có mặt"} label={`${code} - ${name}`} readOnly />
              <StatusBadge tone={status === "Ngoại lệ" ? "warning" : "success"}>{status}</StatusBadge>
            </article>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="section-title">Ngoại lệ và ảnh tập thể</h2>
        <div className="form-section__grid form-section__grid--one">
          <Select
            label="Lý do ngoại lệ"
            options={[
              { label: "Vắng", value: "absent" },
              { label: "Đi trễ", value: "late" },
              { label: "Điều chuyển", value: "transferred" },
              { label: "Chưa rõ lý do", value: "unknown" }
            ]}
            placeholder="Chọn trạng thái"
          />
          <div className="photo-strip" aria-label="Gallery ảnh tập thể">
            <button type="button">
              <Camera aria-hidden="true" size={18} />
              Thêm ảnh
            </button>
            <span>Ảnh thuộc phiên điểm danh trong ngày.</span>
          </div>
        </div>
        <div className="sticky-action-bar sticky-action-bar--inline">
          <Button variant="secondary">Xem lại</Button>
          <Button variant="primary">Gửi điểm danh</Button>
        </div>
      </Card>
    </div>
  );
}
