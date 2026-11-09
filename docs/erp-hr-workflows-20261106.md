# Rà soát thao tác nhân sự — 06/11/2026

Phạm vi lượt này: BHXH, phòng ban, chức vụ, danh sách hợp đồng, tạo hợp đồng và mẫu Word; CT_NoiBo trên localhost. Giữ hướng màu và màn hình đăng nhập hiện có. Không push/deploy, sửa schema hosted, đổi tài khoản hoặc ghi dữ liệu nghiệp vụ thật.

## Thành phần chung

- `SectionedForm` và `FieldGroup` ở `FormLayout.tsx` sở hữu cấu trúc nhóm trường. `FormActions` giữ Lưu/Hủy trong ngăn nhập liệu; không đổi form data hoặc submit handler nghiệp vụ.
- `tokens.css` sở hữu độ rộng ngăn form. `erp-components.css` sở hữu khoảng cách, độ rộng, nhóm trường, thanh tác vụ và `worklist-summary`. Không có stylesheet hoàn thiện riêng. CSS Module chỉ giữ thành phần nghiệp vụ đặc thù.
- `DataTable.onRetry` gọi lại nguồn dữ liệu của chính màn hình. Các màn hình dùng API trong client không còn phụ thuộc vào refresh route để kích hoạt lại effect chỉ chạy lúc mount.
- Tách lỗi tải danh sách khỏi lỗi lưu form. Lỗi lưu giữ trường nhập và danh sách phía sau. Không thay dữ liệu đã tải bằng trạng thái rỗng khi một lượt cập nhật thất bại.
- Phòng ban/chức vụ có trạng thái, tìm kiếm, bộ lọc xóa chung, nhãn rỗng phân biệt chưa có dữ liệu với không khớp. Mã và tên cùng một ô nhận diện; thông tin phụ vẫn mở được trên điện thoại.
- Hợp đồng giữ tạo thủ công/mẫu Word, quyền xem hồ sơ và tài liệu; phân nhóm thông tin, thời hạn và tài liệu. File dùng `FileUpload` chung với tên tệp, trạng thái chưa chọn và thao tác bàn phím. Không thêm nút tải tài liệu giả.

## Nguyên nhân lỗi BHXH trong ảnh

Truy vấn REST chỉ đọc đã xác nhận `employee_insurance_profiles` và `employee_insurance_events` có sẵn, hiện không có hồ sơ. `employee_insurance_contributions` và `employee_insurance_contribution_commands` trả `PGRST205`, tên bảng khớp chính xác. OpenAPI đang công bố không có hai RPC `save_insurance_profile_command` / `save_insurance_contribution_command`. Không chạy RPC ghi để thử.

Trước sửa, `Promise.all` khiến bảng kỳ đóng thiếu chặn luôn GET danh sách hồ sơ và trả 500. Sau sửa, chỉ lỗi thiếu đúng bảng kỳ đóng được phân loại: hồ sơ/lịch sử đọc được giữ nguyên; `contributionsAvailable=false` phân biệt chưa sẵn sàng với không có kỳ đóng. Không dựng tháng đóng, tiền đã đóng hoặc ngày đóng từ hồ sơ cũ.

Mạng, quyền, bảng hồ sơ/lịch sử thiếu và lỗi không khớp tên vẫn báo lỗi thật. Không biến lỗi xác thực hoặc nghiệp vụ thành danh sách rỗng thành công.

Khi kỳ đóng chưa sẵn sàng, giao diện hiển thị trạng thái chỉ đọc và chặn mở form không thể lưu. Server kiểm tra cả bảng kỳ đóng và bảng biên nhận lệnh trước tài khoản thực hiện, upload, RPC hoặc audit. Chức năng ghi bảo hiểm chưa được coi là hoàn tất. Không thay RPC atomic bằng các lệnh ghi rời hoặc tự áp dụng migration vào Supabase dùng chung.

Các migration liên quan có trong repo: `202610140004_insurance_atomic_history.sql`, `202610160001_insurance_monthly_contributions.sql`. Việc áp dụng vào hosted database là phạm vi riêng; tài liệu này không cấp quyền chạy migration.

## Kiểm chứng

- Vitest toàn bộ: 182 file đạt, 1 bỏ qua; 1.110 test đạt, 37 bỏ qua. Các kiểm tra mới bao phủ phục hồi lỗi đọc, giới hạn fallback, chặn ghi trước side effect, giữ form khi lỗi, tránh gửi trùng và xóa tiêu chí lọc.
- Lint, TypeScript trong build tối ưu và audit kiến trúc UI đạt.
- Kiểm tra danh sách thực tại 320, 390, 768, 1440 và 1842 px. Mở/đóng form tạo, chỉnh sửa phòng ban/chức vụ, tạo hợp đồng và danh sách/thêm mẫu Word. Chặn mọi ghi API nghiệp vụ trong trình duyệt.
- BHXH thật hiện chưa có hồ sơ và hạ tầng kỳ đóng chưa sẵn sàng. Các trạng thái có hồ sơ, lịch sử, file và nhập kỳ đóng được kiểm chứng riêng bằng phản hồi API giả lập trong harness tạm. Dữ liệu giả không đi vào app hoặc database.
- Kiểm tra bàn phím chuyển tab, Escape đóng dropdown trước drawer, cập nhật số tạm tính từ trường nhập và chọn/bỏ chọn tệp.
- Ảnh và phiên có dữ liệu thật chỉ lưu ở `.tmp` bị Git bỏ qua; tài liệu không chứa dữ liệu nhân viên thật.

Rà route chỉ đọc là bước phát hiện lỗi, không thay nghiệm thu toàn bộ tương tác hoặc 82 nghiệp vụ. Các giới hạn payroll đã ghi ở lượt trước giữ nguyên.

Lượt rà menu thực tế truy cập 46 route tại desktop, không có lỗi JavaScript hoặc thao tác ghi. Lỗi API ghi nhận là BHXH trên build trước khi sửa. Trang Cấu hình XNK thiếu `h1`; đã thêm `PageHeader` dùng tên từ registry, giữ nguyên hai phần cấu hình và quyền hiện có. Màn hình lương nhân viên và phiếu nhập kho được kiểm tra hồi quy cùng bố cục form mới.

## Bản chạy cục bộ

Sau khi kiểm chứng ở cổng riêng, localhost:3000 đã chuyển sang slot `review` (`.next-review`). Slot `review-next` giữ bản hồ sơ nhân viên trước đó để khôi phục khi cần. Đăng nhập mới qua form thật đạt. Máy chủ 3000 tiếp tục hoạt động; máy chủ kiểm thử được đóng riêng. Các phiên kiểm thử được đăng xuất riêng, không thu hồi phiên khác. Nguồn dữ liệu Supabase giữ nguyên.
