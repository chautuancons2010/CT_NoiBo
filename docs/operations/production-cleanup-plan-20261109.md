# Kế hoạch dọn production, giữ một admin

Trạng thái: **chỉ chuẩn bị kế hoạch; chưa chạy dọn dữ liệu**. Chưa có kết nối SQL production có quyền đọc catalog/backup/DDL. SQL Management API hiện trả 403; service-role REST không thay thế quyền chủ database.

Runner chuẩn bị: `scripts/operations/production-cleanup-runner.mjs`. `inspect --project uioywupuuestcaliawlc` đọc catalog và kiểm tra admin; `backup --project uioywupuuestcaliawlc` lưu public/auth và metadata storage bằng AES-256-GCM trong `.tmp/production-cleanup`, khóa khôi phục tách ở `.tmp/production-cleanup-keys` nếu không cung cấp `PRODUCTION_CLEANUP_BACKUP_KEY` (64 ký tự hex). Không in nội dung/khóa ra log. Chuyển bản backup và khóa tới hai nơi lưu trữ được bảo vệ riêng; quyền file trên Windows còn phụ thuộc ACL của thư mục người dùng. Backup yêu cầu `PRODUCTION_CLEANUP_MAINTENANCE_CONFIRMED=true`, không tự bật maintenance. Các object binary và restore drill **chưa nằm trong runner này**. `execute` luôn dừng trước khi kết nối; chưa có destructive executor được chứng minh an toàn bằng schema thực tế.

Nếu có `PRODUCTION_DATABASE_URL`, runner dùng `psql` đã cài (hoặc `PSQL_BIN`) và truyền mật khẩu qua môi trường con, không qua argv. Host/username bắt buộc chứng minh đúng production; có thể dùng `PGSSLMODE=verify-full` và `PGSSLROOTCERT` phù hợp provider. Nếu không có URL, runner dùng phiên Supabase CLI và gọi SQL Management API cố định production với `read_only:true`. Không suy đích từ `supabase/.temp/project-ref` và không đọc file cấu hình TEST.

## Đích và dữ liệu giữ lại

- Chỉ production `uioywupuuestcaliawlc`, link `ct-noi-bo.vercel.app`.
- Cấm mọi thao tác ghi lên TEST `lgmlkagcytfjazulgfbz`; ghi số lượng bản ghi/guard TEST trước và sau để đối chiếu.
- Giữ đúng tài khoản `admin`, ID `9266af45-4b87-4aaf-99a3-03fbb7288d2b`; giữ nguyên auth ID/mật khẩu hiện tại. Không giữ tài khoản `user_a0000000`.
- Admin hiện có hồ sơ nhân viên liên kết. Schema bắt buộc department/position/employment type: phải giữ một bộ hồ sơ tối thiểu tương ứng, không xóa mất liên kết rồi tuyên bố đăng nhập được.
- Giữ danh mục permissions/roles/role_permissions và đúng quyền admin của tài khoản giữ lại; giữ system_settings/brand_assets/feature_flags cần cho cấu hình và nhận diện. Xóa lịch sử cấu hình, tùy chọn cá nhân, app_configurations, API keys/integration secrets và mọi dữ liệu nghiệp vụ còn lại.
- Chuẩn hóa các trường người tạo/cập nhật của cấu hình giữ lại về admin khi chúng đang trỏ tới tài khoản sẽ xóa; bỏ các tham chiếu manager/avatar của hồ sơ admin. Department/position giữ lại không được còn trỏ sang phòng ban/nhân viên đã xóa.

Số lượng đã được báo từ lần kiểm tra trước: 60 nhân viên, 58 app accounts, 57 auth users, 2.066 lượt chấm công, 3 dự án, 3 phiên công nhân. Đây không phải số lượng đã khóa tại thời điểm dọn; phải đếm lại sau khi bật maintenance.

## Điều kiện trước khi chạy

1. Cung cấp `PRODUCTION_DATABASE_URL` riêng qua `.env.local`, không qua chat/GitHub. Dùng direct host `db.uioywupuuestcaliawlc.supabase.co` hoặc pooler có username gắn đúng project production; runner bắt buộc phân tích URL và từ chối project TEST. Cần role chủ bảng/postgres để đọc catalog, backup, khóa bảng và tạm xử lý đúng trigger bất biến. Hoặc cấp quyền Owner/Database thích hợp cho phiên Supabase CLI hiện tại và xác nhận SQL API không còn 403.
2. Bật maintenance riêng production, dừng cron/queue/webhook và ghi mới; TEST vẫn hoạt động. Xác nhận admin giữ lại đăng nhập được và có `system_admin.access` trước khi thay đổi.
3. Tạo backup database bao gồm public/auth, object storage và metadata về cùng một mốc. Bản backup chứa dữ liệu nhạy cảm phải mã hóa, lưu ngoài repository công khai, có checksum, nơi lưu, thời gian, người phụ trách và kiểm tra khả năng phục hồi. Không coi `listUsers()` là backup auth đầy đủ: API không xuất mật khẩu hash/identity/session cần cho phục hồi.
4. Chạy file read-only `production-cleanup-preflight-20261109.sql`. So bảng/FK/trigger/migration thực tế với manifest từ `node scripts/operations/production-cleanup-plan.mjs`. Bảng chưa phân loại, schema drift, FK từ schema khác, trigger không biết hoặc TEST guard bất kỳ đều dừng kế hoạch. Script này không có chức năng kết nối hay execute.

