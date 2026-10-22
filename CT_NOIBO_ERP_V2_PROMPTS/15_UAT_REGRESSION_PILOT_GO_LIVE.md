# ĐỢT 15 — Kiểm thử người thật, hồi quy và điều kiện triển khai

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Không thêm tính năng, không thêm dashboard/widget chỉ để đẹp. Xác minh đủ điều kiện làm ERP nội bộ với phạm vi đã chốt (không mặc định bằng MISA/Digiwin đầy đủ).

## UAT end-to-end có bằng chứng

1. **Identity:** tạo nhân viên không account → tạo custom role → cấp account → đăng nhập → quyền allow/deny.
2. **Công→Lương:** chấm online/offline → ngoại lệ → HR khóa kỳ → Kế toán dùng nguồn đúng → kỳ lương → phiếu lương.
3. **Gói:** phân công → công việc → cập nhật ảnh/tiến độ/vướng → điểm danh → hồ sơ bắt buộc/tài liệu → lịch sử.
4. **Kho:** nhập/xuất/chuyển/kiểm kê/post/reverse → ledger/tồn đúng → xử lý retry.
5. **XNK→Kho:** shipment → nhận nhiều đợt → phiếu nhập nháp → Kho post đúng một lần.
6. **Nghỉ phép:** nộp → duyệt → balance và công liên quan.
7. **Chat:** A↔B realtime/attachment/read.
8. **Admin:** sửa setting/role → có hiệu lực + audit.

## Khả dụng, UI/UX và hiệu quả

Thử nghiệm với nhân viên đại diện ít nhất giám sát, HR, kế toán, thủ kho, XNK/admin (số người thực có thể khác; ghi đúng sample). Cho mỗi người làm các nhiệm vụ thật *không hướng dẫn trước*. Ghi: có tự tìm được hành động chính trong ~5 giây, tỉ lệ hoàn thành, số bước, thời gian, lỗi thao tác, chỗ phải nhập lại dữ liệu; so với thao tác thủ công nếu có baseline. Không dùng cảm giác ‘trông đẹp’ làm bằng chứng duy nhất. Đối chiếu screenshot actual với Golden desktop/mobile, không sai lệch UI đã khóa.

## Reliability & security

- Fast switching, back/forward, offline, retry, double submit, multi-tab, concurrent update; reload vẫn đúng.
- RLS/API permission, private files, payroll privacy, audit trail, business-date VN, export Excel/PDF tiếng Việt.
- Chạy migration validation, typecheck, lint, test, build, architecture/UI audit, browser E2E staging.
- Kiểm tra **database remote migration** (không chỉ local order), backup và diễn tập restore bằng DB test; có rollback plan và loại bỏ seed/test data trước production theo checklist.
- Mọi P0 blocker phải đóng hoặc được chủ sản phẩm chấp nhận chính thức nếu không thuộc go-live scope; chưa có staging credentials → BLOCKED, không PASS.

## Output

`docs/erp-v2/RELEASE_EVIDENCE.md` với SHA, environment, migration đã áp, ma trận UAT PASS/FAIL/BLOCKED/DEFERRED, screenshot/video và chữ ký người chịu trách nhiệm. `GO-LIVE` chỉ sau khi owner thực tế duyệt.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_15_RESULT.md` (thay `XX` bằng số 15), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
