# Hoàn thiện giao diện ERP Châu Tuấn — 06/11/2026

Phạm vi: CT_NoiBo tại localhost:3000. Tham chiếu bảng màu sáng của landing page Dtech; giữ thương hiệu Châu Tuấn và cấu hình màu chính hiện tại. Công việc này chưa được xuất bản lên GitHub hoặc Vercel.

## Thiết kế dùng chung

- `src/styles/tokens.css` sở hữu màu, khoảng cách, chiều cao, bo góc và độ nổi. Nền ngà sáng, bề mặt trắng, điều hướng xanh dịu; không tạo stylesheet ghi đè riêng cho từng trang.
- `ApplicationChrome.module.css` sở hữu khung ứng dụng; `erp-components.css` sở hữu điều khiển, bảng, form và bề mặt chung. Bảng điều khiển sử dụng thẻ chỉ số sáng và thanh ứng dụng gọn.
- `FormWorkspace` chia vùng nhập chính và vùng bổ sung, tự xếp một cột trên thiết bị nhỏ. Form tạo nhân viên giữ đủ 28 trường, kiểm tra hợp lệ và quy trình lưu; thanh nút lưu nằm trong tầm nhìn. Form tạo gói dùng trực tiếp tiêu đề chung và token bề mặt.
- Tiêu đề chính trong nội dung vẫn truy cập được với trình đọc màn hình khi nhãn trên thanh điện thoại thay thế phần hiển thị. Không tạo tiêu đề chính thứ hai trong thanh ứng dụng.
- `LoadingExperience.module.css` sở hữu skeleton giữ bố cục. `GlobalLoadingIndicator` chỉ hiển thị tiến trình chuyển trang sau 180 ms, cao 3 px và không chặn thao tác. Tác vụ riêng giữ phản hồi tại chỗ. Các hiệu ứng tôn trọng reduced motion.
- `WorkspaceLink` chuẩn bị route khi có ý định mở bằng con trỏ, focus hoặc chạm; không tải trước toàn bộ danh sách module.

## Lỗi tải bảng lương và giới hạn còn lại

Kiểm tra chỉ đọc xác nhận cơ sở dữ liệu đang dùng chưa có hai bảng phụ `payslip_deliveries` và `payroll_timesheet_handoffs`. Trước đây lỗi đọc các bảng này làm danh sách bảng lương trả 500 dù kỳ lương và dòng lương đã lưu vẫn tồn tại.

Chỉ lỗi thiếu đúng quan hệ phụ (PGRST205 hoặc 42P01 cùng tên bảng) mới được chuyển thành cờ chưa sẵn sàng. Danh sách và chi tiết tiếp tục đọc số liệu đã lưu; không thay tổng tiền hay số phiếu đang chờ chưa biết bằng số 0. Lỗi quyền, kết nối, đối chiếu đầu vào và dữ liệu lương chính vẫn được báo lỗi. Giao diện nêu trạng thái thiếu theo dõi và không cung cấp các nút gửi cần hạ tầng này.

Đã xác nhận API danh sách trả 200 với 7 kỳ, chi tiết mẫu trả 200. Chưa cập nhật schema online, chưa thực hiện gửi phiếu hoặc ghi chứng từ thật. Vì vậy kết quả này không xác nhận tính sẵn sàng phát hành toàn bộ nghiệp vụ lương.

## Kiểm chứng cục bộ

- Vitest cuối cùng: 178 file đạt, 1 file bỏ qua; 1.077 test đạt, 37 bỏ qua. Có kiểm tra riêng cho tiến trình đồng thời, lỗi quyền và việc phân biệt đúng tên quan hệ phụ chưa có.
- Typecheck, lint các tệp TypeScript thay đổi và build production cô lập được kiểm tra; không thay cấu hình để bỏ qua lỗi kiểu.
- Trình duyệt thực: bộ lọc, dropdown lồng nhau, form nhân viên/gói/phiếu nhập, danh sách và chi tiết lương ở 1440, 768 và 390 px; kiểm tra tràn trang, tiêu đề chính, form lồng nhau, tiến trình điều hướng và reduced motion.
- Kiểm tra đọc 10 khu vực: điều hành, nhân viên, gói, tồn kho, nhập kho, lô hàng, lương, nghỉ phép, bảng công và quản trị. Lượt kiểm tra không có lỗi JavaScript hoặc API nghiệp vụ.
- Mẫu đo 5 lần chuyển trang trên bản build tại máy: 111–1.959 ms tới tiêu đề, sau 300 ms đưa con trỏ vào liên kết. Đây là số đo cục bộ, không phải so sánh trước/sau hoặc cam kết tốc độ dữ liệu trên mọi mạng.
- Mọi thao tác ghi nghiệp vụ đều bị chặn trong kiểm tra trình duyệt. Ảnh và phiên kiểm tra chứa dữ liệu thật chỉ nằm ở thư mục tạm ngoài repo CT_NoiBo; không đưa vào tài liệu công khai.

Máy chủ gốc localhost:3000 được giữ hoạt động. Bản build kiểm chứng dùng thư mục tạm và cổng riêng, không phải deployment.
