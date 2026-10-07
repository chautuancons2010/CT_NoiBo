# ĐỢT 06 — Hoàn thiện Gói/Công trường theo Golden UI và workflow hiện trường

> **Phiên bản V2 — thay thế bộ 11 prompt cũ; không chạy song song hoặc nối tiếp tự động cả hai bộ.**  
> Nguồn tham chiếu: `CT_NoiBo-main (1).zip` ngày 23/09/2026 và source **mới nhất trên branch đang làm**. ZIP là snapshot, không thay thế source đang chạy, Vercel hoặc Supabase live.  
> Đọc `docs/erp-v2/ERP_PRODUCT_CONTRACT.md`, `docs/erp-v2/UI_DESIGN_CONTRACT.md` và `docs/erp-v2/UAT_ACCEPTANCE_MATRIX.md` trước khi thay đổi. Nếu chưa có các tệp này, lấy từ bộ ZIP V2 người dùng cung cấp; không tự đoán quy tắc.  
> **Không được báo PASS** nếu chưa thực thi kiểm thử đó. Trường hợp chưa có database/staging/browser, ghi **BLOCKED + cách xác minh**, không mô phỏng thành công.


## Mục tiêu

**Không hard reset UI mới đã có.** Củng cố `src/features/projects/components/package-workspace/*` thành Golden Module gồm `Thi công / Chấm công / Hồ sơ / Tài liệu` và bảo đảm mọi thao tác đi vào nghiệp vụ thật.

## 1. Thi công

- Giữ `PackageWorkspace`, `PackageContextHeader`, `PackageConstructionWorkspace` nếu đang làm đúng; so ảnh 1440/390 với Golden.
- Desktop: project context rõ, khu vực task chính + rail thông tin phù hợp nếu có, action quản trị cây tiến độ trong menu phụ.
- Mobile: context 2–3 dòng, function toolbar `Hôm nay/Đang làm/Vướng/Lọc`, hàng công việc ngắn chứa tên, tiến độ, hạn, chủ trách nhiệm, tình trạng; sticky CTA `Cập nhật hiện trường`.
- Form cập nhật hiện trường **tối thiểu**: công việc, ngày/giờ, trạng thái, phần trăm, ghi chú, ảnh/vướng nếu cần. Không tự thêm khai báo vật tư/thiết bị khi không có domain thực.
- Save có draft/failed/success hợp lý; ghi ai, giờ, tiến độ và lịch sử; thông báo bên liên quan nếu domain event đã hỗ trợ; không tạo fake weather/photo.

## 2. Chấm công Gói

`PackageAttendanceWorkspace` phải hiển thị ngày/ca đúng giờ VN, roster từ project assignments, trạng thái session thực; bắt đầu/tiếp tục/hoàn tất theo quyền. `Có mặt tất cả` có thể sửa ngoại lệ, chụp ảnh toàn cảnh theo rule hiện hành; không tạo một bảng công công nhân song song. Nhắc công thuộc domain chấm công; Gói chỉ hiển thị ngữ cảnh thích hợp.

## 3. Hồ sơ bắt buộc khác với File

`PackageRecordWorkspace` trong snapshot đang suy từ update có attachment. Phải xác nhận với nghiệp vụ công ty danh mục **yêu cầu hồ sơ**: tên/loại/bắt buộc/hạn/phụ trách/trạng thái/duyệt. Chỉ khi danh mục thật được duyệt mới thêm model/API; tính thiếu đủ dựa trên yêu cầu chứ không dựa số file đã upload.

## 4. Tài liệu

`PackageDocumentWorkspace`: dùng nền Documents nếu đã có; file owner, loại, version lineage thật nếu được hỗ trợ; xử lý upload một phần/retry/rollback; ảnh preview và quyền file; **không dùng trùng tên file để khẳng định version thật**.

## Giao diện và motion

4 workspace phải cùng toolbar/page pattern với các module khác. Khi mở task desktop dùng detail drawer không đánh mất vị trí list; mobile mở sheet/full page phù hợp WEB, một CTA; progress đổi mượt nhưng giá trị server là nguồn sự thật.

## Acceptance

Tạo Gói → phân công → tạo việc → cập nhật tiến độ + ảnh → xem lịch sử → điểm danh → nộp và kiểm tra hồ sơ → file preview. Reload và account thứ hai thấy đúng quyền. 1440×900/390×844 của 4 màn + loading/empty/error, không có hai thanh nav trùng hay chat che CTA. Không sang module khác khi Golden này chưa được chủ sản phẩm chấp thuận.

## Cách bàn giao bắt buộc cuối đợt

Tạo `docs/erp-v2/evidence/STAGE_06_RESULT.md` (thay `XX` bằng số 06), gồm: commit SHA, branch, các file thay đổi chính, migration + áp dụng ở đâu, ảnh chụp đúng commit, tình huống thử nghiệm + kết quả PASS/FAIL/BLOCKED, lỗi còn lại, rủi ro hồi quy và hướng rollback. Báo cáo tóm tắt bằng tiếng Việt để người không chuyên hiểu. Không tự tuyên bố sản phẩm đã go-live.
