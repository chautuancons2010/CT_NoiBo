# ĐỢT 07 — Chấm công và HR xử lý ngoại lệ, khóa kỳ công

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Một nguồn dữ liệu công cho nhân viên văn phòng/kỹ sư và công nhân theo Gói; HR sở hữu kiểm tra và chốt kỳ. Không sửa lại lõi offline/GPS/idempotency đã đúng nếu không có bằng chứng lỗi.

## Nghiệp vụ

- Chấm công cá nhân: vào/ra, ngày/ca, ảnh, vị trí, upload/sync/offline queue; idempotency nếu gửi lại từ điện thoại. Không báo hoàn thành khi đang offline chưa sync thành công.
- Giám sát: roster theo Gói/session; bulk present; ngoại lệ, bằng chứng.
- HR: tập trung danh sách bất thường `đi muộn/thiếu check-out/ngoài vùng/thiếu ảnh/chưa xử lý` đúng rule thực có; chỉnh công có lý do, người sửa, lịch sử.
- Bảng công kỳ: tạo/tổng hợp → xem ngoại lệ → xác minh → khóa kỳ → chia sẻ Kế toán đúng permission; điều chỉnh sau khóa chỉ qua workflow hợp lệ.

## UI Workspaces

- Nhân viên mobile: trạng thái ca hôm nay, một CTA đúng thời điểm (`Chấm vào` hoặc `Chấm ra`), bằng chứng, trạng thái đồng bộ rõ; không dồn menu admin vào màn cá nhân.
- HR desktop: hàng danh sách theo người/ngày và ngoại lệ, click mở drawer chi tiết ảnh/vị trí/lịch sử, xử lý không bị lạc context; kỳ công có header trạng thái và bước tiếp theo.
- Giám sát mobile: `Chưa xử lý` lên đầu; `Có mặt tất cả` rồi chỉnh ngoại lệ; sticky `Hoàn tất` theo trạng thái session.
- Lịch công dùng giờ 24h/ngày Việt Nam; mobile xem chi tiết theo ngày bằng sheet; Export Excel gồm dữ liệu đã xác minh và link ảnh hợp lệ.

## E2E UAT

Nhân viên chấm offline → sync một lần → HR thấy đúng record → chỉnh bất thường hợp lệ → tổng hợp kỳ → khóa → tài khoản kế toán có quyền đọc nhưng không sửa nguồn. Thử mất mạng, retry, cùng phiên nhiều người, lệch UTC nửa đêm, xuất Excel và RLS.

## Gate

Mỗi tình huống xác nhận DB, UI, API; ít nhất một ảnh desktop HR, mobile nhân viên và mobile giám sát; không có dữ liệu công trùng.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_07_RESULT.md` (thay `XX` bằng số 07), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