## Giao dịch public-schema cần được dựng sau preflight

Không có SQL destructive đã được chạy hay một bản dry-run SQL production được xác minh. Danh sách xóa chính xác chỉ được chốt từ catalog production hiện tại, không chỉ từ các file migration local.

1. `BEGIN`, đặt lock/statement timeout, lấy advisory transaction lock dành cho production cleanup; khóa toàn bộ bảng đã phân loại theo thứ tự tên thống nhất. Kiểm tra lại đích, duy nhất admin giữ lại, auth/employee/department/position/type và quyền admin.
2. Xuất danh sách auth IDs cần xóa, bucket/object paths cần dọn và dấu vân tay RBAC/config ra manifest riêng có mã hóa. Loại auth ID admin và toàn bộ brand-assets còn đang được cấu hình ra khỏi danh sách xóa.
3. Ghi trạng thái trigger hiện tại. Chỉ tạm vô hiệu hóa từng USER trigger bất biến đã duyệt, trong chính transaction này: `audit_logs_append_only`, `stock_ledger_immutable`, `inventory_lines_posted_immutable`; nếu bảng bảo hiểm hiện diện, thêm `insurance_contribution_commands_append_only`. Kiểm tra catalog thực tế trước; không giả định danh sách này là đầy đủ. Trigger tạo audit/realtime/domain-event cũng phải được duyệt để tránh sinh dữ liệu trở lại khi dọn.
4. Dựng thứ tự DELETE con trước cha từ tất cả FK thực tế. Không dùng `TRUNCATE ... CASCADE`, `DROP SCHEMA`, `DISABLE TRIGGER ALL` hay `session_replication_role=replica`. Không thay đổi/loại FK. Vòng FK phải dừng để duyệt một cạnh nullable cụ thể; ví dụ cần xem self-reference của inventory document đảo chứng từ, reply của message, cây project và quan hệ nhân viên/phòng ban. Không tự null mọi FK vì có thể vi phạm CHECK hoặc làm sai dữ liệu giữ lại.
5. Xóa toàn bộ bảng nghiệp vụ/log/queue/file metadata thuộc manifest; xóa account_roles của người khác; xóa app_sessions (có thể xóa cả admin để buộc đăng nhập mới); xóa mọi app account ngoài admin. Giữ employee admin và bộ danh mục bắt buộc tối thiểu, xóa tất cả employee còn lại. Chỉ xóa danh mục department/position/type thừa sau khi nhân viên đã được dọn và các cạnh FK đã được xử lý tường minh.
6. Bật lại các trigger đúng trạng thái trước giao dịch. Kiểm tra mọi bảng nghiệp vụ bằng COUNT(*) = 0; app_accounts = 1; owner username/ID/auth ID/employee ID không đổi; đúng liên kết admin; FK hợp lệ; trigger và quyền giữ nguyên. Lỗi bất kỳ: `ROLLBACK`. Chỉ `COMMIT` sau khi toàn bộ kiểm tra đạt. Không thêm audit/log mới trong bảng vừa yêu cầu làm sạch; lưu biên bản kỹ thuật ở nơi backup được bảo vệ.

Không reset sequence bằng CASCADE. Việc đặt lại số chứng từ, danh mục mặc định hoặc cài lại policy/ca phải là bước bootstrap riêng, rõ ràng; không chạy `supabase/seed.sql` hoặc seed dữ liệu test lên production.

## Auth và storage sau commit

- Sau khi giao dịch public commit và có receipt: dùng Supabase **Auth Admin API** xóa từng auth user trong manifest production, luôn kiểm tra ID khác auth ID admin. API quản lý identities/sessions liên quan; không xóa thủ công toàn schema auth hoặc dùng CASCADE. Kiểm tra số auth users còn đúng một, không còn tài khoản mồ côi và admin đăng nhập lại được. Thao tác API không nằm trong transaction public; nếu lỗi phải dừng, giữ maintenance và tiếp tục theo receipt, không báo hoàn tất.
- Chỉ sau DB/auth đạt: dùng **Storage API** xóa từng object path đã sao lưu, theo lô và receipt. Không SQL DELETE `storage.objects` vì metadata và binary có thể lệch nhau. Giữ brand assets đang được cấu hình. Có object owner là auth user cần xóa thì phải chốt thứ tự với Auth API theo preflight; nếu Auth báo đang sở hữu storage, dọn đúng các object đã được sao lưu trước khi thử lại auth user đó, vẫn chỉ sau public commit.
- Sau commit, rollback bằng SQL không còn đủ. Phục hồi phải dùng backup DB/auth cùng mốc và bản object copy; cần kế hoạch restore đã được thử. Không suy đoán rằng một auth user đã bị xóa có thể tạo lại với mật khẩu cũ từ REST export.

## Tiêu chí hoàn tất

Production có một app account và một auth identity đúng admin; chỉ còn hồ sơ nhân viên/danh mục tối thiểu bắt buộc và RBAC/config đã liệt kê. Dữ liệu chấm công, dự án, công nhân, hồ sơ nhân sự khác, lương, bảo hiểm, kho, xuất nhập khẩu, chat, file nghiệp vụ, tích hợp, audit và queue đều trống. Admin đăng nhập mới được, cấu hình/màu còn đúng, không có orphan; TEST có cùng guard và số lượng như trước. Chỉ sau đó mới gỡ maintenance và ghi biên bản dọn thành công.
