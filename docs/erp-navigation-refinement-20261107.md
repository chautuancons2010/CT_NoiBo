# Điều hướng gọn theo nhóm — 07/11/2026

Phản hồi của người dùng tập trung vào thanh bên dài, nhiều mục đồng cấp. Giữ bảng màu, chiều rộng 240/80 px và các route hiện có; đổi cách tổ chức chức năng trong thanh bên.

## Quy tắc

- Nhân sự có bốn vùng: Hồ sơ nhân sự, Công & nghỉ phép, Danh mục, Thiết lập. Kho có ba vùng; xuất nhập khẩu có ba vùng. Các module có ít mục giữ liên kết trực tiếp.
- Mỗi lần chỉ mở một nhóm. Route hiện tại quyết định nhóm mở khi chuyển trang, kể cả trang tạo/chi tiết. Liên kết danh sách gần nhất thể hiện trạng thái đang dùng.
- Nhóm chỉ có một chức năng được phép sử dụng hiển thị thẳng liên kết, không thêm một lần mở nhóm.
- Thu nhỏ thanh bên còn biểu tượng nhóm; menu chức năng hỗ trợ phím mũi tên và Escape, trả focus về nút mở.
- Không lặp danh sách ứng dụng bên dưới chức năng. Bộ chuyển ứng dụng trên header giữ nguyên quyền và đường dẫn thật. Menu điện thoại giữ toàn bộ chức năng được cấp quyền.
- `moduleRegistry.ts` sở hữu nhóm/biểu tượng và lọc quyền trước khi hiển thị. `AppRail` sở hữu trạng thái mở nhóm; `ApplicationChrome.module.css` sở hữu bố cục; token sở hữu chiều cao hàng và khoảng thụt. Không thêm stylesheet vá.

## Kiểm chứng

- 44 test về điều hướng, phân quyền, deep link, nhóm rút gọn và bàn phím đạt; lint, build tối ưu và audit kiến trúc UI đạt.
- Đối chiếu bản cũ ở trang Phòng ban: chiều dài nội dung điều hướng 1.066 px, vượt vùng hiển thị 780 px tại viewport 1440 × 900.
- Lượt kiểm tra trình duyệt đạt 46 kiểm tra trên 11 màn hình: 1440/1365/1024/768 px, mở nhóm bằng bàn phím, route hiện tại, menu thu nhỏ, Escape trả focus, chuyển ứng dụng từ header và khả năng mở chức năng trên điện thoại 390 px. Không lỗi JavaScript, lỗi đọc API hoặc yêu cầu ghi nghiệp vụ.
- Bản cuối rút nhãn nhóm kho về “Danh mục” để giữ một dòng. Kiểm tra lại 14 ca ở cổng riêng và 14 ca trên localhost:3000 đều đạt. Bản mới chạy ở slot `.next-review`; giữ `.next-review-next` trước đó để khôi phục. Máy chủ kiểm thử 3002 đã dừng và riêng phiên kiểm thử đã đăng xuất.
- Ảnh và báo cáo trình duyệt nằm trong `.tmp` bị Git bỏ qua. Kiểm tra dùng dữ liệu đọc thật; yêu cầu lưu tùy chọn thu gọn thanh bên chỉ được đáp ứng trong trình duyệt kiểm thử, không gửi tới máy chủ. Không ghi dữ liệu nghiệp vụ.

Chỉ cập nhật CT_NoiBo cục bộ. Không push GitHub, deploy, đổi tài khoản/quyền hoặc schema online.
