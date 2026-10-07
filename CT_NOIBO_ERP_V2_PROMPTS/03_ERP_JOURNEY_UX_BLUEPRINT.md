# ĐỢT 03 — Khóa hành trình người dùng và cấu trúc trải nghiệm ERP

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

**Đây là đợt thiết kế trước khi code, không phải prompt dựng thêm Dashboard/card.** Lấy người sử dụng làm trung tâm: họ mở web biết đang ở đâu, việc cần làm, bước kế tiếp và không phải nhập liệu trùng.

## Nghiên cứu dựa trên bằng chứng đang có

Đọc code/domain docs của repo, 16 prompt lịch sử để xác định yêu cầu, blueprint và báo cáo kiểm toán 23/09, nhưng chỉ dùng source hiện tại để khẳng định việc đã triển khai. Tài liệu tham khảo Digiwin/T100 là **nguyên tắc quy trình và dữ liệu liên thông**, không copy UI landing page hay thêm nghiệp vụ MES/BOM không phù hợp Châu Tuấn.

## Deliverable bắt buộc trước khi chỉnh UI

### A. Danh sách người dùng và “job to be done”

Tối thiểu: Giám sát hiện trường, công nhân/nhân viên, HR, kế toán lương, thủ kho, nhân viên XNK, admin/quản lý. Mỗi persona có:
- 3 công việc thường xuyên nhất;
- 3 lỗi/khó khăn thủ công cần loại bỏ;
- dữ liệu đã có sẵn, không được hỏi nhập lại;
- chức năng chính + bước kế tiếp + quyền tương ứng.

**Không đoán tên chức danh thật của Châu Tuấn hoặc quy tắc duyệt chưa xác nhận.** Với quyết định nghiệp vụ còn mơ hồ, đưa 2–3 phương án và yêu cầu xác nhận, không tự tạo schema.

### B. 6 Service Blueprints

1. Tạo nhân viên → tài khoản → role → sử dụng.
2. Chấm công → xử lý ngoại lệ → khóa kỳ → kế toán → phiếu lương.
3. Gói → cập nhật hiện trường → ảnh/vướng → hồ sơ → bàn giao.
4. XNK → hàng về → phiếu nhập nháp → Kho post → tồn.
5. Kho nhập/xuất/chuyển/kiểm kê → đối chiếu ledger.
6. Nghỉ phép → duyệt → cập nhật số dư/công.

Mỗi blueprint: trigger, dữ liệu đầu vào, đối tượng gốc, trạng thái thật, người chịu trách nhiệm, quyền xem/sửa/duyệt, ngoại lệ, xử lý mất mạng, hành động thành công, dữ liệu phát ra cho module khác.

### C. Screen Intent Map

Mỗi màn chính trả lời đúng 4 câu hỏi: `Tôi đang ở đâu? Có gì cần chú ý? Tôi thao tác chính ở đâu? Điều gì xảy ra tiếp theo?`. Phân loại vào **5 page patterns**: Worklist, Entity Detail, Task Workspace, Form/Wizard, Document Workspace. Dashboard cá nhân là entry point riêng, không là template cho mọi module.

### D. Information architecture & action hierarchy

Phân biệt global app navigation, module context, function toolbar, primary action; xác định tab quyền-động; xác định một danh mục thông báo/nhắc việc/chát đúng owner.

### E. KPI hiệu quả người dùng

Đề xuất các mục tiêu thí điểm, ví dụ: 4/5 người thử tìm đúng CTA trong 5 giây, ít nhất 4/5 tự hoàn thành tác vụ chính, đo số bước và thời gian thực tế so với hiện trạng, theo dõi lỗi thao tác và trùng dữ liệu. Đây là **mục tiêu đề xuất**, phải xác nhận bằng UAT, không tuyên bố đã đạt.

## Gate dừng

Tạo `docs/erp-v2/ERP_BUSINESS_BLUEPRINT.md` và `docs/erp-v2/UX_JOURNEY_MAP.md`. Trình bày bản một trang bằng tiếng Việt cho người không chuyên duyệt. **Không triển khai UI đại trà trước khi chủ sản phẩm duyệt screen intent, 5 page patterns và hai luồng quan trọng nhất.**

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_03_RESULT.md` (thay `XX` bằng số 03), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
