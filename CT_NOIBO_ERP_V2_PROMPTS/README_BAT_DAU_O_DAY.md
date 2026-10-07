# CT_NOIBO — ERP V2: BỘ PROMPT NÂNG CẤP THAY THẾ BỘ 11 PROMPT CŨ

**Không chạy 11 prompt cũ rồi chạy thêm bộ này.** Bộ V2 thay thế chúng, bổ sung phần quan trọng nhất trước đây còn thiếu: *hành trình nghiệp vụ, chất lượng thiết kế được duyệt trước khi code, chuyển động có mục đích và nghiệm thu người thật*. Dựa trên ZIP source ngày 23/09/2026, nhưng **Codex phải audit branch hiện tại mỗi đợt**.

## Dành cho người không chuyên: bắt đầu thế nào?

1. Nếu Codex đang chạy prompt cũ, **chờ kết thúc**; không dán prompt mới vào giữa phiên. Kiểm tra thay đổi rồi checkpoint Git.
2. Đưa thư mục này vào repo tại `docs/erp-v2/` (hoặc đính kèm toàn bộ ZIP và yêu cầu Codex đợt 00 đặt ba contract và các prompt vào `docs/erp-v2/`). Không cần tải lại ZIP source cũ nếu Codex đã ở branch mới nhất.
3. Yêu cầu Codex làm **đợt 00**. Khi Codex báo PASS có bằng chứng, mới giao **đợt 01**; cứ theo từng đợt, mỗi đợt có commit/PR hoặc checkpoint riêng. Không nạp toàn bộ 16 prompt cùng lúc.
4. Đợt **03 (UX Blueprint)** và **04 (Golden Visual)** yêu cầu bạn duyệt: bạn chỉ cần nhìn các hình desktop/mobile và mô tả luồng bằng tiếng Việt, không cần chọn pixel hay tự sửa code. **Đính kèm đúng mockup desktop số 2 đã chọn** ở đợt 04.
5. Nếu chưa có database staging/browser để kiểm thử, Codex phải báo `BLOCKED`, không tự coi đã hoàn thành.

## Ba tài liệu chung luôn có hiệu lực

- `ERP_PRODUCT_CONTRACT.md`: nguồn dữ liệu, quy trình, điều không được giả, kiến trúc nghiệp vụ.
- `UI_DESIGN_CONTRACT.md`: một ngôn ngữ desktop/mobile, 5 page patterns, toolbar và motion, visual regression.
- `UAT_ACCEPTANCE_MATRIX.md`: biểu mẫu nghiệm thu dữ liệu, chức năng, quyền, UI và nhân viên sử dụng.

## Thứ tự 16 đợt

| Đợt | Prompt | Kết quả nhìn thấy | Gate |
|---|---|---|---|
| 00 | Khóa phạm vi/audit | Biết đúng lỗi đang có, checkpoint | Baseline theo SHA |
| 01 | Role/Account/Nhân sự P0 | Tạo role, cấp tài khoản đăng nhập được | E2E account/permission |
| 02 | Lưu dữ liệu/realtime/toolbar | Không mất dữ liệu, nav không treo | Reload, retry, timezone |
| 03 | ERP UX Blueprint | Ai làm gì, ở đâu, bớt bước nào | **Bạn duyệt quy trình** |
| 04 | Golden Visual & Motion | Cặp màn desktop/mobile đẹp, thông minh | **Bạn duyệt ảnh mẫu** |
| 05 | UI Core & responsive shell | Một hệ điều hướng/component dùng chung | Screenshot + UI audit |
| 06 | Gói/Công trường | Thi công/Chấm công/Hồ sơ/Tài liệu liên thông | Golden Module |
| 07 | Chấm công/HR/Bảng công | HR xử lý ngoại lệ/khóa kỳ | Attendance E2E |
| 08 | Kế toán lương | Dùng cùng kỳ công; phát hành phiếu lương | Payroll E2E |
| 09 | Kho/Hàng hóa | Ledger/chứng từ + màn vận hành trực quan | Stock E2E |
| 10 | XNK | Lô hàng → phiếu nhận kho → tồn | Shipment E2E |
| 11 | Nghỉ phép | Nộp/duyệt/balance/công | Approval E2E |
| 12 | Tin nhắn/Thông báo | Chat 2 chiều/nhắc đúng người | 2 account live |
| 13 | Admin/CMS | Cấu hình thao tác được, không nút giả | Setting/RLS/UAT |
| 14 | Dashboard/Polish | Mở lên biết việc cần làm, cùng style | Visual regression/UX |
| 15 | UAT + Go-live readiness | Các bộ phận thử việc thật + backup | PASS toàn bộ blocker |

## Quy tắc tiết kiệm token và tránh sửa chồng

- Mỗi prompt xác định **phạm vi nhỏ và source cần audit**, không tự quét toàn repo mỗi lần.
- `Chỉ sửa đúng scope, sửa sâu`; không yêu cầu một lượt sửa 5 module.
- Đợt sau **giữ lại phần đạt** của đợt trước, không hard reset UI trừ khi có bằng chứng và được duyệt.
- Một chức năng chỉ xong khi `flow chạy thật + reload dữ liệu đúng + quyền đúng + ảnh desktop/mobile đạt + không làm lệch shared UI`.
- **Không tuyên bố sau 16 đợt chắc chắn thành ERP hoàn chỉnh**: go-live chỉ khi chủ sản phẩm và người dùng thực tế nghiệm thu.

## Kết quả kỳ vọng

Một **ERP nội bộ phù hợp phạm vi CT_NoiBo**, không phải bản sao 100% MISA/Digiwin: phần mềm giúp nhân viên biết việc cần làm, dữ liệu chảy xuyên phòng ban, giảm nhập lặp, quyền đúng, UI đồng bộ đẹp và thao tác nhanh. Ngoài scope này, kế toán tổng hợp/BOM/MES/giá thành… phải có dự án riêng nếu phát sinh nhu cầu.
