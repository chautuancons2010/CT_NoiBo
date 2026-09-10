import { Bell, CalendarClock, CheckCircle2, ClipboardList, MapPin, ShieldCheck } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { PermissionGate } from "@/components/shared/PermissionGate";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineState,
  PermissionDeniedState
} from "@/components/shared/States";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge, type StatusBadgeTone } from "@/components/shared/StatusBadge";
import { foundationDemoUser } from "@/lib/auth/currentUser";

const foundationItems = [
  ["Điều hướng", "Sidebar, bottom nav, breadcrumb và route-backed tabs."],
  ["Phân quyền giao diện", "Ẩn hiện điều hướng và hành động theo permission cụ thể."],
  ["Biểu mẫu và bảng", "Toolbar, filter URL, mobile list, loading, empty và error state."],
  ["File nội bộ", "Chuẩn bị signed access cho ảnh và tài liệu private."],
  ["Audit", "Sẵn khung actor, action, entity, lý do và metadata."]
] as const;

const attentionItems: Array<{
  title: string;
  description: string;
  status: string;
  tone: StatusBadgeTone;
}> = [
  {
    title: "Phê duyệt",
    description: "Không có hồ sơ quá hạn",
    status: "Ổn định",
    tone: "success"
  },
  {
    title: "Đồng bộ mobile",
    description: "Chờ dữ liệu từ thiết bị hiện trường",
    status: "Theo dõi",
    tone: "info"
  },
  {
    title: "Kho",
    description: "Không có phiếu cần xử lý gấp",
    status: "Ổn định",
    tone: "success"
  }
];

const quickLinks = [
  ["Chấm công", "/attendance"],
  ["Đơn từ", "/leave"],
  ["Thông báo", "/notifications"],
  ["Cá nhân", "/profile"]
] as const;

export function DashboardPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Các việc cần theo dõi trong ngày, hiển thị theo quyền của từng người dùng."
        title="Tổng quan"
      />

      <Card className="mobile-home-panel">
        <div className="mobile-home-panel__date">
          <span>Thứ Tư, 09/09/2026</span>
          <StatusBadge tone="warning">Chưa chấm công</StatusBadge>
        </div>
        <h2>Ca hành chính</h2>
        <p>08:00 - 17:00</p>
        <Button leftIcon={<CalendarClock aria-hidden="true" size={18} />} size="lg" variant="primary">
          Chấm công
        </Button>
        <div className="quick-link-grid">
          {quickLinks.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </div>
      </Card>

      <div className="content-grid dashboard-grid">
        <Card className="dashboard-panel dashboard-panel--wide">
          <header className="panel-header">
            <div>
              <h2>Các vấn đề cần xử lý</h2>
              <p>Ưu tiên những việc có hạn xử lý hoặc cần xác nhận trong ngày.</p>
            </div>
          </header>
          <ul className="worklist">
            {attentionItems.map((item) => (
              <li key={item.title}>
                <span className="worklist__icon">
                  <ClipboardList aria-hidden="true" size={18} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="dashboard-panel">
          <header className="panel-header">
            <div>
              <h2>Hoạt động gần đây</h2>
              <p>Lịch sử thao tác sẽ được hiển thị theo audit log.</p>
            </div>
          </header>
          <EmptyState
            description="Khi có thay đổi mới, hoạt động sẽ xuất hiện theo thời gian phát sinh."
            title="Chưa có hoạt động mới"
          />
        </Card>

        <Card className="dashboard-panel">
          <header className="panel-header">
            <div>
              <h2>Dự án cần chú ý</h2>
              <p>Theo dõi công trường có vấn đề về tiến độ, nhân lực hoặc vật tư.</p>
            </div>
          </header>
          <div className="project-attention-empty">
            <MapPin aria-hidden="true" size={20} />
            <span>Không có dự án vượt ngưỡng cảnh báo</span>
          </div>
        </Card>

        <Card className="dashboard-panel dashboard-panel--wide">
          <header className="panel-header">
            <div>
              <h2>Nền tảng giao diện</h2>
              <p>Các pattern dùng lại cho những module tiếp theo.</p>
            </div>
            <PermissionGate permissions={foundationDemoUser.permissions} require="settings.view">
              <StatusBadge tone="success">
                <ShieldCheck aria-hidden="true" size={14} />
                Sẵn sàng
              </StatusBadge>
            </PermissionGate>
          </header>
          <ul className="foundation-list">
            {foundationItems.map(([title, description]) => (
              <li key={title}>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <StatusBadge tone="success">Đã có</StatusBadge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="section-title">Trạng thái dùng chung</h2>
        <div className="state-preview-grid">
          <LoadingState description="Đang tải dữ liệu." title="Đang tải" />
          <ErrorState description="Vui lòng thử lại." title="Không thể tải dữ liệu" />
          <PermissionDeniedState description="Tài khoản hiện tại chưa có quyền phù hợp." title="Không có quyền" />
          <OfflineState description="Một số thao tác sẽ đồng bộ khi có mạng." title="Không có kết nối" />
        </div>
      </Card>

      <p className="dashboard-note">
        <Bell aria-hidden="true" size={16} />
        Thông báo, việc cần xử lý và trạng thái đồng bộ dùng chung một nền tảng giao diện.
      </p>
      <p className="dashboard-note">
        <CheckCircle2 aria-hidden="true" size={16} />
        Hồ sơ nhân viên và tài khoản đăng nhập được tách biệt để kiểm soát quyền rõ ràng.
      </p>
    </div>
  );
}
