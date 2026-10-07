# ĐỢT 13 — Admin/CMS thao tác thật và phân quyền tập trung

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Admin quản lý cấu hình hệ thống, identity/access, danh mục chuẩn và giám sát, **không trở thành bản sao Kho/Chấm công/XNK**.

## Audit theo từng màn

Lập ma trận control của Admin/CMS: `Xem / Tạo / Sửa / Lưu / Bật tắt / Xuất bản / Hoàn tác / Xóa / Monitoring-only`, quyền cần, API, bản ghi DB, trạng thái lưu. Những nút thiếu hành vi phải implement nếu nằm trong phạm vi thực, hoặc **ẩn/đổi nhãn thành Chỉ xem**; không để nút giả.

## UI cụ thể

- Navigation 3 khu: `Cấu hình hệ thống`, `Quyền & Tài khoản`, `Giám sát kỹ thuật`.
- Role editor dạng workspace/drawer rộng, permission group `Xem/Tạo/Sửa/Duyệt/Xóa/Xuất` và trạng thái người đang dùng role; mobile accordion một nhóm mở một lần, không modal checkbox dài vô tận.
- Branding/navigation/modules có preview khi thay đổi và phân biệt `Lưu nháp` vs `Xuất bản` nếu backend hỗ trợ. Nơi không support preview không được giả.
- Monitoring chỉ-read là hợp lý nếu nhãn `Giám sát`, với đường dẫn tới nghiệp vụ khi cần; không nhét nút làm việc kho/chấm công vào CMS.
- Shared form/worklist/error/loading; không style riêng chỉ vì là Admin.

## Governance & security

Không khóa admin cuối cùng; thay permission phải sync với auth; không lộ tài liệu nhạy cảm trong monitoring; log ai/sửa gì/lúc nào cho cài đặt quyền & cấu hình; có phương án hoàn tác cấu hình hỏng.

## UAT

Admin chỉnh setting → lưu/publish → refresh → user có quyền thấy effect; user không quyền bị deny UI + API; role CRUD regression từ đợt 01; màn monitoring read-only không có button vô dụng.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_13_RESULT.md` (thay `XX` bằng số 13), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
