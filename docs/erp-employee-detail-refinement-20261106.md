# Hoàn thiện chi tiết nhân viên — 06/11/2026

Phạm vi: CT_NoiBo trên localhost:3000, tập trung màn hình Lương & phúc lợi và khung dùng chung của tám tab hồ sơ nhân viên. Giữ bảng màu đã được người dùng đồng ý. Không phát hành GitHub/Vercel, sửa tài khoản, quyền, schema hoặc ghi dữ liệu nghiệp vụ thật.

## Bố cục và quyền sở hữu

- `RecordHeader` tại `PageHeader.tsx` gom ảnh, tên đầy đủ, mã, thông tin tổ chức có thật, trạng thái, thao tác và thanh tab. Loại bỏ thẻ tên hiển thị lặp lại. Giữ `h1` chuẩn để thanh ứng dụng điện thoại đọc tên trang.
- `RecordFields` tại `PageLayouts.tsx` dùng hàng nhãn/giá trị, có phân biệt chưa có dữ liệu và số 0. Khóa nhạy cảm là biểu tượng có tên truy cập, không lặp huy hiệu lớn sau từng giá trị. Quyền xem vẫn do dịch vụ và trang quyết định.
- `tokens.css` sở hữu kích thước ảnh, tỷ lệ cột nhãn và cỡ số tài chính. `erp-components.css` sở hữu khung chi tiết, trường chỉ đọc và tab một hàng cuộn ngang. Không thêm stylesheet hoàn thiện riêng hoặc màu cục bộ.
- `EmployeeDetailWorkspace.module.css` sở hữu bố cục phần nghiệp vụ. Khung lịch sử có chiều cao tự nhiên, không kéo cao bằng thẻ lương. Container query chuyển cột theo khoảng trống thực của nội dung.

Khi khung hồ sơ hẹp, thao tác sửa xuống hàng riêng để tên không bị ép. `ContextTabs` quan sát kích thước vùng cuộn và đưa tab đang chọn vào vùng nhìn sau khi đổi tab hoặc thay đổi kích thước; không thay đổi quyền, đường dẫn hay chuyển động trang.

## Dữ liệu lương

`EmployeeSalaryPanel` giữ `history[0]` và thứ tự từ dịch vụ hiện có, không tự thay quy tắc chọn hồ sơ. Dùng tên Hồ sơ lương và Mới nhất; ngày áp dụng luôn hiển thị, không khẳng định bản ghi tương lai đang có hiệu lực. Không tính hoặc gắn nhãn thực nhận/tổng thu nhập từ dữ liệu thiết lập lương.

Lương cơ bản được ưu tiên; phụ cấp, thưởng và khấu trừ giữ nguyên giá trị lưu. Ghi chú và lý do là dữ liệu thật, không đổi thành nội dung tiếp thị. Lịch sử chỉ có khi được phép, hiển thị người thực hiện thực tế; nếu thiếu thì ghi rõ chưa có thông tin. Ngày áp dụng và thời gian cập nhật là hai trường riêng. Chỉ hiện chuyển đổi lương cũ/mới khi mức cơ bản khác; thay đổi thành phần khác có nhãn riêng.

Mỗi bản ghi có native `details` để mở thông tin thành phần và thời điểm cập nhật. Quyền và truy vấn không thay đổi. Không thêm form ghi lương, ghi log nghiệp vụ hoặc nút thao tác giả.

## Kiểm chứng

- Lint các tệp thay đổi; TypeScript và build tối ưu đạt.
- Vitest: 181 file đạt, 1 bỏ qua; 1.095 test đạt, 37 bỏ qua. Sáu kiểm tra mới bao phủ khung chi tiết và dữ liệu/giới hạn quyền của bảng lương.
- Trình duyệt Edge kiểm tra màn hình lương tại 320, 390, 768, 1440 và 1842 px; tám tab thật tại desktop và Hồ sơ/Công việc/Tài khoản trên điện thoại. Kiểm tra một `h1`, không tràn ngang, số liệu không đổi và mở/đóng lịch sử bằng bàn phím.
- Chặn mọi ghi API nghiệp vụ trong kiểm chứng. Không có lỗi JavaScript hoặc API nghiệp vụ. Endpoint ảnh thương hiệu trả 404 khi chưa có ảnh được phân loại riêng vì có biểu trưng dự phòng; không che lỗi đọc dữ liệu khác.
- Ảnh và phiên có dữ liệu thật chỉ lưu trong `.tmp` bị Git bỏ qua. Không đưa thông tin nhân viên hoặc số tiền thật vào tài liệu này.

Các quyết định hình học dựa trên ERP UI contract và nội dung thật. Tra cứu thiết kế chuyên biệt không có kết quả phù hợp; không coi thông số cục bộ là tiêu chuẩn từ nhà cung cấp ERP. Kết quả này không xác nhận hoàn thành toàn bộ 82 yêu cầu nghiệp vụ.

## Bản chạy local

Đã chuyển localhost:3000 sang slot `.next-review-next` sau khi kiểm chứng tại cổng riêng; giữ `.next-review` trước đó để có thể khôi phục. Đăng nhập mới qua form thật đạt và cookie Secure hoạt động trên localhost. Nguồn Supabase và mật khẩu giữ nguyên. Máy chủ cổng 3000 tiếp tục chạy; cổng kiểm thử được đóng riêng. Thay đổi nguồn sau này cần build lại slot không hoạt động và chuyển máy chủ theo hướng dẫn hiệu năng local.
