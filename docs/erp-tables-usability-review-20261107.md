# Rà soát bảng và trải nghiệm sử dụng — 07/11/2026

Phạm vi: CT_NoiBo cục bộ, đọc dữ liệu thật bằng tài khoản đã được cho phép. Giữ bảng màu và điều hướng đã thống nhất. Không push, deploy, đổi tài khoản/quyền, chạy migration hay ghi thử nghiệp vụ vào Supabase dùng chung.

## Đánh giá khi đóng vai người dùng

Các vướng mắc lớn nhất là khó mở bản ghi, nhiều dòng/cột cùng mức ưu tiên, thiếu thông tin nhận diện công việc và trạng thái lỗi tách khỏi thao tác khôi phục. Chỉ kiểm tra trang tải thành công chưa đủ để kết luận sản phẩm dùng thuận tiện. Lượt này đi theo thao tác tìm → lọc/sắp xếp → mở đúng hồ sơ → quay về danh sách, và dashboard → công việc/biểu đồ → danh sách đã lọc.

| Quan sát trên bản trước | Thay đổi |
| --- | --- |
| Hợp đồng có 52 dòng, 7 cột, bảng cao 3.558 px; chưa có phân trang hoặc sắp xếp | 10 dòng/trang; nhân viên, hợp đồng, đơn vị, thời hạn, trạng thái/tệp và lối mở chi tiết; sắp xếp tên/số hợp đồng/ngày hiệu lực trên toàn dữ liệu trước khi phân trang |
| Bấm dòng thường chỉ tô sáng, phải tìm liên kết nhỏ hoặc bấm đúp | Danh sách có URL mở bằng một lần bấm; lối mở rõ ràng và dùng được bằng bàn phím. Workbench có chọn dòng vẫn giữ hành vi chọn; dòng không có thao tác không tự tô sáng |
| Bảng tính giá trị hiển thị qua cell không sắp xếp được đúng kiểu số | `sortValue` dùng giá trị gốc; số âm và thập phân được so sánh bằng số, không bằng chuỗi đã định dạng |
| 7 hồ sơ phê duyệt thiếu tên người gửi; nội dung một ngày nghỉ lặp lại | Bổ sung tên từ đúng đơn/hồ sơ liên quan sau kiểm tra quyền; hiển thị người gửi, mã đơn, loại nghỉ, thời gian và số ngày. Không sửa snapshot hoặc ghi bù dữ liệu |
| Việc chờ lâu bị đặt sau yêu cầu mới | Xếp theo mức ưu tiên, quá hạn và thời gian chờ; bộ so sánh có thứ tự nhất quán giữa server và client |
| 26 đơn nghỉ cũ thiếu tên/mã nhân viên | Điền phần thông tin hiển thị bị thiếu từ hồ sơ đúng employee_id của kết quả đã được cấp quyền xem; giữ các giá trị snapshot hợp lệ |
| Biểu đồ nhân sự có trục số lẻ và tên phòng ban xuống dòng | Biểu đồ ngang, nhãn đầy đủ và giá trị trực tiếp; thang đếm nguyên. Mở danh sách nhân viên đúng phòng ban; dự án có link tiến độ khi đủ quyền |
| Khôi phục lỗi ở bảng kho nằm ngoài bảng hoặc chưa nối vào state chung | Một nút Thử lại trong trạng thái lỗi; tải lại đúng các nguồn liên quan trên sáu bảng kho |
| Nút thao tác xuống dòng không cần thiết, số đếm lặp trên điện thoại | Thanh tác vụ chung giữ cặp nút cùng hàng; bỏ số đếm trùng ở bảng có phân trang; chỉnh khoảng cách và giữ phân trang trong màn hình nhỏ |

## Chủ sở hữu thiết kế

