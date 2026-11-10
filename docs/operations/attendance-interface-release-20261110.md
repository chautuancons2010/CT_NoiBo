# Chấm công, giao diện ERP và chuẩn bị phát hành — 10/11/2026

## Phạm vi người dùng yêu cầu

- Ưu tiên phần bên trong chấm công và trải nghiệm mobile của Giám sát; giữ nhận diện hiện hành.
- Gỡ nút thu/mở điều hướng bị lặp trên topbar. Nút dưới sidebar là nơi thu/mở; trạng thái thu chỉ còn icon có nhãn truy cập và tooltip.
- Gom xuất công cho nhân sự vào một thao tác theo tháng; bỏ Excel trên từng thẻ phiên.
- Bỏ chuyển cảnh nội dung làm trang giật, giảm khoảng trắng và nút lặp; kiểm tra bằng thao tác người dùng.
- Dọn dữ liệu mẫu production, giữ `admin`. Chỉ đạo mới nhất của chủ hệ thống là bỏ backup và xóa trực tiếp, thay thế xác nhận backup trước đó.

## Thay đổi giao diện và nghiệp vụ

- Cá nhân giữ bố cục của bản production cũ: lời chào, giờ ca, hai ô vào/ra, cụm lịch công–phiếu lương–nghỉ phép và gói công nhân bên dưới. Dùng tông xanh hiện tại, một nút chấm tiếp theo và ảnh gắn với giờ thực tế. Không thay lại các màn tiện ích cá nhân.
- Điều hướng: icon sidebar thu gọn được căn giữa, không tràn ngang hoặc hiện nhãn nhóm trong rail 80px. Topbar chỉ giữ icon Ứng dụng và ngữ cảnh trang, bỏ nút thu sidebar lặp.
- Mobile giữ thanh trên và các đích điều hướng dưới theo vai trò khi chuyển trang; chỉ thay trạng thái đang chọn. Tên trang và đường quay lại nằm trong nội dung. Camera vẫn dùng không gian chụp riêng.
- Công trường: được điểm danh nhiều lượt cùng ngày/ca; gửi lại cùng `client_session_id` vẫn trả đúng lượt cũ. Ràng buộc gửi cho phép lặp cùng công trường và tiếp tục chặn công nhân ở công trường khác trong cùng ca.
- Nhân sự kiểm tra công trường theo ngày; mỗi công trường/ca có một nhóm, đếm công nhân duy nhất và mở các lượt theo thời gian. Bỏ chuyển đổi “Theo phiên/Danh sách”. Đổi ngày xóa minh chứng của ngày cũ ngay lập tức.
- Danh sách ca, gán ca, lịch sử phiên bản và lịch làm việc nằm trong Cấu hình chấm công. Bỏ mục Ca làm độc lập; `/shifts` và `/shifts/calendar` chuyển sang đường dẫn cấu hình tương ứng. Giữ nguyên dữ liệu ca và quyền quản lý.
- Kỳ công: tên kỳ là định danh chính, ngày Việt Nam, trạng thái rõ, mã và phiên bản cùng một dòng phụ; bản mobile không ép bảng desktop hoặc thêm disclosure chỉ để xem phiên bản.
- Giữ dữ liệu khi cập nhật realtime; các tải cùng phạm vi đang chạy được gộp lại. `aria-busy` phản ánh đúng trạng thái tải để screen reader và QA không coi skeleton là màn đã sẵn sàng.
- Bộ TEST gán đúng loại nhân sự Giám sát; văn phòng vẫn tạm ngừng tự chấm theo yêu cầu trước.

## Một file Excel nhân sự

Nút **Xuất bảng công**, chọn **Tháng báo cáo**, tải `Bang_cong_nhan_su_YYYY-MM.xlsx` với tám sheet:

1. Chấm công công trường.
2. Tổng hợp công nhân.
3. Bảng dấu công.
4. Ảnh theo ngày.
5. Báo cáo nhân lực.
6. Công cá nhân.
7. Công sau điều chỉnh.
8. Lịch sử điều chỉnh.

Đọc đủ các trang dữ liệu, không dùng giới hạn 300 lượt của màn nhật ký. Tài khoản cần quyền xuất và quyền xem toàn bộ công cá nhân/công trường. API kiểm tra các module liên quan; giám sát không được tải công toàn công ty. File chỉ lấy tháng đã chọn và không ghi công bản nháp chưa gửi.

Sheet chính có một dòng mỗi công nhân/ngày, tổng hợp và dấu công không cộng trùng các lượt. Các khoảng giờ chồng nhau được gộp, khoảng gián đoạn được giữ, nghỉ theo ca khấu trừ một lần/ngày. Sửa giờ của HR áp dụng vào đúng cặp giờ; thiếu giờ vào/ra vẫn tạo ngoại lệ. Không tự suy diễn tám giờ làm từ dấu có mặt. Sheet minh chứng giữ mã lượt, giờ thực tế từng công nhân và liên kết ảnh; báo cáo nhân lực đếm người duy nhất theo công trường/ngày.

