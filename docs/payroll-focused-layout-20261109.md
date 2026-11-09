# Bố cục bảng lương — 09/11/2026

## Vấn đề

Màn hình cũ chia sự chú ý giữa tiến trình, ba thẻ thống kê, bảng nhân viên và hai khối bên phải. Cùng một trạng thái hoặc nhân viên xuất hiện ở nhiều nơi nhưng bảng làm việc bị thu hẹp.

## Bố cục hiện tại

- Một bề mặt làm việc rộng chứa tổng tiền, bộ lọc, bảng nhân viên và nguồn công. Bỏ tiến trình và cột phụ.
- Tổng thực nhận là số tiền chính. Tổng thu nhập và khấu trừ nhỏ hơn, nằm trong cùng bề mặt. Chỉ hiện tổng tiền khi có dòng lương thực tế.
- Trạng thái đối chiếu nằm cạnh tên nhân viên, trước hai cột công cần so sánh. Liên kết từng dòng mở đúng dữ liệu cần xử lý.
- Chỉ một thao tác chính theo trạng thái: kiểm tra dữ liệu, cập nhật số liệu cũ, duyệt hoặc gửi phiếu. Thao tác duyệt bị khóa chuyển vào menu khi chưa đủ điều kiện.
- Thông tin kỳ lương mở trong drawer, giữ nguyên bộ lọc và tìm kiếm. Footer giữ nguồn công và số phiếu thực sự đã gửi/phát hành.
- Điện thoại dùng các dòng nhân viên trong cùng bề mặt, bỏ các khung lồng nhau.

Thay đổi chỉ nằm ở bố cục và cách mở thông tin phụ. Giữ nguyên dữ liệu, quyền, kiểm tra duyệt, phiên bản dòng, điều chỉnh lương và gửi phiếu.

## Kiểm tra

- Accounting: 17 tệp, 130 kiểm tra đạt; có kiểm tra giữ bộ lọc khi mở thông tin kỳ và cập nhật số liệu cũ trước khi duyệt.
- TypeScript và ESLint các tệp thay đổi đạt.
- Playwright trên Edge: 18 trường hợp ở 1920, 1440, 1024, 768, 390 và 320 px; ba trạng thái đối chiếu, đã tính và đã duyệt. Không tràn ngang toàn trang; mỗi màn có đúng một thao tác chính.
- Dữ liệu mẫu 27 nhân viên: phân trang 20/7, lọc 5 trường hợp lệch công, tìm mã NV25, liên kết tới đúng nhân viên, mở/đóng drawer và giữ bộ lọc. Kiểm tra riêng kỳ không có nhân viên.
- Build Next webpack hoàn tất 292 trang, TypeScript và build traces. Khi prerender, nguồn cấu hình hệ thống vẫn ghi `system_settings.read_failed` và dùng cấu hình dự phòng như lần kiểm tra trước. Server cổng 3003 trả health 200; truy cập bảng lương khi chưa đăng nhập chuyển về login, không có lỗi trình duyệt.
- Ảnh và báo cáo dùng dữ liệu mẫu ở `test-results/payroll-compact-preview/focused-*`. Không phải kiểm tra bảng lương riêng tư của người dùng.

Bản build cục bộ dùng slot `review-payroll`, cổng 3003. Không push, triển khai hoặc sửa schema cơ sở dữ liệu.