- `DataTable` / `Worklist`: mở dòng, đường dẫn chi tiết, lựa chọn, sắp xếp theo giá trị gốc và phân trang tùy chọn. Danh sách phân trang tại server giữ pager riêng; không sắp xếp lại riêng một trang rồi công bố là sắp xếp toàn bộ.
- `Pagination`: vị trí trang và khoảng bản ghi; giữ tên nút Trước/Sau hiện có.
- `erp-components.css` và token: khoảng cách ô/hàng, header, vùng thao tác bên phải, focus, thanh tác vụ và bố cục điện thoại. Không thêm stylesheet vá hoặc màu riêng theo trang.
- `EmployeeContractList`: thứ tự thông tin và thao tác mẫu/tạo hợp đồng; giữ nguyên các trường, payload và quyền tải tệp.
- `approvalIdentity` / `leaveIdentity`: chỉ bổ sung mô hình đọc sau kiểm tra quyền; truy vấn giới hạn đúng request/employee ID. Dữ liệu hiện có và quyền quyết định không đổi.
- `DashboardView` / `ModuleChart`: hàng công việc, biểu đồ và đường mở dữ liệu; không thêm KPI, tiến độ hoặc kết nối giả.

## Giới hạn nghiệm thu

Đây là kiểm tra giao diện và các luồng đọc/thao tác được nêu. Các lệnh lưu/duyệt/ghi sổ được kiểm tra trong bộ test; trình duyệt trên dữ liệu dùng chung chặn yêu cầu ghi. Mô phỏng một lỗi đọc để kiểm tra Thử lại chỉ ảnh hưởng phiên trình duyệt kiểm thử.

Các mẫu Word/tệp hợp đồng chưa được tải lên không được biến thành tài liệu mẫu giả. Hạ tầng BHXH và theo dõi gửi phiếu lương còn thiếu từ trước vẫn phải báo đúng khả năng; lượt này không bổ sung schema online. Camera, định vị ngoài hiện trường và tích hợp nhà cung cấp thật không được xác nhận chỉ bằng việc mở trang.

Ảnh, CSV và báo cáo có dữ liệu thật được lưu trong `.tmp` bị Git bỏ qua. Không đưa chúng vào public hoặc tài liệu phát hành.

## Kết quả kiểm chứng

- Build tối ưu, TypeScript, lint 25 tệp TypeScript thay đổi và audit kiến trúc UI đạt.
- Toàn bộ bộ kiểm thử: 188 file đạt, 1 file bỏ qua; 1.135 test đạt, 37 test bỏ qua. Có test phạm vi ID được đọc, giữ snapshot hợp lệ, số âm/thập phân, sắp xếp trước phân trang, reset tiêu chí và thứ tự công việc qua nhiều hoán vị.
- Rà 52 màn hình/form chính ở 1440 px và 390 px: không lỗi JavaScript, lỗi đọc API hoặc tràn trang trong lượt kiểm tra.
- 22 kiểm tra luồng sử dụng đạt: phân trang/tìm kiếm/sắp xếp hợp đồng, mở hồ sơ bằng dòng, mẫu/tạo hợp đồng, người gửi và thời gian chờ, biểu đồ lọc đúng nhân viên, CSV khớp dữ liệu, bảng số liệu và khôi phục một lỗi đọc 503 được chủ động mô phỏng. Không gửi lệnh ghi nghiệp vụ.
- Kiểm tra bố cục bảng/dashboard thêm ở 1440/1024/768/390/320 px. Một lỗi lệch thứ tự render khi phát triển đã được sửa; lượt cuối không ghi nhận lỗi hydration.
- Bản bàn giao kiểm tra thêm 15 tổ hợp màn hình/kích thước ở cổng riêng và 15 tổ hợp trên localhost:3000; đều đạt, gồm nhãn nút điện thoại hiển thị đủ. Bản đang chạy dùng `.next-review-next`; giữ `.next-review` trước đó để khôi phục. Cổng kiểm thử 3002 đã dừng, riêng phiên kiểm thử đã đăng xuất; không đăng xuất phiên của người dùng.
