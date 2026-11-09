# Đăng nhập local: lỗi kết nối và JWT của Supabase

## Bằng chứng

- Ứng dụng local chạy ở `http://127.0.0.1:3100`, dùng cùng Supabase với production.
- Log ban đầu ghi `TypeError: fetch failed`; máy chủ được khởi động lại với quyền kết nối mạng và kiểm tra database thành công.
- Lần lỗi tiếp theo, log ngày 2026-11-03 lúc 08:30:08 UTC ghi `PGRST303: JWT issued at future` tại `auth.login_limit_check_failed`. Lỗi xảy ra trước bước xác minh mật khẩu.
- Truy vấn OpenAPI trực tiếp xác nhận Data API đang chạy PostgREST `14.5` và máy chủ dùng API key dạng `sb_secret_`.

Supabase giải thích API gateway đổi opaque API key thành JWT ngắn hạn: [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys). PostgREST đã sửa lỗi đồng hồ cache dùng khi xác minh JWT trong [PR #5159](https://github.com/PostgREST/postgrest/pull/5159). Báo cáo cùng triệu chứng với secret key: [Supabase #50651](https://github.com/supabase/supabase/issues/50651).

## Thay đổi

- Service client thử lại tối đa ba lần, đợi lần lượt 500 ms, 1.500 ms và 3.000 ms, chỉ khi Data API trả HTTP 401 cùng đúng mã `PGRST303` và thông báo `JWT issued at future`.
- Yêu cầu bị từ chối ở bước xác minh JWT chưa thực thi SQL, nên có thể gửi lại cả RPC/ghi dữ liệu khi gặp đúng lỗi này. Giữ nguyên method, body, credentials và tín hiệu hủy. GET gửi lại có signal để tránh Next.js trả lại lỗi đã memoize.
- Các lỗi khác, bao gồm sai mật khẩu, thiếu quyền, giới hạn đăng nhập và lỗi mạng không được gửi lại bởi cơ chế này. Nếu hết lượt vẫn lỗi đồng hồ, bước kiểm tra đăng nhập trả lỗi dịch vụ tạm thời; không cho phép bỏ qua kiểm tra giới hạn.

## Kiểm tra và giới hạn

- Kiểm thử mô phỏng lỗi JWT, giới hạn số lần thử lại, hủy yêu cầu, giữ nguyên RPC body, giữ chặn tài khoản khi RPC trả `false`, và bảo toàn các lỗi khác.
- Kiểm tra ứng dụng thực tế: database readiness HTTP 200; đăng nhập `Admin` và `admin` bằng mật khẩu tạm đã cấp đều HTTP 200; API phiên đăng nhập HTTP 200. Đã đăng xuất các phiên dùng để kiểm tra.
- Không thay đổi mật khẩu lần nữa trong bản sửa này. Không lưu mật khẩu/token trong tài liệu.
- Đây là biện pháp phục hồi ở ứng dụng, không sửa phiên bản PostgREST do Supabase quản lý. Cần người có quyền platform nâng cấp dịch vụ để xử lý nguyên nhân hạ tầng. Phiên Management API hiện có trả 403 khi đọc project production.
- Thay đổi mã nguồn hiện áp dụng cho ứng dụng local; chưa triển khai bản sửa này lên Vercel production.
