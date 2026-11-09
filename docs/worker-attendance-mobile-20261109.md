# Điện thoại và điểm danh công trường

Điện thoại mở lại trang Cá nhân và thanh công cụ dưới, giữ nguyên token màu hiện tại. Giám sát có lối vào Chấm công cá nhân và Điểm danh công nhân.

Luồng: chụp ảnh chấm vào cá nhân → chọn gói/ca → tick công nhân → tick các chuẩn an toàn và xác nhận an toàn → chụp ảnh điểm danh → gửi. Server kiểm tra ảnh chấm vào trước khi tạo/gửi phiên. Khi có mạng, các tick được đồng bộ tự động sau khoảng 700 ms; các bản nháp vẫn lưu trên thiết bị. Nhân sự có quyền đọc phiên và nhận tín hiệu realtime để cập nhật danh sách/chi tiết.

Ảnh điểm danh được ghi trực tiếp địa chỉ GPS, tọa độ và ngày giờ chụp theo Asia/Ho_Chi_Minh lên ảnh đầy đủ và thumbnail. Khi không lấy được GPS/địa chỉ, ảnh được giữ ở bước chụp để thử lại, không ghi địa chỉ giả.

Ca từ shifts, shift_assignments và shift_versions được dùng chung cho chấm công cá nhân, màn hình Nhân sự và roster công trường. Thứ tự ưu tiên: cá nhân, dự án, phòng ban, công ty; áp dụng ngày hiệu lực và ngày trong tuần. Phiên mới chụp lại giờ ca và phút nghỉ làm snapshot cho lịch sử.

Giờ vào từng người được ghi bằng thời gian server khi tick có mặt được lưu. Giờ ra ghi khi Chốt công cuối ngày; ngoại lệ có giờ riêng dùng mốc giờ được nhập. Bỏ tick trước khi gửi loại người đó khỏi công. Bảng giờ công trừ số phút nghỉ theo snapshot ca. Phiên cũ thiếu mốc giờ thực tế được giữ nguyên và báo thiếu giờ, không tự bổ sung giờ giả.

Excel có sheet chi tiết theo người và sheet tổng hợp, gồm gói/công trường, ca, giờ vào/ra, phút hiện diện, phút nghỉ, giờ công, giám sát, địa chỉ ảnh, trạng thái an toàn và các phiên thiếu giờ. Xuất dữ liệu có phân trang để không bị cắt ở 200 phiên.

Kiểm tra tập trung: 24 ca cho điều hướng, thứ tự bước và Excel/giờ công; migration được thử trong transaction rollback trước khi áp dụng vào TEST, không đổi số bản ghi hiện có. Không chạy lại toàn bộ bộ kiểm thử theo yêu cầu tiết kiệm token.
