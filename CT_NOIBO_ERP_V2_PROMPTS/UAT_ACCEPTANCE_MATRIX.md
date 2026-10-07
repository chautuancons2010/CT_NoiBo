# UAT_ACCEPTANCE_MATRIX — CT_NoiBo ERP V2

Phân biệt: **PASS** đã chạy và có bằng chứng; **FAIL** đã chạy nhưng lỗi; **BLOCKED** chưa thể chạy do thiếu môi trường/quyền/migration; **DEFERRED** ngoài phạm vi đã được xác nhận. Không mặc định build pass = UAT pass.

| Nhóm | Người thử | Kịch bản | Bằng chứng tối thiểu | Gate |
|---|---|---|---|---|
| Account/Role | Admin, HR, user thường | Admin tạo role bất kỳ → HR cấp account → user login/allow/deny | DB ID, UI/API, ảnh lỗi/success, reload | P0 |
| Lưu dữ liệu | HR/giám sát | Lỗi giữa create/upload → retry → không double record | server logs, DB trước/sau, screenshot | P0 |
| Điểm danh | Giám sát/HR | Offline, phiên nhiều người, đồng bộ ca/ngày VN | DB, ảnh/GPS an toàn, Excel, reload | P0/P1 |
| Kỳ công→lương | HR, kế toán | HR khóa snapshot → Kế toán tính/phát hành | cùng source ID, quyền, PDF | P1 |
| Gói | Giám sát | Việc → tiến độ + ảnh → vướng → hồ sơ → file | audit, nguồn file, screenshot desktop/mobile | P1 |
| Kho | Thủ kho | Receipt/Issue/Transfer/Count/Post/Reverse | Ledger trước/sau, chống âm/dup | P1 |
| XNK | XNK, Kho | Shipment nhận 2 đợt → phiếu nháp → post | shipment ID, receipt IDs, stock delta | P1 |
| Nghỉ phép | Nhân viên, người duyệt | Nộp → duyệt → balance/công | approval log, balance ledger | P1 |
| Chat | 2 account | A gửi B, B trả lời, read/unread, reload | video 2 tài khoản và conversation ID | P1 |
| Admin | Admin, user thường | Update setting/permission + kiểm tra effect/deny | audit, reload, API check | P1 |
| UI usability | giám sát, HR, Kho, Kế toán | Tác vụ chính không hướng dẫn; đo số bước, sai sót, thời gian | video/screenshot có consent, kết quả theo người | P2 |
| UI regression | QA | cặp 390/1440 + các breakpoint + loading/empty/error | screenshot có SHA | P2 |
| Reliability | QA | fast nav, reconnect, double click, restore | logs/test, backup+restore drill | Go-live |

**Mục tiêu thí điểm UX đề xuất:** ít nhất 4/5 người thử nhận ra CTA trong 5 giây và hoàn thành tác vụ chính không cần hướng dẫn, khi có đủ mẫu. Nếu không đủ người thử, ghi rõ cỡ mẫu thực tế; không khai gian. Thời gian giảm thao tác phải đo trước/sau bằng cùng một kịch bản, không tuyên bố tiết kiệm thời gian từ cảm giác.

**Definition of Done từng đợt:** hành động thật + dữ liệu đúng reload + quyền API đúng + UI desktop/mobile đạt + logs/audit hợp lý + không phá Golden đã chốt; nếu một mục trọng yếu thiếu → FAIL/BLOCKED.
