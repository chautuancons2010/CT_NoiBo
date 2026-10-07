# ĐỢT 14 — Dashboard hành động, polish có chủ đích và kiểm soát đồng bộ

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Sau khi các workflow đã chạy ổn mới dựng Dashboard dựa trên **việc thật**. Đây không phải đợt thêm KPI/animation tùy ý; đồng thời kiểm tra thống nhất desktop/mobile trên toàn ERP.

## Dashboard theo permission

- Giám sát: Gói phụ trách, việc trễ/vướng, phiên điểm danh cần hoàn tất, hồ sơ thiếu.
- HR: công bất thường, đơn nghỉ chờ xử lý, hồ sơ/tài khoản/hợp đồng cần lưu ý.
- Kế toán: kỳ công đã chốt, bảng lương cần đối chiếu, phiếu lương chưa phát hành (chỉ tháng/kỳ thực sự có).
- Kho: phiếu chờ post, kiểm kê chưa xong, cảnh báo tồn có rule.
- XNK: shipment gần ETA, chứng từ cần bổ sung, nhận hàng chưa hoàn tất.
- Admin: an toàn tài khoản, cấp quyền, lỗi hệ thống có thể hành động; không trộn system monitoring vào task inbox thông thường.

Đây là các **ví dụ theo quyền**; chỉ render data và action backend thực sự có. Phòng ban khác nhau về nội dung, không khác visual style.

## Cách trình bày

Đầu trang `Hôm nay/Việc cần tôi xử lý` với số lượng hữu ích, không đoạn giới thiệu dài. Công việc xuất hiện theo nhóm có ngữ cảnh và mở thẳng tới action; bên dưới mới là lịch/ghi chú/ứng dụng của tôi và biểu đồ **nếu có câu hỏi kinh doanh cụ thể**. Không biến mọi chức năng thành một Dashboard khác.

## UI polish + motion

- Áp dụng Golden Spec: hierarchy/spacing/density, icon registry, accent tiết chế, table row/edit drawer, informative empty state, skeleton nhất quán, dropdown/overlay không treo.
- Motion tokens 120–240ms, panel slide khi thay context, progress animate ngắn, hover/focus rõ, reduced-motion hỗ trợ; không hiệu ứng gây giảm hiệu suất.
- Responsive 360/390/430 + 1366/1440/1920; không content trống trên desktop, không kéo ngang bảng mobile; tab/toolbars đúng context; chat/keyboard không che CTA.
- Dọn legacy CSS/components **sau import/route audit**, không đổi module đã nghiệm thu chỉ vì ‘đẹp hơn’.

## QA

Chụp golden regression cho Dashboard, Gói, Worklist Kho, form Nhân sự, Shipment, Chat và Admin theo mỗi breakpoint; gắn SHA. Thử ít nhất 4 persona có quyền khác nhau. Mỗi màn đạt câu hỏi 5 giây với nhân viên thử nghiệm. Thay UI Core phải chạy lại visual regression của màn đã khóa.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_14_RESULT.md` (thay `XX` bằng số 14), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
