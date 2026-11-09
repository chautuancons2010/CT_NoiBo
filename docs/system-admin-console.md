# Trung tâm quản trị hệ thống

Admin Console là một khu vực sản phẩm. Quyền hiệu lực quyết định ai được truy cập; không có nhánh xác thực đặc biệt theo tên role.

## Routes

- `/system-admin`
- `/system-admin/branding`
- `/system-admin/appearance`
- `/system-admin/navigation`
- `/system-admin/modules`
- `/system-admin/organization`
- `/system-admin/localization`
- `/system-admin/security`
- `/system-admin/config-history`
- `/system-admin/audit`
- `/login`

API:

- `GET /api/v1/system-settings`
- `GET|PATCH /api/v1/system-settings/[group]`
- `GET /api/v1/system-settings/history`
- `POST /api/v1/system-settings/history/[versionId]/restore`
- `POST /api/v1/brand-assets`

## Settings schemas

- `BrandingSettings`: tên hệ thống, subtitle đăng nhập, URL logo/favicons và asset version.
- `AppearanceSettings`: primary color, UI/table density, page size, sidebar và light mode.
- `OrganizationSettings`: tên, tên viết tắt, địa chỉ, điện thoại, email, mã số thuế và người đại diện.
- `LocalizationSettings`: timezone, date/time format, ngày đầu tuần và locale.
- `NavigationSettings`: danh sách mục ẩn, thứ tự route whitelist, landing page và trạng thái nhóm menu.
- `ModuleSettings`: trạng thái của các module đã triển khai.
- `FeatureFlagDefinition`: extension point typed; V1 chưa seed business flag.

Tất cả schema dùng Zod strict. Unknown key, route ngoài whitelist và giá trị không hợp lệ bị từ chối ở server.

## Khóa module

- Admin vào **Quản trị → Khóa module** (`/system-admin/modules`), chọn **Khóa** hoặc **Mở khóa**. Mỗi thao tác được lưu ngay, tạo phiên bản cấu hình và audit theo tài khoản thực hiện.
- Cần đồng thời `system_admin.access` và `module.manage`. Các module có thể khóa: Nhân sự, Cá nhân, Gói / Công trường, Kho, Xuất nhập khẩu, Kế toán, Đơn từ & Điều hành và Báo cáo. Dashboard, trang quản trị, hồ sơ, tin nhắn và thông báo chung vẫn dùng được. Khóa Đơn từ & Điều hành cũng khóa trang Báo cáo thuộc phân hệ này.
- Module khóa được gỡ khỏi menu/launcher; truy cập trang trực tiếp chuyển đến trạng thái tạm khóa. Proxy chặn mọi phương thức API thuộc module với HTTP `423`, mã `MODULE_LOCKED`, trước khi chạy handler. Quyền truy cập hiện có vẫn được kiểm tra tại từng handler khi module mở.
- Kiểm tra phía server đọc cấu hình module hiện hành, không dùng cache cũ. Khi database không trả được cấu hình hợp lệ, yêu cầu vào module nhận HTTP `503`; trang quản trị vẫn truy cập được để xử lý.
- Phiên đang mở đồng bộ trạng thái khi chuyển trang, quay lại tab và mỗi 30 giây. Server chặn yêu cầu mới ngay sau khi lưu khóa. Yêu cầu đã bắt đầu trước khi khóa có thể hoàn tất.
- Khóa không xóa dữ liệu, không đổi quyền và không hoàn tác giao dịch. Mở khóa khôi phục truy cập theo quyền đã cấp. Cấu hình JSON cũ được bổ sung mặc định cho Kế toán/Điều hành mà vẫn giữ các khóa đã lưu; không cần migration mới.
- Các API tích hợp có đường dẫn module cụ thể cũng tuân theo khóa. Phiếu lương cá nhân phụ thuộc thêm Kế toán; tạo phiếu nhập từ lô hàng phụ thuộc thêm Kho.
- `GET /api/v1/modules`: trạng thái module cho tài khoản đang hoạt động. `PATCH /api/v1/modules/[module]` nhận `{ "enabled": false }` để khóa hoặc `true` để mở khóa, chỉ thay đổi module được chọn trên cấu hình hiện hành.

## Database

Migration `202609100001_system_admin_console.sql` tạo:

- `system_settings`
- `settings_versions`
- `brand_assets`
- `feature_flags`
- Storage bucket `brand-assets`

Migration cũng seed sáu nhóm cấu hình mặc định và gán permission mới cho system role `admin`. Dữ liệu module không bị xóa khi module bị tắt.

## Permissions

- `system_admin.access`
- `branding.view`, `branding.manage`
- `appearance.view`, `appearance.manage`
- `navigation.manage`
- `module.manage`
- `organization_settings.view`, `organization_settings.manage`
- `localization.manage`
- `config_history.view`, `config_history.restore`
- `audit.view`

Route và API đều kiểm tra permission phía server. Menu chỉ là lớp hiển thị, không phải lớp bảo mật.

## Branding

Một nguồn cấu hình được dùng cho sidebar desktop, header mobile, trang đăng nhập, favicon, browser title và các accessor `useBranding`, `useAppearance`, `useOrganizationSettings`. Logo lỗi hoặc chưa cấu hình dùng mark `CT`/tên viết tắt. Favicon thêm version query để cache busting.

Logo chấp nhận PNG, JPEG và WEBP; MIME, chữ ký file, byte size, kích thước và tỷ lệ đều được kiểm tra lại tại server. SVG không được bật ở V1 vì chưa có sanitizer chuyên dụng.

## Config behavior

- Form giữ draft cục bộ; preview không ảnh hưởng người dùng khác.
- Publish xác nhận bằng schema, ghi settings version, ghi audit before/after rồi cập nhật context giao diện.
- Điều hướng cảnh báo khi rời trang với dữ liệu chưa lưu.
- Config history cho phép khôi phục snapshot của các nhóm được hỗ trợ và tạo thêm version `restore`.
- Khi database/config lỗi, app dùng default an toàn và không crash.
- Primary color tự derive hover, active, subtle, border, foreground và focus ring; foreground được chọn theo contrast.

## Tests

Các test bao phủ strict schema, route whitelist, color contrast/tokens, module route mapping, publish/version/restore, asset signature/MIME/dimension và các test nền tảng sẵn có.

## Known limitations

- Supabase migration được tạo trong repo nhưng không tự áp dụng lên môi trường từ tác vụ này.
- Khi không có biến môi trường Supabase, service dùng fallback memory theo process; asset fallback dùng data URL để phục vụ local development.
- Authentication resolver hiện vẫn là demo user của foundation trước; permission boundary đã sẵn sàng để nhận Supabase session thật.
- V1 chỉ hỗ trợ light mode và không nhận custom font, SVG, CSS, JavaScript hoặc HTML.
- Feature flag chỉ có schema/table foundation; chưa có UI tạo flag hoặc business flag chưa được đặc tả.