Các liên kết ảnh mở màn nghiệp vụ có kiểm tra quyền, không đưa signed URL hết hạn vào Excel. Escape dữ liệu có thể bị Excel hiểu thành công thức; đóng băng hàng tiêu đề, bộ lọc và định dạng đọc thống nhất.

## Production đã dọn

- Project: `uioywupuuestcaliawlc`, website `ct-noi-bo.vercel.app`.
- Chạy thử bằng rollback trước, sau đó mới commit giao dịch dọn 157 bảng. Giữ schema, FK, trạng thái trigger, RBAC, cấu hình thương hiệu và đúng chuỗi liên kết admin.
- Xóa Auth users khác admin và file Storage bằng API tương ứng, có receipt để tiếp tục nếu một bước gián đoạn.
- Kiểm tra sau cùng: một app account, một Auth user, một employee tối thiểu liên kết admin; không còn lượt chấm, phiên công nhân, dự án, file Storage hoặc app session cũ. Mật khẩu admin không thay đổi. Không xác nhận đã thử đăng nhập bằng mật khẩu admin trong trình duyệt.
- Áp dụng 14 migration thiếu ban đầu và hai migration hỗ trợ nhiều lượt sau rollback rehearsal; production hiện đủ 61 migration local.
- Khởi tạo lại danh mục tổ chức/loại nhân sự, ca ngày và chính sách tối thiểu, không tạo nhân viên, tài khoản hay dữ liệu mẫu.
- TEST `lgmlkagcytfjazulgfbz` giữ marker riêng; thao tác dọn chỉ nhắm production. E2E tiếp tục tạo fixture riêng ở TEST.
- Không có backup đầy đủ được thực hiện: chủ hệ thống đã đổi chỉ đạo thành bỏ backup trước khi chạy.

Tool thực hiện: `production-clear-data.mjs`, `production-prepare-release.mjs` trong `scripts/operations/`. Receipt chi tiết ở `.tmp/production-cleanup/`, bị Git bỏ qua. Công cụ xóa được ghim theo schema trước khi dọn; không dùng lại cho schema mới mà chưa rà soát.

## Minh chứng và trạng thái kiểm tra

- 1.337 unit/integration test qua, 37 test chủ động bỏ qua; 13 kiểm tra operations qua.
- Migration validator kiểm tra 61 migration. Audit route theo contract hiện hành: Inter đủ 400–700, rail 240/80px, control 44px và token bo góc đang sử dụng.
- Build webpack production thành công. Có lần đọc cấu hình quá ngưỡng timeout khi prerender; kiểm tra runtime bản production local và các rào môi trường đã qua.
- QA vai trò HR tải workbook từ nút thật và đối chiếu số lượt với TEST; kiểm tra tám sheet, ngày công trường, sidebar thu/mở, bảng kỳ công 320/390/430/1440px, camera 320/390/430px và ngang 568px. Báo cáo nhiều lượt tại `test-results/interface-finish-20261110/rounds-local/` và `rounds-hosted/`; bộ trải nghiệm chung ở `user-experience.json` và `hosted/user-experience.json`.
- Regression đọc hơn 1.000 lượt, chặn tài khoản chỉ có quyền export, lỗi trang sau phải làm hỏng toàn bộ export thay vì trả file thiếu.
- Report E2E rộng ban đầu có 248 PASS, 10 FAIL, 1 BLOCKED khi sửa trong dev. Đã sửa các kịch bản chọn ca theo lịch hiệu lực, chọn công nhân/xác nhận an toàn, chấm ra sau khi gửi lượt, nhóm điều hướng XNK và locator vùng bảng lương. Các lần kiểm tra lại trên bản hosted được lưu riêng; report cũ vẫn giữ lịch sử lỗi, không đổi thành PASS.
- Kiểm tra thanh công cụ bằng Edge qua 12 trang theo hai vai trò: thứ tự nút trên, chiều cao 56px và các đích dưới ổn định. Bảng ứng dụng giữ đủ lịch công/phiếu lương/nghỉ phép trên cả trang công trường. Minh chứng: `mobile-shell-stability/report.json`.
- Camera và GPS trong QA là mô phỏng; chưa thay thế thử nghiệm điện thoại thực địa.

## Trước khi chuyển production sang ứng dụng mới

- Xác nhận bản TEST đã publish đúng gói nguồn và kiểm tra lại trên URL đó.
- Duy trì việc khóa công cụ TEST trên production; smoke production đã xác minh các endpoint TEST trả 404 và trang login không có picker.
- Lịch giữ ảnh 45 ngày cần cấu hình secret trong Vault khớp `OPERATIONS_CRON_SECRET`, URL production và chỉ kích hoạt sau khi endpoint của bản mới đã deploy. Mẫu SQL: `scripts/operations/attendance-evidence-retention.sql`; URL mẫu hiện trỏ TEST, phải đổi đúng đích khi dùng cho production.
- Chưa đổi deployment ứng dụng production trong lượt chuẩn bị này.
