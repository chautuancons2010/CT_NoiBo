# Xóa gói và kiểm tra Android — 13/11/2026

## Hành vi

- Bỏ điều kiện `ATTENDANCE_IN_PROGRESS` khỏi `delete_project_package` bằng migration `202611130004`.
- Xóa gói vẫn là xóa mềm: giữ nguyên lượt nháp/đang làm/đã gửi, công nhân, ảnh, thời gian và phân công. Gói ngừng xuất hiện trong danh sách bắt đầu lượt mới.
- Lượt đã tồn tại vẫn đọc, lưu tiếp và nhận lại bằng `clientSessionId` cũ được. Không tự hoàn tất hoặc hủy lượt khi xóa gói.
- Giữ phân quyền sửa gói và kiểm tra phiên bản cập nhật; không mở quyền xóa cho giám sát.
- Giao diện hiện tại đã cho bấm xác nhận; lỗi đến từ hàm cơ sở dữ liệu nên không cần đổi bản ứng dụng để sửa chặn này.

## Kiểm tra

- Chrome 157, giả lập Pixel 5, các chiều rộng 360/393/412 px; chưa dùng thiết bị Android vật lý.
- Dùng API và storage TEST thật cho chọn gói/cảng, chọn công nhân, an toàn, chụp ảnh, gửi điểm danh và xem kết quả. Không tràn ngang ở 5 màn hình chính trên 3 chiều rộng.
- Chạy đầy đủ 4 tình huống: GPS chính xác, từ chối quyền GPS, mất mạng, tăng ca. Nghỉ mưa lưu ảnh khi mất mạng, khôi phục sau tải lại và mất phản hồi, bổ sung ảnh không đổi thời điểm nghỉ. Không lỗi API hoặc lỗi JavaScript trong lượt kiểm tra thành công.
- Qua nút xóa trên giao diện Android, xóa một gói QA có cả `draft` và `in_progress`; so sánh nguyên dữ liệu lượt, công nhân, ảnh, sự kiện trước/sau xóa. Kiểm tra tiếp tục lưu nháp và nhận lại lượt cũ.
- Chỉ tạo và dọn fixture mã `QA-FULL-*` trên TEST. Không tạo dữ liệu kiểm thử PRODUCT.
- Migration diễn tập rollback trước áp dụng ở cả hai môi trường; đối chiếu digest dữ liệu nghiệp vụ trước/sau.

## Bằng chứng

- `test-results/package-delete-20261113/delete-qa.json`
- `test-results/package-delete-20261113/migration-test.json`
- `test-results/package-delete-20261113/migration-production.json`
- `test-results/android-attendance-20261113/full-flow.json`
- `test-results/android-layout-20261113/full-flow.json`
- Ảnh chụp nằm cùng thư mục báo cáo tương ứng.
