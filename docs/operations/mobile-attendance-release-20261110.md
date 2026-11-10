# Bản test chấm công ngày 10/11/2026

- Website: https://ct-noi-bo-test-chau-tuan.vercel.app
- Deployment: `dpl_B4Jf9A2J8Xhye9HorX3vnwfSEmJx` (READY).
- Source commit: `95d9e7537891e9247c852966490e11b87748779e` trên nhánh `feat/dev-staging-test-platform`, đã push GitHub.
- Dấu gói source: `59c58294e9785d0e4a1849bdb0ed53d17256407ab4267e9fb137d9a34e3ed447`.

Giám sát dùng điện thoại vào Cá nhân để chấm công; bỏ khối công trường và biểu đồ ở đường vào này. Bước an toàn kiểm tra đủ nội dung rồi xác nhận bằng nút “Xác nhận & chụp ảnh”, lưu bản nháp tại thiết bị và chuyển bước ngay. Phản hồi autosave cũ không ghi đè thay đổi mới.

Ảnh cá nhân mới ghi giờ/phút/giây, ngày, loại chấm vào/ra, địa chỉ và GPS vào cả JPEG đầy đủ lẫn thumbnail. Thiếu GPS, địa chỉ hoặc lỗi xử lý ảnh thì giữ ảnh để thử lại, chưa gửi ảnh không có dấu. Không tự thêm địa chỉ vào ảnh lịch sử không có GPS.

Đã qua kiểm tra kiểu dữ liệu, lint các file liên quan và các test tập trung cho chuyển trang, xác nhận an toàn, xử lý ảnh và metadata backend. Vercel build thành công. Kiểm tra trình duyệt trên bản đã deploy lúc 08:18–08:19 ngày 10/11/2026 (giờ Việt Nam):

- Camera mở khi yêu cầu trạng thái hôm nay đang được giữ chờ; không lệ thuộc phản hồi dashboard để mở camera.
- Điều khiển camera vừa sáu kích thước: 320×568, 390×844, 430×932, 568×320, 768×1024, 1024×768.
- Đọc lại JPEG upload và thumbnail, kiểm tra pixel footer; xem trực tiếp cả hai ảnh có dấu.
- Chọn công nhân → an toàn → chụp ảnh được khi API bản nháp chậm 1,8 giây; chuyển hai bước đo được lần lượt 55 ms và 60 ms trong lượt kiểm tra.
- Nút gửi ảnh điểm danh nằm trên thanh công cụ dưới ở 320×568.
- `/dashboard` của giám sát trên điện thoại chuyển về `/personal`, không có các khối thống kê đã yêu cầu bỏ.

Camera, GPS và địa chỉ trong QA được mô phỏng. Các yêu cầu ghi nghiệp vụ bị chặn và trả dữ liệu mô phỏng; không tạo lượt chấm hoặc phiên điểm danh thật. Đây chưa phải xác nhận camera/GPS trên điện thoại thực địa. Bằng chứng riêng tại `test-results/mobile-lag-20261109/`, report có deployment ID và thời gian kiểm tra mới.

Production vẫn ở `dpl_Hz1TzXrL9sR9yEzXUeMiFZRBUbDK`. Đối chiếu môi trường trước đó xác định TEST và production dùng hai Supabase project riêng. Kiểm tra lại quyền SQL production ngày 10/11 vẫn trả HTTP 403; chưa sao lưu hoặc xóa dữ liệu/tài khoản production. Tài khoản được người dùng chỉ định giữ khi dọn là `admin`.
