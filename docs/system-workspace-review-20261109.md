# Tổ chức chức năng toàn hệ thống — 09/11/2026

Phản hồi của người dùng nói về sự hữu ích, vị trí và thứ tự các thành phần trong chức năng, cùng tính nhất quán khi chuyển phân hệ. Những lần chỉ sửa màn bảng lương trước đó chưa xử lý đúng phạm vi.

## Phạm vi và phát hiện

`node scripts/ui-workspace-audit.mjs --write` lập danh mục 190 route trong vùng đăng nhập và 171 tệp giao diện nghiệp vụ. Đây là kiểm kê mã nguồn; không đồng nghĩa đã thao tác trực tiếp trên 190 route.

- Dùng chung nút/màu/bảng nhưng từng chức năng tự đặt toolbar, số liệu, bộ lọc và footer.
- Kỳ lương và phiếu lương có thẻ thống kê đồng thời là bộ lọc, rồi lặp lại bằng bộ chọn trạng thái. Lô hàng có ba thẻ liên kết tới dữ liệu đã có trong tab.
- Số liệu Dashboard đứng trước việc cần làm. Theo dõi dự án và kho chia nhiều vùng ngang hàng, thu hẹp bảng chính.
- Hồ sơ nhân viên và lô hàng chia nhiều thẻ cùng độ nổi bật; nhận diện, nội dung đọc và chức năng chỉnh sửa chưa có thứ tự rõ.
- Các audit cũ xác nhận component/token/placeholder, chưa chứng minh người dùng biết thao tác tiếp theo.

## Bản đồ công việc

| Luồng | Việc chính | Điểm chuyển tiếp / thông tin phụ |
| --- | --- | --- |
| Nhân sự | Danh sách → hồ sơ → nhóm dữ liệu cần đọc/sửa; hợp đồng, bảo hiểm theo người | Đánh giá hoàn thiện sau dữ liệu hồ sơ; giữ kiểm tra quyền và che dữ liệu nhạy cảm |
| Công → lương | HR rà công/ngày, ngoại lệ → chốt kỳ → kế toán đối chiếu, duyệt → gửi phiếu | Công là nguồn; chưa có dòng lương thì không hiển thị tổng tiền giả; phát hành khác với gửi thành công |
| Điểm danh | Giám sát chọn gói → chọn người → ảnh → an toàn → gửi | HR quản lý danh mục/người trong gói; giữ bản nháp và luân chuyển đã triển khai |
| Công trường | Danh sách gói / tiến độ → mở đúng gói, vật tư hoặc vấn đề | Vấn đề mở theo yêu cầu; lịch sử cập nhật là thông tin bổ sung |
| Kho | Chọn chứng từ chờ, tồn cần bổ sung hoặc kiểm kê → bản ghi thật | Một lệnh tạo phiếu theo quyền; lịch sử giao dịch mở khi cần |
| Xuất nhập khẩu | Danh sách → một nhận diện lô → hàng/container/chứng từ/thông quan/nhận hàng | Lịch trình thuộc cùng hồ sơ; giữ bản nháp khi chuyển mục |
| Phê duyệt / tài liệu | Tìm yêu cầu hoặc hồ sơ → bản ghi thật | Preview chỉ khi chọn; giữ luồng quyết định và quyền hiện có |
| Quản trị / thiết lập | Chọn danh mục → biểu mẫu cấu hình đã nhóm | Không thêm giải thích kỹ thuật vào nhãn chức năng |

## Cấu trúc chung và triển khai

`PageLayouts.tsx` sở hữu `ListWorkspace`: điều hướng trong chức năng → tổng hợp cần thiết → bộ lọc → trạng thái kết quả → dữ liệu thao tác → footer. Chức năng cung cấp slot, dữ liệu, quyền và callback. Không tự dựng lại cấu trúc hoặc thêm thẻ số liệu để lặp cùng chức năng lọc.

