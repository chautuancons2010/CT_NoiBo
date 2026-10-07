# ĐỢT 04 — Thiết kế Golden Screens và chuyển động trước khi code hàng loạt

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Chuyển ý tưởng `Refined Industrial ERP` và **mockup desktop số 2 người dùng đã chọn** thành bản mẫu giao diện có tính triển khai, không để Codex tự phát minh mỗi module một style. Đây là **design gate**.

## Nguồn tham chiếu

- Yêu cầu người dùng **đính kèm đúng ảnh desktop số 2 đã duyệt** hoặc đưa file vào `docs/erp-v2/references/desktop-golden.png` nếu chưa có. Không chọn nhầm ảnh AI khác trong repo.
- Dùng screenshot *thực tế theo cùng commit* ở đợt 00 làm Before; không so với ảnh cũ còn global bottom nav nếu source đã sửa.
- Học bố cục enterprise, content density và logic công việc từ phần mềm ERP tham khảo; không chép website giới thiệu của Digiwin.

## Thiết kế bốn Golden Screens cặp desktop/mobile

1. **Gói → Thi công (Task Workspace):** context header có ảnh thật nếu có; danh sách việc là trọng tâm; rail bên phải 25–30% chỉ khi có dữ liệu, mobile reflow có function toolbar và sticky CTA.
2. **Kho → Danh sách chứng từ (Worklist):** trạng thái, bộ lọc, hàng dữ liệu gọn, panel chi tiết khi chọn; mobile chuyển thành worklist row, không bảng kéo ngang.
3. **Nhân sự → Tạo nhân viên/cấp tài khoản (Form):** chia bước, progressive disclosure, lỗi inline, trạng thái lưu, không card-in-card.
4. **Dashboard cá nhân (Entry):** tóm tắt đủ gọn, tối đa những việc liên quan quyền, lịch/ghi chú/báo cáo phụ, không diễn giải chức năng bằng paragraph dài.

Mỗi Golden Screen phải có trạng thái **data-filled, empty, loading, error, no permission**, ít nhất một trạng thái mở filter/drawer và trạng thái lưu thành công. Mobile thêm keyboard/safe area; desktop thêm thu gọn sidebar và responsive 1366–1920.

## Visual language bắt buộc

- Cool neutral/white, chữ navy/slate, màu thương hiệu xanh/teal có tiết chế, semantic green/amber/red đúng nghĩa.
- Bố cục có chiều sâu bằng khoảng cách, typography và 1–2 surface trọng tâm; **không làm phẳng thành chữ lơ lửng**, không xếp chồng card đồng dạng.
- Icon theo semantic registry, một icon không dùng tùy tiện cho nhiều chức năng.
- Font hỗ trợ tiếng Việt nhất quán; tiêu đề rõ cấp bậc, data density hợp lý; không xây cả màn từ badge.
- Motion có mục đích: hover/focus nhanh khoảng 120–160ms; mở drawer/tab khoảng 180–240ms; progress feedback nhẹ; skeleton theo cấu trúc; `prefers-reduced-motion`; không làm chậm thao tác và không dùng animation trang trí liên tục.
- Mọi thành phần điều khiển có hover/focus/disabled/loading/error states; phản hồi dưới ~150ms nếu là thao tác tại client, còn server xử lý phải có busy feedback tức thì.

## Quy trình thực hiện

A. Khóa screen layout và token trước khi triển khai business screens.  
B. Tạo preview/prototype tách biệt không động chạm dữ liệu thật (Storybook nếu repo có, nếu không tạo route preview chỉ trên dev).  
C. Dùng UI thực tế + screenshot ở 390×844 và 1440×900, thêm 360px.  
D. So side-by-side với reference; ghi 10 điểm khác lớn nhất (layout/spacing/density, không chỉ đổi màu).  
E. Đề xuất 1–2 phương án có lập luận rồi yêu cầu người dùng duyệt **cặp desktop/mobile**. Không coi screenshot AI tự động là khả thi về API/data.

## Gate

Người dùng duyệt cặp Golden Screens; tạo `docs/erp-v2/GOLDEN_VISUAL_SPEC.md` có bố cục, spacing/width, states và motion; đưa screenshot/version vào `docs/erp-v2/references/`. Nếu chưa duyệt, **không qua đợt 05**.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_04_RESULT.md` (thay `XX` bằng số 04), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
