# Giao diện vận hành kỳ lương — 07/11/2026

Màn chi tiết kỳ lương sử dụng cùng palette, điều hướng và thành phần ERP hiện có. Phần nội dung gồm tiến trình bốn bước, khu vực dữ liệu nhân viên và khung xử lý bên phải; trên điện thoại, các phần chuyển thành danh sách thẻ.

Trước khi có dòng lương, danh sách lấy từ `PayrollDetail.readiness.employees`. Màn hình hiển thị công tổng hợp, công chi tiết ngày, công chuẩn và hồ sơ lương hiện có. Không tính trước hoặc tạo số thực nhận cho các dòng nguồn. Sai lệch công dẫn đến đúng nhân viên trong kỳ công; thiếu hồ sơ lương dẫn đến danh mục lương. Thống kê sẵn sàng và bộ lọc dựa trên các lỗi đã được `payrollInputIssues` xác định.

Sau khi có dòng lương, bảng ưu tiên nhân viên và thực nhận, sau đó là ngày công, tổng thu nhập, khấu trừ và trạng thái phiếu. Các khoản thu nhập chi tiết tiếp tục có trong hồ sơ lương và biểu mẫu chỉnh sửa. Bộ lọc chuyển theo giai đoạn: điều kiện đối chiếu trước tính lương, tình trạng cần xử lý/gửi phiếu sau tính lương. Bộ lọc không còn áp dụng khi chuyển giai đoạn được hiển thị lại ở “Tất cả”.

Tiến trình, dữ liệu nguồn, trạng thái gửi thực tế và việc cần xử lý được suy ra từ bản ghi hiện có. Số phiếu đã phát hành không được đồng nhất với số phiếu gửi thành công. Quyền, API ghi, kiểm tra dữ liệu, phiên bản bản ghi và quy tắc duyệt/gửi lương giữ nguyên.

Kiểm tra:

- 128 kiểm tra accounting, gồm đối chiếu công, thiếu hồ sơ lương, thiếu dữ liệu nguồn, trạng thái gửi và chuyển bộ lọc khi duyệt.
- TypeScript và ESLint cho các phần thay đổi.
- Trình duyệt ở 320, 390, 768, 1024, 1440 và 1920 px, trong khung ứng dụng thật với dữ liệu mẫu: không tràn ngang toàn trang; tìm kiếm, bộ lọc, liên kết đối chiếu và bảng kiểm tra hoạt động.
- Ảnh và báo cáo local: `test-results/payroll-compact-preview/full-workspace-*.png`, `full-calculated-1440.png`, `workspace-report.json`. Dữ liệu mẫu chỉ thuộc bộ xem trước, không được đưa vào API nghiệp vụ.

Build xem lại được tách riêng tại `.next-review-payroll`; không ghi đè các build local đang chạy. Khởi động:

```powershell
$env:ERP_LOCAL_SLOT = 'review-payroll'
$env:ERP_LOCAL_PORT = '3003'
npm run preview:build
npm run preview:start
```

Không có push GitHub, triển khai lên hosting hoặc cập nhật schema trong đợt chỉnh giao diện này.