`WorkspaceMetrics` đặt số liệu trong cùng vùng làm việc, khai báo rõ chỉ số chính. `RecordHeader` sở hữu một nhận diện, trạng thái, hành động và tab hồ sơ. `RecordSheet` / `RecordSection` nhóm dữ liệu liên tục. `SecondarySection` giữ lịch sử/công cụ bổ sung. Hình học ở `erp-components.css`, màu và kích thước ở token.

- 26 vùng danh sách nghiệp vụ thuộc 10 nhóm tính năng đã chuyển sang `ListWorkspace`: nhân sự/hợp đồng/BHXH, công/kỳ công/ngoại lệ, lịch sử điểm danh, công trường/vật tư, kho, xuất nhập khẩu, lương và tài liệu. Mẫu phát triển cũng dùng cấu trúc thật.
- Kỳ lương và phiếu lương dùng một bộ lọc trạng thái. Chuyển trạng thái kỳ lương giữ năm; số đếm khớp phạm vi tìm kiếm/năm.
- Dashboard đưa hàng đợi lên trước; số liệu và biểu đồ mở bổ sung. Cá nhân/giám sát giữ hành động chính theo vai trò.
- Theo dõi dự án dùng bảng rộng; vấn đề mở drawer với liên kết bản ghi thật. Kho gom việc trong một vùng chuyển nhóm; tạo phiếu nằm ở đầu trang và lọc đúng quyền.
- Hồ sơ nhân viên và lô hàng dùng nhóm dữ liệu trên một bề mặt. Lô hàng có một nhận diện và một điều hướng; chỉnh trạng thái mở khi cần.
- Bộ đếm bộ lọc không coi Select có giá trị `all` là một tiêu chí đang lọc.
- Gỡ các quy tắc CSS riêng không còn được dùng sau khi chuyển cấu trúc. Trạng thái chưa có cập nhật không bị tô thành cảnh báo quá hạn khi dữ liệu không đánh dấu cần cập nhật.

## Ngoại lệ có mục đích

Duyệt ảnh chấm công cần danh sách người và ảnh đang xem; lịch cần ngày đang chọn; chứng từ cần dòng hàng/tồn/nút lưu và ghi sổ; wizard điểm danh cần đúng thứ tự gói/người/ảnh/an toàn. Không ép các luồng này thành cùng một bảng. Giữ quyền, số liệu, kiểm tra duyệt, phiên bản và đồng bộ.

## Kiểm chứng và giới hạn

Ảnh/báo cáo ở `test-results/system-workspace-audit/` dùng component thật, shell thật và API/dữ liệu mẫu cục bộ. Đây là kiểm tra tổ chức thông tin và tương tác, không phải kiểm tra dữ liệu riêng tư trên máy chủ.

- Toàn bộ Vitest: 195 tệp, 1.179 kiểm tra đạt, 37 bỏ qua, không có lỗi.
- ESLint 34 tệp nguồn/kiểm tra thay đổi đạt; kiểm tra kiến trúc, screen contract và workspace inventory đạt.
- TypeScript và build Next webpack đạt; build hoàn tất 292 trang. Log prerender vẫn có `system_settings.read_failed` và dùng cấu hình dự phòng như môi trường trước đợt sửa này.
- Playwright/Edge: 52 trường hợp (13 màn × 1440/390/320/1920 px), không lỗi JavaScript, không tràn ngang toàn trang; một tiêu đề chính và tối đa một hành động chính ở đầu mỗi màn.
- Tương tác trình duyệt: tìm dự án, mở đúng vấn đề/giữ tiêu chí, chuyển việc kho và lệnh tạo, tìm/lọc kỳ lương, theo dõi phiếu, lọc việc Dashboard, mở số liệu bổ sung, bộ lọc điện thoại và Escape.
- Bản so sánh nhiều phân hệ: `test-results/system-workspace-audit/review.html`; dữ liệu mẫu có thể xem qua server cục bộ cổng 5278. Ứng dụng build thật ở cổng 3003 vẫn yêu cầu đăng nhập bình thường; health trả 200, trình duyệt chưa đăng nhập chuyển đúng về login và không lỗi JavaScript.

Không push, triển khai hoặc thay schema cơ sở dữ liệu.
