# Sửa lỗi gửi bước cuối và nguồn công nhân

Giờ chọn công nhân trên thiết bị dùng ISO `Z`. Sau lần lưu đầu, PostgreSQL trả `checked_in_at` dạng `+00:00` (có thể có sáu chữ số thập phân). Bộ kiểm tra bản nháp trước đây chỉ nhận `Z`, nên lần tự lưu tiếp theo hoặc bấm gửi cuối bị lỗi dữ liệu dù giờ hợp lệ. Các timestamp của luồng công nhân nay nhận ISO có múi giờ, giữ nguyên thời điểm thực tế. Bản nháp/ảnh đã lưu trên thiết bị không cần xóa hay tạo lại.

Phiên đã có `submitted_at`, kể cả trạng thái `needs_review`, trả lại cùng kết quả khi gửi lại. Không đổi giờ gửi, nhân đôi ảnh hoặc yêu cầu điền lại báo cáo.

Công nhân thuộc nhóm `employment_types.worker_category = worker` do giám sát điểm danh. Danh sách ảnh cá nhân và các số đếm thiếu ảnh loại nhóm này; vẫn giữ nhân viên văn phòng, giám sát và các nhóm tự chấm khác. API tự chấm cá nhân không tạo lượt tự chấm cho công nhân. Không phân loại theo tên phòng ban vì giám sát cũng có thể thuộc phòng công trường. Trang điểm danh công trường và dữ liệu bảng công công nhân giữ nguồn phiên giám sát.

Kiểm tra tích hợp dùng mã nguồn phát hành cùng cấu hình nghiệp vụ trên cơ sở dữ liệu TEST tách biệt. Trình duyệt gọi API thật để chọn gói, cảng, nhiều công nhân; lưu lại giờ do PostgreSQL trả về; điền/xác nhận an toàn; xử lý ảnh, lưu kho ảnh và gửi phiên; gửi lại kết quả; mất mạng và tự đồng bộ; nghỉ mưa, tiếp tục, kết thúc; tăng ca với ba mốc ảnh và kiểm tra của Admin. Gói, phiên, ảnh và sự kiện QA được tạo riêng, sau đó dọn đúng ID thuộc gói QA.

PRODUCT chỉ kiểm tra đọc các phiên đang dở và health; không tạo phiên đăng nhập, gói, công nhân, ảnh hoặc điểm danh thử, không gọi lệnh ghi SQL trên PRODUCT. Bộ kiểm tra mới được đối chiếu với chính timestamp đang lưu của PRODUCT mà không gửi PATCH vào phiên thật.

Chứng cứ kiểm tra, ảnh trình duyệt và biên nhận phát hành ở `test-results/worker-final-fix-20261113/`. Không có migration hoặc thay đổi dữ liệu lịch sử trong bản sửa này.
