# Sửa hiển thị gói và bắt buộc vị trí chính xác — 13/11/2026

## Yêu cầu

Người dùng phản hồi Admin gặp màn lỗi trong gói, thanh Tiếp tục che nội dung giám sát và có trường hợp chấm công không yêu cầu quyền vị trí. Yêu cầu tiếp tục sửa và triển khai lên production/TEST; TEST vẫn chỉ cho giám sát đăng nhập.

## Thay đổi

- Log production xác định digest `2273819883` là `AppError NOT_FOUND` khi mở gói `e6fbeb84-d788-42be-989c-2648cf7a5ba7`. Các đường dẫn gói không tồn tại/đã xóa/ngoài phạm vi nay chuyển về danh sách gói thay vì rơi vào error boundary.
- Chi tiết gói đọc summary trực tiếp từ bản ghi đã tải và các công trường/phân công tương ứng, không đọc lại toàn bộ danh sách để tìm cùng gói. Lỗi truy vấn được phân biệt với trường hợp bản ghi không còn tồn tại.
- Thanh chọn gói/Tiếp tục và thao tác ở các bước điểm danh chuyển sang bố cục thường, không sticky/fixed, không che thẻ gói hay dữ liệu trên điện thoại.
- Geolocation yêu cầu `enableHighAccuracy: true`, `maximumAge: 0`, chỉ nhận tọa độ hữu hạn, hợp lệ và mới. Chờ GPS cải thiện trong tối đa 35 giây; không chuyển sang chế độ sai số thấp rồi tự nhận kết quả IP/mạng thô.
- Sai số tối đa 100 m, hoặc ngưỡng chặt hơn của công trường/chính sách. Sai số do thiết bị báo, không phải cam kết vị trí tuyệt đối của phần cứng. Không thay tọa độ thực bằng tọa độ công trường.
- Trang ảnh công nhân tự gọi Geolocation khi mở, có thao tác Cho phép định vị/Lấy lại vị trí. Thiếu quyền hoặc GPS chưa đạt ngưỡng thì chặn chụp ảnh điểm danh. Lỗi lấy GPS xóa vị trí cũ khỏi nháp hiện tại.
- Chấm công cá nhân không đóng dấu/xếp hàng/gửi ảnh nếu thiếu vị trí mới hoặc sai số quá cao. API chấm công cá nhân và API tải ảnh công nhân đều kiểm tra GPS độc lập với giao diện.
- Gửi phiên công nhân yêu cầu GPS đủ chính xác; các ảnh thiếu GPS của nháp cũ không được tính vào số minh chứng hợp lệ. Có thể chụp thêm ảnh hợp lệ để hoàn tất, không xóa lịch sử ảnh cũ. Thời điểm ảnh vẫn được giữ khi chờ GPS.
- Không thay đổi hồ sơ, tài khoản, quyền nghiệp vụ, ca làm, dữ liệu công lịch sử hoặc chính sách chỉ giám sát đăng nhập TEST. Không chạy migration cho bản sửa này.

## Quyền trình duyệt

Web chỉ có thể gọi API xin vị trí, không tự cấp quyền hoặc buộc trình duyệt hỏi lại nếu quyền đã được lưu. Quyền chưa quyết định sẽ được trình duyệt hỏi khi API được gọi; quyền bị chặn phải được người dùng bật lại trong cài đặt trang. HTTPS và Permissions-Policy `geolocation=(self)` vẫn được giữ. Cần bật định vị chính xác ở thiết bị nếu thiết bị chỉ cung cấp vị trí gần đúng.

Tham chiếu: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition

## Kiểm chứng và triển khai

- Build webpack/TypeScript và lint phần sửa đạt. Bộ test đầy đủ: 1.407 đạt, 37 bỏ qua. Kiểm tra tập trung sau sửa cuối: 74 đạt.
- Browser trên bản build TEST: Admin mở gói rồi xóa và tải lại đường dẫn cũ được về danh sách; giám sát 390/1440px không bị thanh thao tác đè nội dung.
- Kiểm tra Geolocation mô phỏng trên Chromium: sai số 12 m bật chụp; quyền bị từ chối và sai số 5.000 m đều chặn chụp. Mọi yêu cầu sử dụng high accuracy và không dùng tọa độ cache. API thực trên TEST trả 422 với thiếu GPS và sai số 20.000 m, không tạo lượt công.
- Kiểm tra mô phỏng không thay thế thử GPS/camera vật lý trên điện thoại người dùng.
- Production: `dpl_8gwcXoW88zT6SaCFavifXCgaGyKY`, database `uioywupuuestcaliawlc`.
- TEST: `dpl_75waFZ6n8VDqjvrdRhPjrYp6PUQA`, database riêng `lgmlkagcytfjazulgfbz`.
- Cùng SHA nguồn `fe7c0a75f9bae37d1a41bad237aeaa415d600873bfcdba28940bed9582773965`, hai build riêng theo môi trường, không promote TEST lên production.

Bằng chứng: `test-results/gps-display-20261113/`.
# Cập nhật thay thế

Quy định chặn lưu/gửi khi GPS thiếu hoặc sai số lớn trong đợt này đã được thay thế bởi [nghiệp vụ ngoại tuyến](./mobile-attendance-20261113.md). Giữ nội dung bên dưới làm lịch sử phát hành, không dùng làm yêu cầu hiện hành.

