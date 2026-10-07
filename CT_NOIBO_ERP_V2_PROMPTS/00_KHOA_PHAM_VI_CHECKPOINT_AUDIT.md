# ĐỢT 00 — Khóa phạm vi, checkpoint và kiểm toán chênh lệch

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Có baseline chính xác trước khi sửa tiếp; không làm mất tiến độ của phiên Codex đang chạy. **Đây là đợt kiểm toán; không redesign.**

## Bắt buộc thực hiện

1. Nếu một phiên Codex khác đang chỉnh cùng repo/branch: chờ phiên đó dừng an toàn. Kiểm tra `git status`, branch, diff; không reset hay overwrite thay đổi chưa commit. Người dùng phải đồng ý trước mọi thao tác phá hủy. Ghi SHA checkpoint và tạo branch triển khai V2.
2. Đối chiếu source mới nhất với snapshot 23/09. Phân loại phát hiện: `ĐÃ SỬA`, `CÒN LỖI`, `CHƯA KIỂM CHỨNG`, `KHÔNG CÒN ÁP DỤNG`. Đặc biệt **không** tái tạo global `MobileBottomNav` vì source snapshot mới đã bỏ component này.
3. Đọc `prompt/` để hiểu lịch sử nhưng đánh dấu prompt cũ **ARCHIVE/HISTORICAL**; không dùng chúng như nhiều chỉ thị hiện hành. Lập một backlog duy nhất và hai contract hiện hành.
4. Lập inventory UI: `src/components/layout/AppShell.tsx`, `AppHeader.tsx`, `MobileContextNav.tsx`, `MobileAppLauncher.tsx`, `src/features/projects/components/package-workspace/*`, `src/styles/tokens.css`, `src/app/globals.css`. Kiểm tra route nào còn dùng Project UI legacy; không xóa nếu còn consumer.
5. Lập inventory dữ liệu/quyền: Employee–Account–Role, attendance–timesheet–payroll, stock ledger, shipment–warehouse, leave–approval, chat–notifications. Đánh dấu thực tế: nguồn chuẩn, chủ thể sửa, consumer, schema, mutation nhiều bước, RLS.
6. Reproduce hoặc ghi rõ chưa reproduce các lỗi người dùng báo: role không tồn tại; lưu dữ liệu; toolbar treo; Admin có mục không thao tác; chat A↔B; sửa kho/hàng hóa; giao diện mobile trùng toolbar.
7. Chạy baseline nếu dependency/env cho phép: `npm run validate:migrations`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run ui:audit`, `npm run ui:architecture-audit`, `npm run ui:screen-audit`. Phân biệt test thực tế với chỉ kiểm cú pháp.
8. Chụp baseline **từ app đang chạy đúng commit** ở 390×844 và 1440×900 cho Dashboard, Gói, form tài khoản, Kho; ảnh cũ trong `docs/ui-evidence` chỉ làm đối chiếu nếu SHA trùng.

## Tệp bàn giao

- `docs/erp-v2/BACKLOG.md`: ID, symptom, nguyên nhân có bằng chứng, phạm vi, severity, phụ thuộc, test.
- `docs/erp-v2/ARCHITECTURE_BASELINE.md`: domain ownership và code path thật.
- `docs/erp-v2/evidence/STAGE_00_RESULT.md`.

## Gate

Có checkpoint, baseline PASS/FAIL/BLOCKED trung thực, danh sách ưu tiên thống nhất và không còn hai phiên Codex sửa cùng một branch. **Chưa gate thì chưa chạy đợt 01.**

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_00_RESULT.md` (thay `XX` bằng số 00), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
