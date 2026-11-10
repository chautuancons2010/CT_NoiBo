# Sửa màn hình vào và bước chụp ảnh

Giám sát dùng điện thoại vào trang Cá nhân để chấm công. Bỏ khối Công trường hôm nay và dashboard thống kê/biểu đồ khỏi đường vào này, giữ link Điểm danh công nhân và thanh công cụ dưới. Desktop và dashboard các role khác vẫn dùng theo quyền hiện có.

Một bản nháp TEST thực tế có đủ nội dung công việc, khu vực, sức khỏe, các nội dung phổ biến và checklist nhưng cờ xác nhận cuối vẫn tắt. Thay checkbox xác nhận riêng bằng hành động rõ ràng **Xác nhận & chụp ảnh**: kiểm tra dữ liệu, ghi xác nhận cùng báo cáo hiện tại vào bản nháp và chuyển bước ngay, không chờ mạng. Chỉ một hành động này xác nhận báo cáo; không tự tick các chuẩn hoặc nội dung phổ biến thay người dùng.

Phản hồi autosave dùng danh tính snapshot thay cho so sánh đồng hồ millisecond để phát hiện thay đổi mới. Giữ xác nhận và nội dung đã sửa khi phản hồi cũ quay lại, kể cả khi nhiều thao tác có cùng timestamp. Nút chuyển bước dùng ID mới nhất nếu bản nháp được nâng sang ID server trong lúc lưu.

Ảnh cũ không có GPS không được gán địa chỉ giả. Ảnh chấm công mới phải xử lý dấu thời gian và địa chỉ thực tế trước khi đưa vào hàng đợi gửi; lỗi GPS/địa chỉ/đóng dấu giữ ảnh ở bước thử lại. Dấu được ghi vào JPEG đầy đủ và thumbnail, không chỉ hiện ở dòng thông tin bên ngoài ảnh.
