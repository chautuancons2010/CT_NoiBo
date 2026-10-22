# ĐỢT 05 — Khóa hệ UI dùng chung và navigation responsive

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

Hiện thực Golden Visual Spec **chỉ ở UI Core/shared shell** trước khi nhân sang module. Không redesign toàn bộ chức năng cùng một lượt.

## Audit source trước sửa

`src/components/layout/AppShell.tsx`, `AppHeader.tsx`, `MobileContextNav.tsx`, `MobileAppLauncher.tsx`, `src/components/shared/*`, `src/styles/tokens.css`, `src/app/globals.css`, `docs/ui-design-system.md`, scripts `ui-*audit.mjs`. Kiểm tra `PackageWorkspace` có tab riêng, tránh render hai dãy tab trùng ý nghĩa ở mobile.

## Components/pattern phải thống nhất

- `ResponsivePageHeader`, `EntityContextHeader`, `ContextTabs`, `FunctionToolbar`, `Worklist` (desktop data table / mobile row), `FieldGroup`, `FilterSheet`, `ActionBar`, `StatusBadge`, `UploadPreview`, `Skeleton`, `Empty/Error/NoPermission`.
- Năm page patterns từ đợt 03. Feature compose dữ liệu, action và quyền; không tự tạo CustomHeader/CustomTabs/CustomButton/CSS palette.
- Permission-driven navigation: chỉ hiện app/tab/action có quyền **và backend guard kiểm chứng riêng**; không render rồi `display:none` dữ liệu nhạy cảm.

## Desktop

Giữ sidebar + một topbar nhất quán; sidebar thu gọn/đầy đủ có trạng thái đồng bộ; search, notification, chat, profile không đè nhau. Tab và toolbar có thứ tự; drawer giữ lại bảng/list sau khi đóng, tránh reload toàn trang.

## Mobile — responsive WEB

`Global header / Ứng dụng của tôi` → entity context gọn → **một** hàng module tabs theo quyền → toolbar thay đổi theo chức năng → nội dung → sticky primary CTA nếu cần. Không tạo global bottom app navigation ở deep workspace. Tabs dài cuộn ngang có affordance; toolbar chỉ giữ 2–4 control quan trọng; filter vào sheet; touch target ≥44px; composer/upload không bị bàn phím hoặc chat che.

## Motion & UX

Dùng motion tokens từ Golden Visual Spec, tôn trọng reduced motion. Các điều khiển có skeleton/busy/disabled/error. Không motion tạo delay giả; visual polish không đánh đổi hiệu năng. Responsive reflow là behavior của shared components, không viết mỗi feature một CSS override.

## Governance lock

- Chỉ một nguồn token; inventory selector trùng/lớp CSS cũ, deprecate đúng cách sau import audit.
- Sửa các UI audit scripts có rule lỗi thời buộc 4 KPI cards; tránh test false positive `app-header__title`, nhưng **không bỏ test chỉ để pass**.
- Viết `docs/erp-v2/UI_CHANGE_RULES.md`: sửa nghiệp vụ không được tùy tiện thay shared UI; thay UI Core phải chạy visual regression các màn chuẩn.

## QA/gate

Snapshot 360/390/430 + 1366/1440/1920; desktop/mobile same typography/status/surface; app launcher đổi permission không lộ app cấm; Gói không hiện 2 thanh tab trùng; panel/drawer/keyboard/slow network hoạt động. Chạy các script UI audit + Playwright nếu có browser; thiếu browser → BLOCKED. Chỉ sang đợt 06 khi shared patterns đã được duyệt và import thực tế.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_05_RESULT.md` (thay `XX` bằng số 05), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
