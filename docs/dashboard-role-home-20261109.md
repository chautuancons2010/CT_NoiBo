# Trang chủ theo vai trò

Dashboard chọn không gian làm việc từ quyền hiệu lực của tài khoản. Thao tác nhanh chỉ xuất hiện khi tài khoản được phép mở chức năng và module tương ứng đang mở.

| Không gian | Thao tác ưu tiên |
| --- | --- |
| Nhân sự | Kiểm tra ảnh chấm công, bảng công, nghỉ phép, hồ sơ, điều chỉnh công, phê duyệt |
| Quản lý | Theo dõi công trường, phê duyệt, ảnh chấm công, tồn kho, lô hàng, báo cáo |
| Giám sát | Điểm danh công trường, gói/công trường, nhật ký, theo dõi công trường |
| Kho | Tồn kho, phiếu nhập, phiếu xuất, kiểm kê |
| Xuất nhập khẩu | Lô hàng, tạo lô hàng, chứng từ, hải quan |
| Kế toán | Bảng lương, hồ sơ lương, phiếu lương, lịch sử lương, bảng công, phê duyệt |
| Nhân viên | Chấm công, tạo đơn nghỉ, lịch sử công, phiếu lương cá nhân |

Các số liệu và biểu đồ hiển thị mở sẵn. Danh sách công việc hỗ trợ lọc theo nhóm, xem thêm và cập nhật dữ liệu. Danh sách ứng dụng nằm sau nội dung công việc.

Trên điện thoại, tài khoản nghiệp vụ có quyền Dashboard đi vào trang chủ theo vai trò khi đăng nhập, chọn Trang chủ hoặc bấm logo. Nhân viên tiếp tục dùng trang Cá nhân. Điểm đến đã cấu hình trong preset được giữ theo quyền truy cập.

Triển khai kênh test dùng gói nguồn riêng, đối chiếu từng tệp với manifest và build bằng `npm run build:wasm`. Database test được bổ sung migration `202611070001_worker_attendance_selection.sql` sau khi chạy thử và rollback; số phiên và dòng điểm danh được đối chiếu trước/sau.

Kiểm tra tại mã nguồn: 1.256 test thành công, 37 ca opt-in được bỏ qua; TypeScript, ESLint trên các tệp thay đổi và kiểm tra thứ tự migration đạt. Biên nhận triển khai và kiểm tra trình duyệt được ghi riêng trong `docs/operations`.
