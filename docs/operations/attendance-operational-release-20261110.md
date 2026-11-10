# Hoàn thiện chấm công và kiểm tra vận hành trên TEST

Ngày 10/11/2026, giữ tông xanh hiện tại, làm lại thẻ chấm công cá nhân với đồng hồ lớn, họa tiết mặt đồng hồ, ca làm và hai thao tác vào/ra. Camera có khung ngắm và xem trước ngày giờ; thanh điều khiển nằm dưới thanh đầu trang, trên thanh điều hướng điện thoại.

Nhãn vai trò Kỹ sư đổi thành Giám sát trong danh sách chọn vai trò công trường, nhóm nhân viên, thông báo và tài khoản mẫu. Giữ nguyên mã dữ liệu/quyền để các phân công cũ tiếp tục liên kết. Hai tài khoản mẫu trên TEST chỉ cập nhật tên hiển thị, không đổi tên đăng nhập hoặc mật khẩu.

## Nhân sự xem ảnh và công

Tại Kiểm tra ảnh chấm công, chọn **Ảnh công trường**, hoặc mở `/worker-attendance`. Mặc định **Theo phiên**: một thẻ cho mỗi phiên/gói/ca, bộ ảnh dùng chung, số công nhân và tên người được chọn. Chọn **Xem phiên** để mở đủ ảnh, báo cáo an toàn và giờ công từng người. Tùy chọn **Danh sách** giữ cách xem dạng bảng. Dữ liệu cập nhật qua cơ chế realtime hiện có.

Giám sát có thể chụp tiếp từng ảnh bằng **Chụp thêm ảnh hiện trường** trước khi gửi cùng một phiên. Album dạng dải ảnh để các nút chính gọn trên điện thoại. Input được xóa giá trị sau mỗi lần chọn, nên camera trả về cùng tên file vẫn nhận ảnh tiếp theo. Ảnh mới vẫn được ghi thời gian, địa chỉ và GPS vào JPEG.

Nút Excel xuất tháng của gói. File có chi tiết giờ vào/ra, giờ làm theo từng người, tổng hợp công nhân, **Bảng dấu công**, **Ảnh theo phiên** và báo cáo nhân lực. `X` là có mặt, `½` là ngoại lệ nửa ngày, `—` là chưa ghi công. Dấu hiện diện không tự sinh tám giờ làm: giờ làm vẫn tính từ cặp vào/ra thực tế và thời gian nghỉ theo ca; chưa chốt thì để trống giờ và ghi trạng thái thiếu. Bản nháp chưa gửi không được xuất thành công đã xác nhận. Bộ ảnh được liệt kê một lần theo phiên, không nhân bản theo công nhân.

## Kiểm tra đã thực hiện

Đã kiểm tra trực tiếp lúc 08:42–08:44 giờ Việt Nam trên deployment `dpl_GtyPX7JUmjhKMPC8NCwdcziEiioo`:

1. Trình duyệt mới mở link test vào màn chọn tài khoản, không có cookie tester hoặc mã mời.
2. Admin tạo ba hồ sơ thử nghiệm và tạo tài khoản Giám sát bằng biểu mẫu thật. Tài khoản mới đăng nhập bằng mật khẩu riêng, mở Cá nhân và bị từ chối truy cập danh sách nhân sự (403).
3. Tạo gói và địa điểm riêng cho UAT, phân công Giám sát cùng hai công nhân bằng API ứng dụng.
4. Giám sát ghi chấm công cá nhân và ảnh đóng dấu qua API và private storage thật.
5. Chọn hai công nhân, điền an toàn, chụp/chọn tiếp hai ảnh có cùng tên file, gửi thành một phiên. Server lưu hai ảnh và giờ vào riêng cho hai người.
6. Màn nhân sự mở từ trước nhận được phiên mà không tải lại thủ công; hiển thị bộ hai ảnh một lần, kèm hai công nhân.
7. Chốt ngày và tải Excel thật: hai dòng công nhân có giờ vào/ra và giờ làm, dấu X riêng từng người, hai dòng ảnh dùng chung.

Camera/GPS được mô phỏng; địa chỉ lấy qua dịch vụ thật. Các thao tác trên có ghi dữ liệu thật vào TEST, không dùng mock API nghiệp vụ. Gói UAT `934b195b-f63e-401c-9567-0235a1ee0028`, phiên `ee62faa2-b743-4b10-883c-6d71b25fc6af`. Mật khẩu và thông tin đăng nhập chỉ nằm trong file riêng bị Git bỏ qua. Bằng chứng nằm tại `test-results/attendance-operational-20261110/`, không đưa ảnh hoặc Excel thử nghiệm lên repository công khai.

Các test tập trung cho rào môi trường test, quyền tài khoản, tải phiên và Excel đã qua. Kiểm tra kiểu dữ liệu và lint các file thay đổi đã qua. Quy tắc không xuất bản nháp được bổ sung sau lượt UAT và có test riêng. Bản tiếp theo chỉ bổ sung các sửa bố cục và quy tắc này; kết quả kiểm tra cuối lưu trong `visual-report.json`.

## Phạm vi vận hành

Link TEST: https://ct-noi-bo-test-chau-tuan.vercel.app. Bỏ mã truy cập chỉ khi cả APP_ENV và RELEASE_ENVIRONMENT là test, có cờ server `TEST_TOOLS_PUBLIC_ACCESS=true`, cấu hình database riêng hợp lệ và marker sở hữu TEST trong database. API chọn tài khoản vẫn chỉ chấp nhận tài khoản mẫu được quản lý. Production không được bật cơ chế này.

Đã xác minh luồng tạo tài khoản và chấm công trên TEST; chưa xác nhận camera/GPS trên điện thoại thực địa. Production vẫn là deployment cũ, chưa được nâng cấp hoặc dọn dữ liệu vì quyền SQL còn trả 403 ở lần kiểm tra ngày 10/11. Chưa kết luận production sẵn sàng sử dụng thật.
