# Ảnh chấm công có thời gian và địa chỉ

Ảnh cá nhân mới chỉ được xếp hàng đồng bộ sau khi lấy được GPS thực tế, địa chỉ từ kết quả định vị và đóng dấu thành công lên cả JPEG đầy đủ lẫn thumbnail. Footer gồm giờ/phút/giây, ngày/tháng/năm theo Việt Nam, loại chấm vào/ra, địa chỉ và tọa độ. Không dùng địa chỉ công trường thay cho GPS và không gửi ảnh gốc khi canvas lỗi.

Nếu thiếu quyền vị trí, GPS, địa chỉ hoặc không mã hóa được ảnh, màn hình giữ ảnh hiện tại và hiện trạng thái chưa gửi. Thử lại dùng ảnh và thời điểm chụp gốc. Khi GPS không còn khớp thời điểm chụp trong một phút, người dùng phải chụp lại; không thay giờ chụp bằng giờ thử lại. Ảnh đã đóng dấu được lưu vào hàng đợi hiện có và gửi metadata `stamp` tùy chọn kèm upload.

Backend đối chiếu thời gian, tọa độ metadata với lượt chấm và lưu trong `attendance_photos.metadata.stamp`. Queue cũ không có stamp vẫn được tiếp nhận như dữ liệu cũ. Không thay đổi blob ảnh lịch sử. Trình xem ảnh cũ phủ thông tin ngày giờ từ lượt chấm và nêu rõ khi không ghi nhận GPS lúc chụp; đây là phần hiển thị từ dữ liệu, không tuyên bố ảnh gốc đã đóng dấu.

Kiểm tra tập trung client: chặn queue/upload khi thiếu GPS, địa chỉ hoặc lỗi đóng dấu; giữ ảnh và capture ID/time khi thử lại; footer được vẽ trước mã hóa trên cả hai kích thước; đồng bộ queue cũ giữ tương thích. Kiểm tra JPEG thực tế dùng camera/GPS mô phỏng ở bước QA deploy.
