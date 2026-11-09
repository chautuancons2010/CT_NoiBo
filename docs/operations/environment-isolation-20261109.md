# Đối chiếu môi trường ngày 09/11/2026

Đã đối chiếu cấu hình URL Supabase trên Vercel và truy vấn chỉ đọc bằng thông tin đăng nhập đã cấu hình tại máy. Không đọc secret/service key từ Vercel.

| Môi trường | Website | Supabase project | Công cụ test |
|---|---|---|---|
| Production | https://ct-noi-bo.vercel.app | uioywupuuestcaliawlc | Tắt |
| Test | https://ct-noi-bo-test-chau-tuan.vercel.app | lgmlkagcytfjazulgfbz | Bật, có cổng truy cập |

Hai môi trường dùng project riêng, thông tin service/session cấu hình tại máy khác nhau; TEST có environment guard trỏ đúng project TEST. Không thấy hai website trỏ chung database trong cấu hình được kiểm tra. Kết luận này không thay cho kiểm toán toàn bộ tích hợp bên ngoài hoặc foreign-data wrapper.

Production đang chạy deployment cũ và thiếu cấu trúc worker selection, snapshot ca và giờ vào/ra công nhân đã có trên TEST. Các thay đổi báo cáo an toàn và chấm công nhiều lần phải được thử trên TEST trước khi cân nhắc cập nhật production.

Người dùng đã yêu cầu xóa toàn bộ dữ liệu và tài khoản production, chỉ giữ một admin. Tài khoản dự kiến giữ là `admin`; TEST giữ nguyên. Chưa thực hiện xóa: API Management SQL của phiên Supabase CLI hiện trả HTTP 403 và chưa có kết nối SQL production tại máy. Kế hoạch phải có backup, kiểm tra đích và transaction trước khi xóa; ảnh/object storage cần xử lý qua API sau khi xác minh kết quả database.

Không kết luận sẵn sàng vận hành đầy đủ chỉ dựa trên build/health check. Chưa có bằng chứng mới về restore drill, UAT nghiệp vụ và camera/GPS trên thiết bị thực địa.
