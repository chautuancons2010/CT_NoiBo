# ĐỢT 10 — XNK theo lô hàng và tiếp nhận về Kho

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Lấy Shipment làm đối tượng trung tâm, không dựng quá nhiều màn form thông số. Đừng thay đổi ledger của Kho.

## Workflow thực tế

Đối tác/PO (nếu có) → shipment → dòng hàng → phương thức SEA/AIR → chứng từ → vận chuyển/milestone → thông quan khi áp dụng → nhận từng đợt → tạo **phiếu nhập kho nháp** → thủ kho kiểm tra/post → tồn tăng một lần.

## UI/UX

- Worklist lô: mã, mode, đối tác, ETA, mốc hiện tại, tài liệu thiếu, việc sắp đến hạn, status; filter `Cần xử lý/Đang vận chuyển/Sắp đến/Đã nhận` nếu state hỗ trợ.
- Lô detail: header đối tượng và timeline 4–6 mốc; nhóm `Hàng hóa`, `Vận chuyển`, `Chứng từ`, `Thông quan`, `Nhận kho`; rail `Cần xử lý` chỉ khi có dữ liệu thật; không nhồi mọi form lên một trang.
- AIR hiện AWB/chuyến bay và các trường liên quan; SEA hiện B/L/tàu/container nếu áp dụng. Field nhạy cảnh phải có giải thích ngắn, không placeholder dài.
- Mobile: timeline dọc, task và file thiếu trước, bottom CTA đúng giai đoạn; desktop table chi tiết có panel và giữ filter sau back.
- Khi tạo phiếu kho: hàng, mã, đơn vị, số lượng và nguồn shipment phải chuyển đúng; XNK không trực tiếp tăng tồn.

## Source

`src/features/import-export/components/ImportExportViews.tsx`, repository, schemas, Shipment API và warehouse receiving integration. Tách component quá lớn thành các workspace theo feature, không tự phát minh token style riêng.

## UAT

Một shipment nhận 2 đợt, hai phiếu nhập nháp, post đúng quantity, retry không tạo trùng, truy từ tồn về shipment; file quyền và audit đúng; status/ETA nhất quán sau reload.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_10_RESULT.md` (thay `XX` bằng số 10), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
