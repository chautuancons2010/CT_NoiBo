# Hoàn thiện thao tác bên trong ERP — 06/11/2026

Phạm vi: CT_NoiBo tại localhost:3000. Người dùng đã đồng ý phần nhìn, yêu cầu hoàn thiện cách sử dụng bên trong. Lượt này giữ bảng màu và khung giao diện đã duyệt; thay đổi cấu trúc thao tác dùng chung và áp dụng vào tìm/lọc nhân viên cùng bốn loại chứng từ kho.

## Thay đổi

- Tìm nhân viên: nút Tìm nằm cạnh ô tìm kiếm; tiêu chí nâng cao nằm trong Bộ lọc với nhãn rõ ràng. Điều kiện đã áp dụng hiển thị riêng và có thể bỏ từng điều kiện. Bỏ một điều kiện giữ các điều kiện còn lại và cỡ trang, đưa về trang 1. Đặt lại trong bảng lọc chỉ đổi bản nháp cho đến khi Áp dụng. Không có kết quả phù hợp được phân biệt với danh sách chưa có dữ liệu.
- Nhập, xuất, chuyển và điều chỉnh kho: thông tin bắt buộc → hàng hóa → phân bổ/giao nhận/ghi chú. Loại giao dịch yêu cầu dự án luôn hiển thị trường dự án bắt buộc trong nhóm chính. Thông tin tùy chọn không chiếm vùng nhập hàng ban đầu.
- Các dòng hàng dùng `EditableLines` và `EditableLine`: cột nhập gọn trên desktop, nhãn đầy đủ trên điện thoại. Đơn giá nằm trực tiếp cùng số lượng và đơn vị; tham chiếu/mục đích/ghi chú dòng vẫn có trong phần chi tiết. Giữ cơ chế chọn hàng, đơn vị cơ sở và tránh chọn trùng từ trước.
- `DocumentActions` giữ nút lưu/ghi sổ trong tầm nhìn và trong đúng form. Tải lại khi đang có thay đổi cần xác nhận; hủy xác nhận giữ các giá trị. Có cảnh báo trình duyệt khi đóng/tải lại trang đang có dữ liệu chưa lưu. Điều này không xác nhận có bộ chặn chuyển route cho mọi form ERP.
- Thẻ bản ghi điện thoại có một dữ kiện phụ được trình bày gọn trên một dòng; thông tin mở rộng và thao tác vẫn truy cập được.

## Quyền sở hữu

`src/styles/tokens.css` giữ kích thước cột phụ và độ nổi của thanh lưu. `erp-components.css` sở hữu hình học của bộ lọc, dòng nhập và thanh thao tác; `Workbench.tsx` sở hữu cấu trúc tái sử dụng. Không thêm stylesheet hoàn thiện rời rạc. Feature giữ dữ liệu và handler nghiệp vụ.

Payload tạo/sửa, CAS, idempotency, kiểm tra tồn, trạng thái chứng từ, quyền và endpoint hiện hành được giữ. Không thay schema, quyền tài khoản, dữ liệu thật hoặc mật khẩu. Không push GitHub, không deploy.

## Kiểm chứng

- Toàn bộ Vitest: 179 file đạt, 1 file bỏ qua; 1.084 kiểm thử đạt, 37 bỏ qua. Các kiểm tra mới bao phủ giữ số lượng thập phân/đơn giá/đơn vị/tham chiếu khi lưu nháp, giữ dữ liệu khi hủy tải lại, thêm/xóa dòng và trường dự án bắt buộc. Sau chỉnh nhãn kết quả trống, 3 kiểm thử danh sách nhân viên được chạy lại và đạt.
- Typecheck và lint các tệp TypeScript thay đổi đạt. Build production cô lập từ toàn bộ mã hiện hành đạt; 1.228 tệp nguồn khớp với cây làm việc khi kiểm chứng.
- Trình duyệt trên bản build cục bộ: 27 trạng thái ở 1440, 768 và 390 px; tìm/lọc/bỏ điều kiện, nhập bốn loại chứng từ, thêm/xóa dòng, hủy và xác nhận tải lại, kiểm tra vị trí thanh lưu và tràn trang. Không ghi nhận lỗi JavaScript hoặc API nghiệp vụ, không có thao tác ghi nghiệp vụ.
- Dropdown hàng hóa được kiểm tra thêm với danh mục thật tại 1440 và 390 px: menu nằm trong màn hình, đơn vị khớp danh mục, số lượng đã nhập được giữ và hàng đã chọn không xuất hiện ở dòng mới. Không lưu chứng từ trong kiểm tra này.
- Vị trí dòng nhập đầu của phiếu nhập ở lượt đo cuối: y=554 tại 1440 px và y=540 tại 390 px. Đây là số đo bố cục trên máy kiểm tra, không phải cam kết hiệu năng hoặc kiểm chứng toàn bộ module ERP.
- Lượt kiểm tra dev được đồng bộ theo thời điểm component gắn điều khiển tương tác. Bản build production là cơ sở chấp nhận cuối. Ảnh chứa dữ liệu thật và storage phiên chỉ nằm ở thư mục tạm ngoài repo CT_NoiBo.

Các giới hạn hạ tầng gửi phiếu lương từ lượt trước vẫn giữ nguyên; xem `erp-ui-refinement-20261106.md`. Lượt này không xác nhận phát hành toàn bộ ERP hoặc nghiệm thu đủ 82 nghiệp vụ.
