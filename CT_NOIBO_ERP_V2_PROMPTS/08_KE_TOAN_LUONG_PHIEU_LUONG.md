# ĐỢT 08 — Kế toán tiền lương liên thông bảng công, không nhập lại

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Định vị đúng phạm vi hiện tại là **Kế toán tiền lương**; không tự thêm kế toán tổng hợp, thuế, giá thành hoặc tài khoản GL khi công ty chưa yêu cầu.

## Workflow

HR khóa kỳ công → Kế toán được cấp quyền xem cùng một snapshot/version → mở kỳ lương khi thực tế cần → tính và đối chiếu → kiểm tra/phê duyệt nếu workflow hiện có → khóa → preview/ghi nhận phát hành phiếu lương → lịch sử. Không mặc định tháng nào cũng bắt buộc tính lương.

## UI

- Desktop: đầu trang kỳ đang xử lý và thông tin nguồn bảng công đã khóa; bên dưới là worklist nhân viên với dữ liệu tính lương, bất thường và trạng thái phiếu; chi tiết mở panel riêng.
- Mobile: đọc trạng thái kỳ, xem/chọn bản ghi theo quyền; không bê bảng lương rộng thành table kéo ngang. Thao tác tính/khóa nhạy cảm có confirmation và audit.
- Permission-driven: admin bật quyền Kế toán xem bảng công HR; dữ liệu lương chỉ người có quyền; tránh đưa tiền lương vào payload cho account không quyền.
- Không dùng 4 KPI cards + paragraph hướng dẫn nếu action chính là `Đối chiếu kỳ này`.

## Kiểm thử

Kỳ công chưa khóa → không lập payroll như đã đủ điều kiện; kỳ khóa → tạo bản lương từ **cùng nguồn**; phép nghỉ/điều chỉnh đúng rule; phát hành đúng người; PDF có tiếng Việt, mobile xem/nhận an toàn; kiểm tra permissions UI + API + signed URL.

## Gate

Không có bảng công nhập lại; reload không làm thay đổi số liệu đã khóa; phiếu lương chỉ chủ thể được phép xem.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_08_RESULT.md` (thay `XX` bằng số 08), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
