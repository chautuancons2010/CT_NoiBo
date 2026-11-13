# Điểm danh ngoại tuyến và giao diện gói trên mobile

Thay thế quy định chặn GPS của đợt `gps-display-20261113`.

- Giữ nguyên màn hình đăng nhập. TEST công khai vẫn chỉ cho giám sát đăng nhập.
- Giám sát thấy gói đang hoạt động/chuẩn bị, chọn gói → cảng → công nhân → an toàn → ảnh. Không cần phân công hay duyệt gói trước.
- Yêu cầu GPS chính xác cao, không dùng vị trí công trường làm vị trí chụp. Trình duyệt quyết định có hiện hộp thoại cấp quyền hay dùng quyền đã lưu.
- Thiếu GPS hoặc sai số lớn vẫn cho lưu và gửi ảnh. Phiên đã gửi được đánh dấu cần đối soát; ảnh thiếu GPS vẫn tính là bằng chứng ảnh. Không thay tọa độ của ảnh cũ bằng GPS lấy sau đó.
- Ảnh, giờ chụp và giờ chọn từng công nhân được lưu trên thiết bị trước khi gửi mạng. Mất mạng giữ hàng đợi, có mạng tự gửi; các bộ xử lý dùng chung kết quả gửi thành công. Phiên cần đối soát có `submitted_at` cũng đã gửi xong, không để lại hàng đợi gửi lại.
- Giờ đến thực tế của từng công nhân được gửi trong bản nháp; cơ sở dữ liệu giữ giờ đó khi đồng bộ và retry. Đi trễ tính từ mốc có mặt trước ca 10 phút: cảng tổng hợp 07:20, chuyên dụng 07:50. Người đến 07:25 tại cảng tổng hợp trễ 5 phút dù đến 09:00 mới có mạng. Không áp dụng mốc ca thường cho tăng ca.
- Không chọn công nhân không có nghĩa là vắng. Mưa, ra sớm, tăng ca giữ luồng ghi nhận riêng hiện có.

Giao diện dùng thẻ gói có vùng chọn toàn thẻ, trạng thái và số người gọn; hai lựa chọn cảng hiển thị sau chọn gói. Nút chính trong luồng cuộn, cao ít nhất 48px; nút thao tác cao ít nhất 44px. Cảnh báo GPS đặt trong khối vị trí, tránh lặp nút thử lại dưới chức năng chụp. Thao tác sửa/xóa gói giữ tách biệt; xóa cần xác nhận.

Migration `202611130003_worker_offline_capture_clocks.sql` chỉ thay hàm lưu bản nháp và trigger giờ điểm danh; không cập nhật bản ghi lịch sử. Diễn tập rollback trước khi áp dụng từng môi trường, kiểm tra số lượng và digest dữ liệu giữ nguyên. Kiểm tra RPC/trigger trên TEST bằng giao dịch rollback: giữ giờ 07:25, trạng thái đi trễ, retry không đổi giờ và bỏ chọn xóa giờ của lựa chọn đó.

Kết quả kiểm tra, ảnh giao diện và biên nhận phát hành lưu tại `test-results/mobile-attendance-20261113/` trên máy triển khai. Kiểm tra production chỉ đọc dữ liệu nghiệp vụ; không tạo gói/công nhân/chấm công thử trên production.
