# ĐỢT 02 — Ổn định lưu dữ liệu, ngày công, realtime và toolbar

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Loại bỏ lỗi P0 trước khi mở rộng giao diện. Không áp dụng một bộ CSS vá mới để che bug.

## Công việc

1. Lập ma trận các mutation rủi ro: employee→sensitive data→account, upload project update→attachment, chỉnh permission, phiếu kho post, gửi tin. Kiểm tra lỗi khi rớt mạng, double submit, retry, back/forward, nhiều tab.
2. Dữ liệu trong **cùng DB** dùng transaction/RPC nơi cần nguyên tử; thao tác qua Auth/Storage không thể tự động transaction thì định nghĩa trạng thái `pending/complete/failed`, retry an toàn và compensation có kiểm tra. Không xóa bù mù quáng.
3. UI chỉ báo lưu thành công sau khi server xác nhận kết quả cuối; giữ dữ liệu nhập khi lỗi; chỉ hiện thông báo có thể hành động (thử lại/xem chi tiết).
4. Chuẩn hóa **ngày nghiệp vụ Asia/Ho_Chi_Minh**; audit `toISOString().slice(0,10)` khi tạo ngày hôm nay, ca đêm, lọc kỳ, điểm danh và Excel. Tạo utility dùng chung + test sát 00:00–06:59.
5. Reproduce toolbar treo: loading state kẹt, click overlay trong suốt, pointer-events, z-index, route transition, focus trap, modal cleanup, AppShell remount, realtime reconnect. Ghi video/screenshot trước-sau nếu có thể.
6. Không để badge realtime ‘không ổn định’ mặc định luôn hiển thị. Phân biệt offline, đang reconnect ngắn, không thể đồng bộ thật; bảo toàn dữ liệu người dùng và không giả thành công.
7. Tránh full reload để cập nhật màn. Giữ form, bộ lọc, vị trí cuộn khi quay lại hợp lý. Xử lý race khi hai người cùng sửa một bản ghi.

## Test bắt buộc

- Create/update → reload → fetch DB trả đúng; fail ở bước cuối không báo success; retry không sinh bản ghi trùng.
- Điều hướng nhanh, mở/đóng dropdown/modal, lưu xong quay về, mở chat, đổi tab mobile: toolbar vẫn nhấn được.
- Hai thiết bị/tab với account có quyền thấy thay đổi đúng phạm vi.
- Ngày công và ca qua nửa đêm hiển thị đúng Việt Nam.
- Không làm hỏng permission và stock ledger.

## UI chỉ được sửa ở đâu

Loading, toast, error, retry, dialog, nav/toolbar nếu đúng root cause. Không redesign page layout toàn hệ thống.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_02_RESULT.md` (thay `XX` bằng số 02), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
