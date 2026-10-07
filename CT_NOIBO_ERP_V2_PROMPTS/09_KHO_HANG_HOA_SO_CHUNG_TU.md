# ĐỢT 09 — Kho và hàng hóa theo vòng đời chứng từ, không CRUD rời

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Giữ ledger/balance/post/reverse/chống âm kho nếu các test hiện hành xác nhận đúng. Chuyển UI từ nhiều menu rời thành **bàn xử lý chứng từ**.

## Quy trình

Danh mục kho/hàng → phiếu nhập/xuất/chuyển/kiểm kê → kiểm tra → post hợp lệ → ledger → tồn → đối chiếu. Nếu backend chưa có trạng thái `Chờ duyệt`, không thêm chỉ vì mockup; map nút theo state machine hiện có.

## Screen design

1. **Kho landing:** top summary rất gọn `Phiếu cần xử lý`, `Cảnh báo tồn` nếu có; nội dung chính là worklist phiếu và bảng tồn có filter, search; tác vụ tạo phiếu rõ.
2. **Phiếu:** header mã, kho, ngày, trạng thái; dòng hàng editable theo rule; cảnh báo thiếu tồn/không hợp lệ sát dòng; drawer xem chi tiết hàng; CTA hợp lệ ở đúng trạng thái (`Lưu nháp`, `Ghi sổ`, `Đảo`...). Sau post, không tùy tiện sửa dữ liệu lịch sử.
3. **Kho/Hàng hóa:** `Chỉnh sửa` và `Ngừng sử dụng` dễ tìm; xóa vật thể chưa có giao dịch nếu chính sách cho phép; đã có giao dịch phải archive/disable, giữ ledger. Form thêm hàng tối thiểu mã/tên/đơn vị/nhóm và các field thực sự required; thông tin phụ collapse.
4. **Mobile:** worklist rows compact, mỗi item có status + hành động đúng, filter sheet; form một cột, scanner nếu repo đã hỗ trợ — không giả lập scanner.

## Source trọng tâm

`src/features/warehouse/components/InventoryDocumentEditor.tsx`, `MasterDataEditors.tsx`, `InventoryItemEditor.tsx`, `StockCountEditor.tsx`, `WarehouseListViews.tsx`, route API warehouses/items, inventory rules/ledger. Kiểm tra PATCH đã có trước khi viết lại CRUD; thêm archive/delete có migration và guard phù hợp.

## UAT

Nhập → post → tồn tăng một lần; xuất vượt tồn → bị chặn; chuyển kho → hai kho đúng; kiểm kê/điều chỉnh → có log; retry không post 2 lần; sửa/disable kho/hàng không phá giao dịch cũ; desktop 1440/mobile390 giống Golden.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_09_RESULT.md` (thay `XX` bằng số 09), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
