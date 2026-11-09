# Sửa luồng điện thoại và chấm công

- Camera mở ngay khi vào Chấm công; ca làm tải song song. Nút chụp chỉ bật khi có ca và hành động hợp lệ. Dữ liệu ca trên máy chỉ tái sử dụng trong đúng tài khoản, ngày hiện tại và tối đa một phút trong lúc tải mới.
- Màn hình camera dùng chiều cao vùng hiển thị thực tế, chừa thanh công cụ dưới và vùng an toàn. Thanh chọn gói và nút Tiếp tục nằm trong luồng nội dung; gói đã chọn có nút Tiếp tục ngay trong thẻ.
- Chọn gói lưu bản nháp rồi mở danh sách ngay. Các bước công nhân, an toàn và ảnh dùng điều hướng trên thiết bị, không chờ API. Chỉ gửi điểm danh sau khi đồng bộ xong. Dữ liệu mới trên máy được giữ khi phản hồi đồng bộ cũ quay về.
- Mỗi phiên đồng bộ tuần tự; API có timeout. GPS chạy khi mở bước ảnh, độc lập với nút chuyển bước, dùng vị trí thực tế và thử lại khi thiếu quyền/vị trí.
- Ảnh chấm công cá nhân mới có thời gian và vị trí trên ảnh, nút xem ảnh sau khi chấm và trên trang Cá nhân. Trường hợp chưa có địa chỉ/GPS được ghi rõ, không lấy địa chỉ công trường thay cho vị trí thiết bị.
- Kiểm tra module dùng snapshot đã xác minh tối đa 2 giây cho ghi, 5 giây cho đọc; cập nhật admin làm mới ngay worker hiện tại. Khi gián đoạn kết nối có thể dùng trạng thái đã xác minh tối đa 30 giây; không dùng cấu hình mặc định để mở lại module. Worker khác nhận thay đổi trong cửa sổ cache này. Admin vẫn đọc mới trực tiếp.
- Vercel TEST chạy tại Singapore (sin1), cùng khu vực database TEST, giảm các lượt gọi liên vùng. Không deploy production.
