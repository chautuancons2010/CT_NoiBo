# Báo cáo nhân lực, an toàn và công việc

Mỗi phiên điểm danh mới lưu `worker_attendance_sessions.safety_report` cùng bản nháp, qua RPC có kiểm tra phiên bản. Báo cáo gồm nhà thầu, số giám sát, nội dung phổ biến an toàn có tick xác nhận, sức khỏe và khu vực làm việc. Nội dung công việc dùng trường `work_note` hiện có.

Số công nhân lấy từ những người được chọn và có mặt/đi trễ; tổng nhân lực là số công nhân cộng số giám sát. Không lấy toàn bộ roster để báo có mặt. Số giám sát mặc định 1 và có thể sửa. Hai nội dung phổ biến được điền theo mẫu cẩu/shiploader và AT-MT-5S-PCCC; giám sát phải tick thực tế. Sức khỏe hiển thị Tốt và cần xác nhận cùng an toàn. Khu vực nhập riêng, không tự gán mã SC05 hay thay GPS bằng địa chỉ gói.

Sửa nội dung phổ biến, công việc, sức khỏe hoặc khu vực hủy xác nhận cuối để giám sát xác nhận lại. Chuyển bước chỉ chờ lưu trên thiết bị; đồng bộ chạy nền. Gửi yêu cầu đủ báo cáo, checklist bắt buộc, xác nhận và ảnh. Database cũng kiểm tra báo cáo khi gửi; migration không đổi phiên lịch sử đã gửi.

Giám sát và Nhân sự đọc cùng thẻ báo cáo, có nút sao chép theo mẫu. Excel bổ sung sheet Báo cáo nhân lực, giữ nguyên các cột giờ công ở sheet chấm công.

Migration cần áp dụng trước khi deploy source mới: `202611090002_worker_safety_reports.sql`.
