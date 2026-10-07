# Dữ liệu phát triển

## Phạm vi

`supabase/seed.sql` tạo bộ dữ liệu liên kết dành riêng cho local/staging. Khóa nghiệp vụ dùng tiền tố `TEST-`; UUID dùng namespace cố định `9xxxx`; account có `metadata.testData = true`.

Bộ seed gồm account, nhân viên, hợp đồng, nghỉ phép, chấm công cá nhân, điểm danh công trường, dự án/phân công, tồn kho/chứng từ, hợp đồng nhập khẩu/lô hàng/hải quan, kỳ công khóa, payroll, thông báo, hội thoại, ghi chú và to-do.

`scripts/seed-development-storage.mjs` bổ sung auth user và object thật trong private storage cho ảnh chấm công và attachment tin nhắn. `scripts/seed-development-coverage.mjs` bổ sung dữ liệu có trạng thái khác nhau cho attendance, payroll, project progress, kho, kiểm kê và XNK để kiểm tra giao diện dữ liệu dày.

## Chạy local

```bash
npm run seed:dev
```

Lệnh này reset Supabase local, chạy migration và `supabase/seed.sql`, sau đó tạo auth user và upload storage object.

Tài khoản local:

- `test.supervisor` / `12345678`
- `test.employee` / `12345678`
- `test.payroll` / `12345678`

Đặt `SEED_TEST_PASSWORD` để thay mật khẩu mặc định.

## Chạy lại và reset

Seed SQL dùng khóa cố định và `ON CONFLICT`; storage dùng `upsert`.

```bash
npm run seed:storage
npm run seed:storage:reset
npm run seed:coverage
npm run seed:coverage:reset
npm run seed:reset
```

Để xóa riêng test data trên staging, chạy `npm run seed:storage:reset`, sau đó chạy `supabase/reset-test-data.sql` bằng SQL editor. Không chạy các lệnh này trên production.

## Kiểm tra trước production

Xác nhận không còn business key `TEST-%`, account có `metadata.testData = true`, notification delivery key `test:%` và object dưới `test-data/`.

Kiểm tra quan hệ seed/auth bằng truy vấn chỉ đọc:

```bash
npm run audit:data-health
```

Khi dev server đang chạy ở `http://localhost:3000`, chạy smoke authenticated cho hai vai trò test, API allow/deny và viewport mobile:

```bash
npm run smoke:authenticated
```

Muốn seed storage hoặc coverage vào Supabase remote phải truyền rõ `--allow-remote`; script không tự mở khóa môi trường remote.

## Bổ sung dữ liệu mobile trên staging

Hai nguồn công được giữ riêng: `attendance_events` là lượt vào/ra cá nhân; `worker_attendance_sessions` và `worker_attendance_entries` là phiên điểm danh công nhân theo gói, công trường và ca. Script bên dưới chỉ thêm fixture TEST cho lịch công cá nhân, phiếu lương của nhân viên và giám sát, cùng hội thoại; không ghi vào phiên điểm danh công nhân.

```bash
node scripts/seed-mobile-personal-data.mjs --allow-remote --dry-run
node scripts/seed-mobile-personal-data.mjs --allow-remote
```

Script yêu cầu hai tài khoản `test.supervisor` và `test.employee` có `metadata.testData = true`, bỏ qua kỳ lương đang thuộc dữ liệu khác, và khi chạy lại chỉ thêm bản ghi còn thiếu. Chỉ dùng `--allow-remote` sau khi xác nhận đích là staging/test; không chạy trên production.
