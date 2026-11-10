# Khôi phục ERP và hoàn thiện chấm công

## Phạm vi đã chốt

- Giữ màu xanh hiện tại và bố cục điện thoại của giám sát; sửa độ trễ, thao tác và tràn ngang.
- Tham chiếu bản production `dpl_Hz1TzXrL9sR9yEzXUeMiFZRBUbDK`, mã gốc `bcecf83759d67e2be5eda7fbcd6761d3bd5d2ae7` và ảnh giao diện đã lưu. Không xác nhận đã đăng nhập trực tiếp production.
- Khôi phục danh sách chức năng HR bên trái: nhân viên, phòng ban, chức vụ, hợp đồng, BHXH, kiểm tra công, ảnh công trường, bảng công, kỳ công, ca làm, phép, bổ sung/điều chỉnh công và cấu hình.
- Khôi phục các thẻ thông tin và tab hồ sơ nhân viên, gồm tài liệu và công trường; vẫn áp dụng quyền dữ liệu nhạy cảm.
- Nhân sự kiểm tra phiên/ảnh tại `/employees/field-attendance`; các URL điểm danh giám sát chuyển HR về màn kiểm tra. Luồng chọn gói/chụp ảnh yêu cầu quyền tạo điểm danh.
- Giám sát chụp chấm công cá nhân trước, chọn gói, tick công nhân, phổ biến an toàn, ghi công việc/khu vực/sức khỏe, chụp nhiều ảnh rồi gửi phiên.
- Báo cáo nhân lực theo mẫu Châu Tuấn, tổng CN + GS, an toàn/5S/PCCC, công việc, sức khỏe và khu vực.
- Yêu cầu mới nhất thay thế yêu cầu cho chấm không giới hạn: một lượt vào và một lượt ra mỗi ngày. Không ra trước khi vào; chặn ở UI, API và trigger có khóa chống tranh chấp. Dữ liệu cũ giữ nguyên.
- Chụp → xem trước → chụp lại hoặc xác nhận. Chưa xác nhận thì chưa tạo sự kiện/queue. Kết quả gồm ảnh và trạng thái trong một thẻ.
- Ảnh JPEG/thumbnail lưu có ngày giờ Việt Nam, địa chỉ GPS và tọa độ; không tự tạo GPS cho ảnh cũ. Ảnh nháp và ảnh đã gửi đều mở lớn được.
- HR xem một bộ ảnh chung mỗi phiên; Excel vẫn có từng người, giờ vào/ra, giờ công, bảng dấu công và liên kết phiên/ảnh.
- Admin/HR bổ sung giờ tại `/timesheets/adjustments`, bắt buộc lý do, lưu lịch sử và tính lại kỳ công. Excel kỳ công dùng dữ liệu sau điều chỉnh; Excel công trường phản ánh sự kiện/điều chỉnh của phiên công trường.
- Văn phòng tạm ngừng tự chấm công; giữ hồ sơ, phép, lịch sử và quyền nghiệp vụ khác.
- Module khóa do admin quản lý vẫn có hiệu lực cả route và API, không bỏ kiểm tra để giảm độ trễ.
- Đồng bộ realtime giữ nguyên. Các tải lại lịch điểm danh dùng một request đang chạy, không nhân request khi nhiều miền realtime cập nhật cùng lúc. Chuyển bước dùng bản nháp trên máy; IndexedDB chỉ báo lưu xong khi transaction đã commit.
- Link TEST mở trực tiếp, tài khoản thử có thể chọn không cần mã truy cập. Production không bật công cụ thử.

## Minh chứng 45 ngày

- Lịch Supabase Cron TEST `ct-attendance-evidence-45d`: `0 19 * * *` UTC = 02:00 giờ Việt Nam.
- Secret trong Vault; cron gọi endpoint có xác thực `/api/v1/operations/evidence-retention`.
- Xóa cả ảnh gốc và thumbnail theo `captured_at`. Dọn chỉ mục tài liệu/phiên bản tương ứng trước khi xóa `file_assets` trong cùng giao dịch metadata.
- Bản ghi công, giờ vào/ra và liên kết kiểm toán vẫn còn; ảnh chuyển trạng thái hết hạn. Những phiên bản tài liệu khác được giữ.
- Nếu hoàn tất metadata thất bại, giữ ID tệp để lần chạy sau có thể tiếp tục. Không đánh dấu hết hạn rồi để mất dấu các tệp chưa dọn xong.
- Liên kết Excel ổn định, yêu cầu tài khoản có quyền; hết 45 ngày hiển thị trạng thái hết hạn.

## Kiểm tra và phát hành

- 55 kiểm tra tập trung: quyền/menu HR, chấm trùng, luồng preview và ghi thông tin ảnh.
- Kiểm tra database TEST bằng transaction rollback: vào/ra hợp lệ; từ chối vào lặp trước/sau ra, ra lặp, ra thiếu vào và văn phòng.
- Tạo tài khoản qua form admin, đăng nhập mật khẩu riêng, chụp lại không tạo công, xác nhận mới ghi công, ảnh thực trong storage và API từ chối lượt lặp.
- Luồng 2 công nhân/2 ảnh: an toàn SC05, HR realtime, mở ảnh thứ hai, xuất Excel thực và mở link ảnh từ Excel về đúng màn HR.
- Kiểm tra chiều rộng 320/390 và desktop 1440 trên các màn liên quan; camera/GPS mô phỏng trong trình duyệt. Chưa thay thế nghiệm thu camera/GPS trên điện thoại thật.
- Giữ nguyên deployment production; chỉ phát hành link Vercel TEST.

## Production — trạng thái mới nhất

- TEST Supabase `lgmlkagcytfjazulgfbz`; production `uioywupuuestcaliawlc`, hai database riêng.
- Người dùng đã đăng nhập Supabase CLI, cấp quyền SQL, sau đó yêu cầu bỏ backup và xóa trực tiếp dữ liệu mẫu, giữ `admin`.
- Đã rehearsal rollback rồi commit dọn 157 bảng; Auth/Storage dọn qua API. Còn đúng một app account, một Auth user và hồ sơ tối thiểu liên kết admin; dữ liệu chấm công, phiên, dự án và Storage trống. Mật khẩu admin giữ nguyên.
- Đã áp dụng 14 migration thiếu ban đầu, hai migration hỗ trợ nhiều lượt điểm danh và khởi tạo danh mục/chính sách vận hành tối thiểu, không thêm dữ liệu mẫu. Production đủ 61 migration; deployment ứng dụng production chưa đổi.
- Trạng thái giao diện/Excel, minh chứng và bước kích hoạt retention sau deploy: [attendance-interface-release-20261110.md](operations/attendance-interface-release-20261110.md).
