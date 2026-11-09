# Rà soát trải nghiệm Châu Tuấn — 04/11/2026

## Phạm vi

Chuẩn hóa giao diện các phân hệ đang có. Giữ màu xanh, logo, phông Inter và cấu hình nhận diện hiện hành. Không mở lại kế hoạch bổ sung kế toán đã dừng. Admin chỉ quản trị; đổi mật khẩu phải truy cập được ngay cả khi không có hồ sơ nhân sự.

## Tài liệu tham khảo

Đây là ghi chú áp dụng vào sản phẩm, không phải bản sao giao diện hay tài liệu của nhà cung cấp.

| Nguồn chính thức | Điều tham khảo | Áp dụng trong web |
| --- | --- | --- |
| [MISA AMIS CRM — Tùy chỉnh màn hình danh sách](https://helpcrm.misa.vn/kb/tuy-chinh-giao-dien/) | Bộ lọc, cột hiển thị, giao diện danh sách phục vụ tác vụ thường xuyên | Tìm kiếm ở vị trí ổn định; bộ lọc dài thu vào một bảng; giữ giá trị và form gốc khi áp dụng |
| [MISA AMIS — Tùy chỉnh cột](https://helpamis.misa.vn/kb/tuy-chinh-cot/) | Người dùng chọn thông tin cần nhìn trên danh sách | Danh sách ưu tiên danh tính, trạng thái, dữ liệu cần xử lý; thông tin phụ mở khi cần trên điện thoại |
| [Odoo 19 — Views](https://www.odoo.com/documentation/19.0/applications/studio/views.html) | Phân biệt danh sách nhiều bản ghi, biểu mẫu một bản ghi, thẻ trên mobile | Desktop/tablet giữ bảng để so sánh; điện thoại dùng bản ghi gọn; cùng nguồn dữ liệu và quyền |
| [Odoo 18 — Search, filter, and group records](https://www.odoo.com/documentation/18.0/applications/essentials/search.html) | Tìm kiếm và lọc tập trung phía trên dữ liệu | Chuẩn chung cho thanh tìm kiếm/lọc; không thêm cơ chế lọc riêng cho mỗi màn |
| [Microsoft Fluent 2 — Toolbar](https://fluent2.microsoft.design/components/web/react/core/toolbar/usage) | Nhãn công cụ ngắn, nhóm thao tác rõ | Một thao tác chính theo ngữ cảnh; nhãn ngắn; thao tác phụ có vị trí và kích thước nhất quán |

Tài liệu Odoo 18 ở trên được dùng cho nguyên tắc tìm kiếm/lọc; không suy diễn đây là thông số phiên bản 19. Các quy tắc cụ thể dưới đây là quyết định thiết kế cho Châu Tuấn.

## Các vấn đề đã xử lý

| Vấn đề | Thay đổi chung |
| --- | --- |
| Chữ, bo góc và khoảng cách bị ghi đè nhiều lần | Gom giá trị type/shape/motion về `tokens.css`; gỡ các ghi đè xung đột; cập nhật master thay cho định hướng glass cũ |
| Bảng desktop tự đổi sang thẻ khi mở vùng hẹp | `DataTable` chỉ chuyển sang bản ghi trên phone; desktop cuộn bên trong bảng và vẫn dùng được bàn phím |
| Thanh lọc dài chiếm nhiều hàng | `FilterBar` gom hơn hai bộ lọc vào `FilterSheet`; tìm kiếm vẫn hiện; label được hiển thị trong sheet |
| Nhiều tiêu đề và số lượng lặp | Danh sách nhân viên chỉ giữ tiêu đề chính, số nhân viên và phân trang |
| Lưới ứng dụng chiếm đầu tổng quan | Thu gọn phía dưới; ưu tiên số liệu và việc cần xử lý trước biểu đồ |
| Mỗi phân hệ tự dựng bảng và giao diện mobile | Chuyển số dư phép, loại nghỉ, tiền phép cuối năm và lịch đóng BHXH sang `DataTable`; giữ trường dữ liệu, quyền và thao tác hiện có |
| Chi tiết gói tự dựng tiêu đề | Dùng `EntityContextHeader`, giữ chọn công trường và hành động theo quyền |
| Mobile có thẻ cao, nhiều khung và bóng riêng | Gộp thông tin phụ/thao tác vào hàng gọn; bỏ bóng, bo góc và nền inset riêng của nhân viên |
| Admin thấy hành động nhân sự cá nhân | Tính quyền theo vai trò `admin`; giữ quản trị công và liên kết nhân sự, lọc các quyền HR cá nhân khỏi quyền hiệu lực |
| Đổi mật khẩu phụ thuộc hồ sơ nhân sự | Menu tài khoản có link `/profile/password`; card tài khoản luôn có trên hồ sơ; form có xác nhận, xử lý mất mạng và chống gửi trùng |

Đã gỡ 163 nhóm CSS không còn dùng sau khi chuyển về bảng chung. Các bảng gốc còn lại phục vụ bảng công ma trận, điểm danh công trường, bảng số liệu biểu đồ và công cụ chuyển tài khoản kiểm thử; chúng được audit riêng theo mục đích.

## Quy ước cho mọi màn hình

- Một tiêu đề chính, một hành động chính theo ngữ cảnh. Chỉ hiển thị nhãn, trạng thái và dữ liệu cần thao tác.
- Danh sách: tiêu đề và thao tác → tìm kiếm/lọc → dữ liệu → phân trang. Bộ lọc không làm mất tìm kiếm, trang và giá trị form khi đóng/mở.
- Chi tiết: mã/tên/trạng thái → tab → nội dung → thao tác. Tab dùng cùng dấu chỉ mục đang chọn.
- Biểu mẫu: nhãn rõ, nhóm trường theo tác vụ, lỗi cạnh trường, Hủy/Lưu ổn định. Không thay trình tự nghiệp vụ chỉ để giống mẫu.
- Chờ tải/rỗng/lỗi/không có quyền dùng thành phần chung; lỗi có đường thử lại. Không tạo dữ liệu giả để lấp chỗ trống.
- Desktop: tiêu đề 22px, toolbar 36px, form 44px. Phone: tiêu đề 20px, chạm tối thiểu 44px, input 16px để tránh tự zoom.
- Bo góc: control 6px, card 8px, overlay 12px. Logo, màu thương hiệu và màu trạng thái giữ theo cấu hình hiện hành.
- Quyền truy cập theo tài khoản, không theo kích thước màn hình. Admin không có luồng chấm công cá nhân; quyền kiểm tra và quản lý công vẫn giữ.

## Kiểm chứng và giới hạn

- Audit mã nguồn: 189 route đăng nhập, 198 page toàn dự án; kiểm tra thành phần dùng chung, chủ sở hữu màn hình và bảng chuyên biệt.
- 36 lượt đọc trực tiếp: 12 màn × 1440/768/390px, không tràn ngang toàn trang hoặc hiện lỗi tải. Bao gồm nhân viên, tạo hồ sơ, gói/công trường, kho, lô hàng, lương, phê duyệt, quản trị, tài khoản và cá nhân.
- Ảnh và số đo: `.tmp/ui-system-baseline`, `.tmp/ui-system-after`, `.tmp/ui-system-coverage`. Các ảnh trung gian có thể phản ánh trạng thái trước bước chỉnh cuối.
- Kiểm thử hành vi bao gồm form lọc qua portal, xác nhận mật khẩu, mất mạng/gửi trùng, quyền admin, điều hướng và các luồng tính/sửa đơn giá hiện có.
- Kiểm tra cuối: 9 nhóm tương tác đạt; 6 màn dùng chung được kiểm tra thêm ở 1440/768/390/320px, bao gồm mở thông tin phụ trên phone và Escape trong bộ lọc lồng nhau. Kết quả: `.tmp/ui-system-final/report.json`.
- Bản production local: dashboard, nhân viên và đổi mật khẩu đạt ở 1440/390px; không có lỗi JavaScript hoặc tràn ngang. Kết quả: `.tmp/ui-system-final/production.json`.
- Kiểm thử cuối chạy sau build: 1.048 test đạt, 37 test opt-in bỏ qua, 0 lỗi; lint 0 lỗi/0 cảnh báo; build review và TypeScript đạt, không có lỗi đọc cấu hình hệ thống. Kết quả: `.tmp/ui-system-tests-final.json`, `.tmp/ui-system-lint-final.json`, `.tmp/ui-system-build-complete.log`.

Audit tĩnh không chứng minh đã duyệt trực quan từng bản ghi của toàn bộ 189 route. Kiểm tra này không ghi giao dịch nghiệp vụ hoặc đổi mật khẩu admin thật. Kiểm thử vận hành đầy đủ với mọi vai trò và dữ liệu thực tế vẫn là phạm vi UAT riêng. Các thay đổi trong workspace chưa đồng nghĩa đã triển khai lên Vercel.
