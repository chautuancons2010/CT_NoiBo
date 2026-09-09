import { CheckCircle2 } from "lucide-react";

import { Card } from "@/components/shared/Card";
import { EmptyState, ErrorState, LoadingState, OfflineState, PermissionDeniedState } from "@/components/shared/States";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";

const foundationItems = [
  ["Routing thật", "Next App Router, URL bookmark và deep link."],
  ["Permission-aware UI", "Navigation và action dựa trên permission cụ thể."],
  ["API v1", "Route handlers qua /api/v1, validation và error model thống nhất."],
  ["Private storage", "File nội bộ đi qua backend signed access, không hard-code public bucket."],
  ["Audit foundation", "Actor, action, entity, before/after, reason và metadata."]
] as const;

export function DashboardPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Dashboard prompt 1 chỉ hiển thị nền tảng và các trạng thái chung, chưa tạo KPI giả."
        title="Tổng quan"
      />
      <div className="content-grid content-grid--two">
        <Card>
          <h2 className="section-title">Hôm nay cần theo dõi</h2>
          <EmptyState
            description="Các cảnh báo thật sẽ xuất hiện sau khi module nghiệp vụ được triển khai."
            title="Chưa có dữ liệu nghiệp vụ"
          />
        </Card>
        <Card>
          <h2 className="section-title">Nền tảng đã sẵn sàng</h2>
          <ul className="foundation-list">
            {foundationItems.map(([title, description]) => (
              <li key={title}>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <StatusBadge tone="success">Đã tạo</StatusBadge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <h2 className="section-title">Pattern trạng thái dùng chung</h2>
        <div className="state-preview-grid">
          <LoadingState description="Skeleton/loading dùng khi dữ liệu đang tải." title="Loading" />
          <ErrorState description="Lỗi hiển thị thân thiện, không lộ stack trace." title="Error" />
          <PermissionDeniedState description="UI và API đều kiểm permission." title="Permission denied" />
          <OfflineState description="Mobile hiện trường có trạng thái offline rõ ràng." title="Offline" />
        </div>
      </Card>
      <p className="dashboard-note">
        <CheckCircle2 aria-hidden="true" size={16} />
        Employee Record và User Account được chuẩn bị như hai đối tượng tách biệt.
      </p>
    </div>
  );
}
