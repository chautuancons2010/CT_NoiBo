# ĐỢT 12 — Tin nhắn hai chiều, thông báo và nhắc việc đúng owner

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Phân biệt **Chat** (người↔người), **Notification** (hệ thống→người), **Reminder** (workflow→người). Không viết lại Conversation service nếu đã hỗ trợ hai chiều.

## Việc cần làm

1. UAT bằng hai tài khoản thật có chat permission: A tìm B → gửi → B thấy ngay → reply trong cùng conversation → A nhận realtime → unread/read cập nhật → reload vẫn còn. Test tài khoản inactive, chưa cấp account, membership/RLS, file đính kèm nếu đang hỗ trợ.
2. Desktop: inbox trái / conversation giữa / panel chi tiết tùy ngữ cảnh, composer sát cuối thread; mobile: inbox→thread riêng với back rõ, composer nằm **trên bàn phím/safe area**, chat float không che CTA của module khác.
3. Thông báo domain: có deep link đến bản ghi gốc, permission-aware, tránh gửi thông tin lương/hồ sơ tới account không quyền, retry/idempotent.
4. `Nhắc kỹ sư` nếu bản chất là nhắc chấm công: đặt trong Chấm công/HR, chọn người chưa chấm trong ngày/session theo rule; ghi lần gửi và đích nhận; Gói chỉ hiển thị thông tin liên quan, không quản lý reminder song song.
5. Composer gửi file phải có preview/progress/fail/retry, không hiện placeholder button nếu backend chưa hỗ trợ. Không dùng toast thành công trước khi message persist.

## UI

Dùng shared list/detail/composer controls, empty trạng thái `Chưa có cuộc trò chuyện` có CTA bắt đầu, bubble typography tiếng Việt/giờ 24h đúng, animation tin đến nhẹ; reduced motion.

## Gate

Video hoặc screenshot 2 phiên cùng lúc A↔B, DB record và thời điểm, ảnh desktop/mobile, quyền allow/deny, không duplicate thread.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_12_RESULT.md` (thay `XX` bằng số 12), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
