# Chấm công theo gói và công nhân được chọn

Luồng mới cho phiên chấm công được tạo từ ngày triển khai:

1. Giám sát chọn một gói, công trường và ca trong danh sách đang hoạt động.
2. Tick công nhân thực tế có mặt trong danh sách nhân sự đã cấu hình cho gói.
3. Chụp ảnh hiện trường, tối thiểu một ảnh hoặc số ảnh cao hơn theo chính sách.
4. Hoàn thành các mục an toàn bắt buộc, tick xác nhận an toàn lao động và gửi chấm công.

Không yêu cầu phân công một giám sát cố định cho từng gói. Người gửi được ghi lại trong phiên. Mỗi gói/công trường/ngày/ca giữ một phiên buổi sáng; phiên đang làm có thể được tiếp tục, phiên đã gửi được mở để xem.

Nhân sự quản lý tên gói tại **Gói → Hồ sơ → Đổi tên gói**. Danh sách công nhân được thêm hoặc ngừng phân công tại **Gói → Nhân sự & chấm công → Quản lý công nhân**. Tên công nhân được sửa qua hồ sơ nhân sự hiện có. Phân công không chọn công trường áp dụng cho toàn gói. Một công nhân có thể nằm trong danh sách lựa chọn của nhiều gói để hỗ trợ luân chuyển.

`selection_mode` phân biệt luồng mới với các phiên cũ. `is_selected` lưu lựa chọn công nhân; người không được tick không được tự chuyển thành vắng, nghỉ hoặc điều chuyển. Bảng công và Excel chỉ nhận các dòng đã chọn. `safety_confirmed` và số ảnh tối thiểu được lưu cùng phiên. Tên gói và tên công nhân trong phiên vẫn là snapshot để bảo toàn lịch sử. Danh sách của phiên được chụp lại khi bắt đầu; thay đổi danh mục áp dụng cho các phiên tạo sau đó.

Database kiểm tra lựa chọn, ảnh và an toàn khi gửi. Khóa giao dịch theo ngày/ca ngăn hai phiên đồng thời ghi nhận cùng công nhân có mặt trong cùng ca. Bản nháp vẫn lưu trên thiết bị, giữ lựa chọn và ảnh khi mất mạng, và dùng phiên bản dữ liệu để phát hiện ghi đè từ thiết bị khác.

Triển khai migration `supabase/migrations/202611070001_worker_attendance_selection.sql` trước khi chạy phiên bản ứng dụng này. Migration bổ sung các cột và quyền quản lý gói cho vai trò `hr`; các phiên đã có giữ chế độ cũ. Không cần xóa hoặc tạo lại dữ liệu chấm công.
