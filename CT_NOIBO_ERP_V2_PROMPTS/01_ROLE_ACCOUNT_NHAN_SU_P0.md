# ĐỢT 01 — Sửa role, cấp tài khoản và luồng nhân sự tối thiểu

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Sửa role, cấp tài khoản và luồng nhân sự tối thiểu.

## Tại sao phải làm trước

Snapshot 23/09 còn role tĩnh trong `EmployeeDetailPage.tsx`/`EmployeeAccountActions.tsx`, trong khi Admin tải role đã lưu từ DB và `employeeMutationService.ts` kiểm tra role thật. Không được chỉ sửa một dropdown rồi tuyên bố xong.

## Phạm vi source cần audit (xác minh import mới nhất)

- `src/features/employees/pages/EmployeeDetailPage.tsx`
- `src/features/employees/components/EmployeeAccountActions.tsx`, `EmployeeCreateForm.tsx`, `EmployeeEditForm.tsx`
- `src/features/employees/services/employeeMutationService.ts`
- `src/features/settings/pages/RoleManagementPage.tsx`, `UserAccountsPage.tsx`
- `src/services/authorization/rolePersistenceService.ts`
- API Auth, Supabase RLS, migrations về role/account/employee.

## Quy trình người dùng mục tiêu

1. HR tạo **hồ sơ nhân viên tối thiểu**, chưa cần account.
2. Admin tạo role mới (tên hiển thị và mã ổn định) và tick permission theo module/hành động.
3. HR hoặc Admin có quyền mở `Cấp tài khoản` từ nhân viên; picker tải role thực tế từ DB, chỉ chọn role còn hợp lệ.
4. Xác thực/kích hoạt account theo luồng Supabase Auth được hỗ trợ; cấp role theo **UUID DB**, không dùng `role-employee` giả.
5. User đăng nhập, chỉ thấy module/action được phép; API/RLS cũng từ chối hành động không có quyền.

## Yêu cầu sửa

- Một nguồn role/permission cho cả form HR và Admin; role default nếu có phải lookup từ DB qua code, không truyền chuỗi ID tự tạo.
- Role + role_permissions cần transaction/RPC hoặc cơ chế nguyên tử phù hợp; bảo vệ quyền của admin cuối cùng; báo lỗi phục hồi được nếu Auth đã tạo nhưng profile/account_role thất bại.
- Phân biệt Employee với Account; không tạo tài khoản tự động cho mọi công nhân.
- Bỏ trường `Ngày vào` *trên form* sau khi kiểm tra nghĩa của các trường ngày thử việc/ngày chính thức; không drop DB field khi chưa kiểm tra consumer/báo cáo.
- Form cấp account tối đa các nhóm `Nhân viên / Đăng nhập / Quyền / Xác nhận`; desktop 1–2 cột, mobile 1 cột. Hiển thị lỗi field, trạng thái account, nút mở chỉnh role ở Admin theo quyền. Giữ nguyên design system.
- Không cho dữ liệu role thay đổi nhưng cache UI vẫn cũ; xử lý đồng bộ khi người dùng đổi role.

## Kiểm thử nghiệm thu

- Role tùy chỉnh → reload → HR cấp account từ **cả hai entry point** → user login → quyền allow/deny cả UI + API.
- Account không bị tạo một nửa khi bước gán role thất bại (kiểm thử fault injection và cleanup/compensation).
- Nhân viên chưa có tài khoản vẫn lưu/sửa được; nhân viên cũ không mất liên kết.
- Không tạo role trùng code, không xóa role đang được sử dụng trái chính sách.
- Screenshot form tạo nhân viên, cấp tài khoản và sửa role: 390px + 1440px.

## Phạm vi loại trừ

Không redesign toàn bộ HR, Dashboard hay Gói/Công trường trong đợt này.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_01_RESULT.md` (thay `XX` bằng số 01), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
