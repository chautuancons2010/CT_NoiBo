import { Camera, CheckCircle2, MapPin, RefreshCcw, RotateCcw, Wifi } from "lucide-react";

import { Button, IconButton } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { OfflineState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function AttendanceCameraFoundation() {
  return (
    <div className="attendance-camera-grid">
      <Card className="camera-panel">
        <div className="camera-panel__preview" aria-label="Khung camera chấm công">
          <Camera aria-hidden="true" size={36} />
          <span>Sẵn sàng chụp</span>
        </div>
        <div className="camera-panel__capture">
          <button aria-label="Chụp ảnh chấm công" className="capture-button" type="button">
            <span />
          </button>
          <p>Ảnh, vị trí và trạng thái mạng được ghi nhận cùng một phiên chấm công.</p>
        </div>
      </Card>
      <div className="mobile-task-stack">
        <Card>
          <h2 className="section-title">Trạng thái ghi nhận</h2>
          <ul className="foundation-list">
            <li>
              <span>
                <strong>GPS</strong>
                <small>Vị trí nằm trong phạm vi cho phép.</small>
              </span>
              <StatusBadge tone="success">Hợp lệ</StatusBadge>
            </li>
            <li>
              <span>
                <strong>Kết nối</strong>
                <small>Ảnh và bản ghi có trạng thái đồng bộ riêng.</small>
              </span>
              <StatusBadge tone="info">Đang online</StatusBadge>
            </li>
            <li>
              <span>
                <strong>Phiên ghi nhận</strong>
                <small>Mỗi lần gửi có mã phiên để tránh tạo bản ghi trùng.</small>
              </span>
              <StatusBadge>Đã chuẩn bị</StatusBadge>
            </li>
          </ul>
        </Card>
        <Card className="attendance-actions-card">
          <h2 className="section-title">Ảnh vừa chụp</h2>
          <div className="attendance-preview">
            <div>
              <MapPin aria-hidden="true" size={16} />
              Văn phòng / Công trường hợp lệ
            </div>
            <div>
              <Wifi aria-hidden="true" size={16} />
              Sẵn sàng đồng bộ nền
            </div>
          </div>
          <div className="action-row">
            <Button leftIcon={<RotateCcw aria-hidden="true" size={16} />} variant="secondary">
              Chụp lại
            </Button>
            <Button leftIcon={<CheckCircle2 aria-hidden="true" size={16} />} variant="primary">
              Dùng ảnh
            </Button>
          </div>
          <OfflineState
            description="Một số thao tác sẽ được đồng bộ khi có mạng."
            title="Đã lưu trên thiết bị"
          />
        </Card>
        <div className="floating-mobile-action">
          <Button leftIcon={<RefreshCcw aria-hidden="true" size={16} />} size="lg" variant="primary">
            Chấm công
          </Button>
          <IconButton label="Tùy chọn chấm công">
            <Camera aria-hidden="true" size={18} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
