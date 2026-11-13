# Sửa vận hành Gói / Công trường — 13/11/2026

Người dùng phản hồi production còn lỗi sau khôi phục, yêu cầu sửa trực tiếp cả đường dẫn, sửa/xóa gói và luồng giám sát. Bản sửa này thay thế kết luận chỉ khôi phục production trong biên bản recovery trước.

## Nguyên nhân

- Link tên gói và thao tác mở cả dòng dùng hai cách xác định trang đích. Trang quản lý còn dùng danh mục chỉ có `attendance`, nên gọi `notFound()` với `today` dù người dùng là Admin.
- Production chưa nhận phần sửa/xóa gói ở TEST. Năm gói thiếu công trường; giám sát không có phân công nên bị loại khỏi danh sách.
- Danh sách công nhân chỉ lấy người đã gán vào gói; luồng chọn công nhân lại cấm thêm hồ sơ mới và nút tiếp tục bị khóa khi danh sách rỗng.

## Hành vi đã sửa

- Dùng chung một đường dẫn cho tên gói và mở dòng. Admin có thể mở/tải lại `today`, `progress`, `team`, `materials`, `profile`, `documents`.
- Hiện sửa/xóa ngay trong danh sách và đầu trang gói, dùng nhóm nút ngang có vùng bấm 44px. Xóa mềm giữ lịch sử; quyền quản lý và kiểm tra phiên bản vẫn được thực thi ở API.
- Giám sát thấy gói đang chuẩn bị/đang thực hiện mà không cần được phân công hoặc duyệt gói. Gói tạm dừng/kết thúc/đã đóng/đã xóa không nhận lượt mới. Ngày bắt đầu hiệu lực công trường vẫn được giữ.
- Mỗi gói có công trường ban đầu trong giao dịch tạo gói; production được bổ sung đúng 5 công trường theo tên của 5 gói hiện có, không đổi gói, tài khoản, phân công hay dữ liệu công.
- Giám sát chọn gói → chọn cảng → chọn công nhân. Danh sách gồm công nhân đang làm việc/thử việc/chờ hoàn thiện hồ sơ, không bắt buộc gán trước vào gói. Chỉ lấy mã/tên hồ sơ công nhân. Nghỉ phép đã duyệt vẫn được giữ.
- Có thể thêm công nhân từ bước chọn người và bắt đầu gói chưa có công nhân để nhập hồ sơ. Giữ yêu cầu chấm công cá nhân trước điểm danh tập thể theo nghiệp vụ hiện có; không yêu cầu phê duyệt gói.
- TEST tiếp tục chỉ cho giám sát đăng nhập; không mở thêm Admin/Nhân sự trên TEST public.

## Triển khai và kiểm chứng

- Production: `dpl_HuNCdxRwjtgbGXuhYUj5862x5LCr`, https://ct-noi-bo.vercel.app, database `uioywupuuestcaliawlc`.
- TEST: `dpl_HSDS7TPwvKx9aGnXhbaEcFG9DiMX`, database riêng `lgmlkagcytfjazulgfbz`.
- Cùng SHA nguồn `6a18ee8ca8f3b9b04596097c6d68204278bcfa0716c443b407ca96579d1de3df`, hai build môi trường riêng; không promote TEST lên production.
- Migration 202611130001–2 đã diễn tập rollback rồi áp dụng production. Giữ nguyên 24 hồ sơ, 6 tài khoản và toàn bộ số lượt công tại thời điểm áp dụng; công trường tăng 0→5. Digest gói và phân công giữ nguyên. Không tạo tài khoản TEST hay điểm danh giả trên production.
- Build webpack, TypeScript và 1.399 test đạt; 37 bỏ qua. Kiểm tra 74 migration có thứ tự. Lint phần sửa không có lỗi; cảnh báo điều hướng bản nháp offline đã có từ trước.
- Browser TEST 320/390/1440px kiểm tra link tên gói, reload trực tiếp, sửa từ form và giám sát vào điểm danh từ gói. API TEST thực kiểm tra gói chuẩn bị chưa có phân công vẫn tạo lượt/chọn cảng, có danh sách công nhân và thêm công nhân mới. Đã dọn đúng lượt và hồ sơ công nhân QA vừa tạo, xóa mềm gói QA.
- Browser production dùng phiên xác minh ngắn hạn của Admin/Giám sát hiện có, không gửi email hoặc đổi mật khẩu. Admin mở link tên/reload và form sửa/xóa thành công. Giám sát thấy đủ 5 gói, 10 lựa chọn gói/cảng và 18 công nhân; chọn cảng thành công. Chặn toàn bộ ghi nghiệp vụ trong bài kiểm tra. Không lỗi runtime. Đã xóa phiên xác minh và đăng xuất riêng các phiên đó.

Bằng chứng: `test-results/package-fix-20261113/`.
