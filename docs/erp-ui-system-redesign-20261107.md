# Đồng bộ giao diện ERP — 07/11/2026

Phạm vi: CT_NoiBo trên localhost. Lượt này áp dụng theo mẫu màn hình và thành phần dùng chung trên toàn không gian ERP, thay vì phát hành từng nhóm trang nhỏ. Giữ bảng màu sáng đã được người dùng đồng ý, thương hiệu cấu hình, đăng nhập, dữ liệu, quyền và các ràng buộc nghiệp vụ.

## Chủ sở hữu thiết kế

| Phạm vi | Chủ sở hữu |
| --- | --- |
| Bảng màu, kích thước, khoảng cách, độ rộng nhận diện bản ghi | `tokens.css` và cấu hình thương hiệu |
| Form chia nhóm, form trong trang, vùng trường, thanh tác vụ | `SectionedForm`, `InlineForm`, `FormFields`, `FieldGroup`, `FormActions` trong `FormLayout.tsx` |
| Bề mặt, bảng, bộ lọc, trạng thái, hình học form và footer | `erp-components.css` |
| Skeleton theo số cột bảng | `LoadingExperience.tsx` và CSS Module hiện có |
| Bố cục trang tích hợp và danh mục cấu hình | CSS Module của từng feature, dùng token chung |
| Dòng hàng, số lượng và thao tác chứng từ | `EditableLines`, `EditableLine`, `DocumentActions` hiện có |

Không thêm finishing stylesheet hoặc màu trang riêng. Layout form cũ được thay tại component; các class nghiệp vụ cần cho phần con được giữ. Chuyển tiếp ref tới form và input tệp thật để không làm mất validation, FormData, reset hoặc các handler tải tệp hiện có.

## Thay đổi trên các nhóm màn hình

- Chuẩn hóa 32 form trong overlay trên nhân sự, công/lương, dự án, kho và điểm danh. Tách vùng trường khỏi footer để Lưu/Hủy có một chủ sở hữu hình học; điện thoại chuyển một cột. Fieldset disabled, required, name, ref, key và handler gốc được giữ.
- Chuẩn hóa thêm 9 form trong trang ở tích hợp, báo cáo và kỳ công; 5 form trong chi tiết lô hàng dùng mẫu chung. Bảng nhận hàng và phân bổ kho giữ bố cục chuyên biệt. Không ép mọi tác vụ vào một form tổng quát.
- Bố trí lại form dài của hàng hóa, kho, hợp đồng mua hàng, lô hàng và tạo gói theo thông tin chính, dòng hàng, lịch trình và nội dung phụ. Không bỏ trường hoặc thay payload. Dòng hàng giữ lượng thập phân, đơn vị và điều kiện thêm/xóa. Chặn gửi lặp khi lệnh XNK đang chờ.
- Bảng lương bỏ phần tiêu đề lặp; lỗi đọc tách khỏi lỗi lưu. Nút thử lại gọi đúng nguồn dữ liệu và không lặp thêm nút tải lại phía dưới.
- Tài liệu dùng `DataTable`/`FilterBar` chung, có phiên bản, chủ thể, dung lượng và cập nhật; mở chi tiết từ bản ghi. Tên tệp dài xuống dòng; tên chủ thể hiển thị bằng nhãn nghiệp vụ. Giữ file và tên nhập khi upload lỗi, chặn gửi trùng.
- Tích hợp có nhóm số liệu đồng hàng, công cụ và trạng thái cấu hình rõ ràng. Trạng thái không cấu hình vẫn được thể hiện đúng; không tạo kết nối giả. Các scope trong màn quản lý API là dữ liệu kỹ thuật cần thao tác nên giữ mã gốc.
- Cấu hình có nhóm rõ, biểu tượng, số mục thực và liên kết thống nhất. Tìm kiếm/accordion trên điện thoại giữ hành vi và quyền cũ.
- Bảng, card, bộ lọc và vùng rỗng dùng khoảng cách chung; tránh lồng thêm khung quanh bảng. Skeleton của danh sách khớp số cột thay vì spinner kết hợp một khung nội dung khác.

## Kiểm chứng

- Bộ kiểm thử: 184 file đạt, 1 bỏ qua; 1.115 test đạt, 37 bỏ qua. Có ca mới kiểm tra ref tệp thật, giữ bản nháp/file khi lỗi, chống gửi trùng, số lượng thập phân và payload XNK.
- Lượt kiểm thử chạy đồng thời nhiều worker với hai trình duyệt từng có 6 test vượt ngưỡng 5 giây. Chạy lại các ca riêng đều đạt; toàn bộ bộ kiểm thử đạt với `--maxWorkers=2`, không tăng thời gian chờ test hoặc bỏ kiểm tra.
- TypeScript, build tối ưu, lint các tệp đổi và audit kiến trúc UI đạt.
- Đối chiếu ảnh trước/sau của 52 route chính và form tạo trên desktop 1440 px, điện thoại 390 px. Không lỗi runtime, lỗi đọc API hoặc tràn trang trong lượt sau thay đổi.
- Kiểm tra thêm 116 trạng thái ở 1440/768/390/320 px: ngăn tạo/sửa, dropdown bằng bàn phím, 7 loại trang chi tiết lấy từ liên kết dữ liệu thật, các tab và cấu hình tích hợp. Không thao tác ghi API nghiệp vụ.
- Kiểm tra cuối tên tài liệu dài vừa bề rộng bảng và các nhóm trường dự án. Ảnh, phiên đăng nhập và báo cáo có dữ liệu thật nằm trong `.tmp` bị Git bỏ qua; không đưa vào tài liệu công khai hoặc thư mục public.

Đây là nghiệm thu giao diện và các tương tác đã nêu. Không xác nhận tất cả 82 nghiệp vụ, tích hợp bên ngoài hoặc luồng camera ngoài hiện trường hoàn tất. Hạ tầng BHXH/payroll chưa có từ lượt trước vẫn báo đúng khả năng; không chạy migration, đổi tài khoản/quyền hoặc tạo dữ liệu để lấp giao diện.

## Chạy cục bộ

Chuẩn bị ở slot không đang phục vụ, kiểm chứng cổng riêng rồi chuyển cổng 3000. Giữ output trước để khôi phục. Thay đổi source không tự xuất hiện trong compiled preview; không build ghi đè output đang được máy chủ phục vụ. Không push GitHub hoặc deploy Vercel trong đợt này.
