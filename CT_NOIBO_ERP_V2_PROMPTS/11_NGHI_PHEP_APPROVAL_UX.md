# ĐỢT 11 — Nghỉ phép và duyệt theo công việc cần xử lý

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Giữ workflow/balance ledger/PDF/approval platform đã có nếu đúng. Không tạo hệ thống phê duyệt riêng cho từng module.

## Luồng

Nhân viên tạo đơn → gửi → người có quyền thấy hàng chờ duyệt → phê duyệt/từ chối có lý do → số dư nghỉ cập nhật theo rule → attendance/timesheet được đối chiếu. Rút/hủy và đa cấp chỉ khi policy/engine hiện hành hỗ trợ.

## UX

- Nhân viên: form ngắn loại nghỉ, khoảng ngày/giờ, số dư, lý do/file tùy chính sách; preview PDF sau lưu thành công; mobile không dàn form như Word.
- Người duyệt: inbox `Chờ tôi`, cảnh báo trùng lịch/thiếu số dư nếu rule hỗ trợ, list compact với `Xem chi tiết / Duyệt / Từ chối`; action nhạy cảm phải confirm phù hợp.
- HR: lịch nghỉ và đối chiếu attendance, ledger số dư, lịch sử; không sửa balance trực tiếp nếu phải có chứng từ điều chỉnh.
- UI theo shared Worklist/Form/Detail. Loading/error/empty/no-permission đầy đủ; không KPI cards ở mọi trang.

## UAT

Đơn nháp/gửi/duyệt/từ chối/rút/hủy (nếu có), duyệt 2 bước, kiểm tra quyền, nghỉ trùng, balance, timesheet, PDF tiếng Việt, reload và audit. Không tự nâng nghiệp vụ ngoài thực tế.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_11_RESULT.md` (thay `XX` bằng số 11), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
