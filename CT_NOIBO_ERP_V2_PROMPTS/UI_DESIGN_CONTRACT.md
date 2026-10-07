# UI_DESIGN_CONTRACT — Refined Industrial ERP / CT_NoiBo

**Trạng thái:** Contract thiết kế cần duyệt cặp Golden Desktop/Mobile ở đợt 04. Desktop reference là **ảnh số 2 người dùng đã duyệt**; yêu cầu đính kèm chính xác ảnh đó khi lập bản Golden. Không giả định ảnh bất kỳ trong ZIP chính là số 2.

## Nguyên tắc

Một sản phẩm, cùng visual language trên desktop/mobile: typography Việt, neutrals/navy/brand xanh tiết chế, semantic status, icon registry, button/form/surface/border/motion tokens. Mobile là responsive WEB, không native app giả.

## Không gian và phân cấp

- Thay `Card + KPI + Table + Button` lặp lại bằng **page patterns** Worklist, Detail, Task Workspace, Form/Wizard, Document. Dashboard cá nhân là entry riêng.
- Desktop dùng vùng việc chính, right rail ngữ cảnh **chỉ khi có dữ liệu**, nội dung phải tận dụng chiều rộng mà không làm bảng kéo dài vô lý.
- Mobile: Global menu → Context (Gói/nhân viên/phiếu/lô) → tabs module → toolbar chức năng → nội dung → một CTA sticky nếu có; không có global bottom app navigation ở trang sâu.
- Header/project context thu gọn khi scroll để ưu tiên content, không mất định danh/primary action; duy trì một hệ tab không trùng nghĩa.
- 1 primary CTA / trạng thái nghiệp vụ, tối đa 1–2 secondary actions, overflow menu cho ít dùng. Tooltip chỉ hỗ trợ, không thay label quan trọng.

## Content design

- Người dùng biết mình ở đâu/làm gì/tiếp theo trong 5 giây.
- Ít chữ nhưng không cụt nghĩa; không đoạn văn giải thích phần mềm dài trên Dashboard. Cảnh báo diễn đạt vấn đề + cách xử lý hoặc nơi chuyển tiếp.
- Card cần vai trò phân nhóm, không card-in-card, không xóa card rồi để chữ lơ lửng.
- Chỉ dùng KPI/biểu đồ khi phục vụ quyết định thật; không 4 card mặc định mọi trang.
- Form dùng trường thật sự cần trước, mở `Thông tin bổ sung` khi cần; mobile 1 cột, field error rõ, autosave/draft chỉ khi backend hỗ trợ.

## Motion tokens đề xuất (phải đo và duyệt trong prototype)

- Feedback hover/focus ~120–160ms, panel/overlay/tab ~180–240ms; progress bar phản ánh dữ liệu server, animation không trễ thao tác.
- Transition không được remount shell hay reset scroll/filter vô cớ; có `prefers-reduced-motion` và trạng thái keyboard focus đầy đủ.
- Skeleton đúng cấu trúc list/detail/form; không spinner ở màn trắng lớn; optimistic UI chỉ cho action có rollback an toàn.

## Shared component governance

Tái sử dụng `ResponsivePageHeader`, `EntityContextHeader`, `ContextTabs`, `FunctionToolbar`, `Worklist`, `StatusBadge`, `FieldGroup`, `FilterSheet`, `ActionBar`, `Empty/Error/NoPermission`, `Skeleton`, `UploadPreview` (đặt tên dựa code thật; không bắt tạo trùng component có sẵn). Các module **compose**, không tạo CSS palette hay header/tab riêng. Mọi thay đổi UI Core phải chạy screenshot regression các Golden Screens.

## Visual acceptance

Chụp **app đang chạy đúng SHA** tại 360×800, 390×844, 430×932, 1366×768, 1440×900 và trạng thái data/empty/loading/error/permission; test tooltip, drawer, filter, dropdown, ảnh, keyboard, sticky bar, reduced-motion. Compare side-by-side ảnh mới với Golden. **Một ảnh AI đẹp không đồng nghĩa UI đã implement.**
