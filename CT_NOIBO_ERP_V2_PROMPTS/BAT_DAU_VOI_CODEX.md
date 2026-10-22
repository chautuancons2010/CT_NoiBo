# BẮT ĐẦU VỚI CODEX — SAO CHÉP ĐOẠN NÀY

Tôi đã cung cấp bộ `CT_NOIBO_ERP_V2_16_DOT_VA_3_CONTRACTS.zip`. Đây là **bộ V2 thay thế bộ 11 prompt cũ**, không được chạy chồng hai bộ.

Nếu các tệp chưa có trong repo, hãy giải nén bộ V2 vào `docs/erp-v2/` và kiểm tra đủ 16 prompt, ba contract và README. Nếu không thể truy cập tệp ZIP, hãy báo thiếu chứ không tự tạo lại.

Hãy đọc `README_BAT_DAU_O_DAY.md` và ba contract. **Chỉ thực hiện ĐỢT 00** (`00_KHOA_PHAM_VI_CHECKPOINT_AUDIT.md`) ở phiên này.

Quan trọng: đang có thể có thay đổi dở của prompt cũ. Trước khi sửa, kiểm tra git status/diff; không reset, không xóa hay overwrite code chưa commit. Chỉ tạo checkpoint/branch khi an toàn. Báo người dùng nếu có xung đột cần quyết định.

Chỉ dùng ZIP source ngày 23/09/2026 như snapshot để so sánh. Source thật cần audit là branch hiện tại. Không redesign ứng dụng, không chạy các đợt 01–15, không thêm tính năng ở ĐỢT 00.

Cuối phiên, bàn giao bản tóm tắt tiếng Việt: đã kiểm tra những gì; lỗi nào đã xác nhận; lỗi nào chưa kiểm chứng; test nào PASS/FAIL/BLOCKED; SHA checkpoint và danh sách việc cụ thể để bắt đầu ĐỢT 01.
