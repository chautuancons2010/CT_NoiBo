# Tốc độ cục bộ và danh sách chứng từ — 06/11/2026

Phạm vi: CT_NoiBo, localhost:3000. Giữ bảng màu và khung giao diện đã được người dùng đồng ý. Không phát hành GitHub/Vercel hoặc thay đổi schema, tài khoản, quyền hay mật khẩu.

## Nguyên nhân và số đo ban đầu

Máy chủ trên cổng 3000 chạy `next dev --webpack`. Lượt đầu mở module gồm biên dịch server/client và nạp bundle phát triển. Tài liệu hiện có của dự án ghi máy này dùng trình biên dịch WASM khi native SWC không dùng được. Chế độ này phù hợp sửa mã và không đại diện cho tốc độ bản build.

Đo nối tiếp trên cùng máy, Edge headless 1440 px, cùng tài khoản và dữ liệu. Mốc hoàn tất là dữ liệu chính xuất hiện: chỉ số điều hành, dòng nhân viên hoặc dòng nhập hàng; không dùng thời gian xuất hiện skeleton để đại diện hoàn tất. Mỗi chế độ có một lượt quan sát đầu và một lượt lặp lại, không xóa cache cưỡng bức.

| Trang | Dev lượt đầu | Dev lượt lặp | Build cục bộ lượt đầu | Build lượt lặp |
| --- | ---: | ---: | ---: | ---: |
| Điều hành | 8.593 ms | 3.330 ms | 2.826 ms | 2.388 ms |
| Nhân viên | 8.961 ms | 923 ms | 881 ms | 788 ms |
| Tạo phiếu nhập | 25.136 ms | 3.329 ms | 1.634 ms | 1.588 ms |

Đây là mẫu nhỏ để xác định nút thắt, không phải p95 hoặc cam kết tốc độ cho mọi máy/mạng. Dashboard vẫn đọc nhiều nguồn nghiệp vụ thật. Không thay kiểm tra phiên/quyền bằng cache dài hạn, và không thay dữ liệu thật bằng dữ liệu mẫu để đạt số đo.

## Chạy bản tối ưu tại máy

`scripts/local-preview.mjs` dùng output `.next-review` đã được cấu hình sẵn, tách với output `.next` của dev. Script gọi Next bằng argv, có xử lý tín hiệu dừng, không tự tìm và tắt các tiến trình khác. Thư mục build vẫn được Git bỏ qua. Nguồn Supabase giữ nguyên.

```powershell
npm run preview:build
npm run preview:start
```

`npm run preview` thực hiện cả hai bước. Mặc định nghe tại localhost:3000; `ERP_LOCAL_PORT` và `ERP_LOCAL_HOST` cho phép người phát triển chọn cổng/địa chỉ khác khi kiểm chứng. Cần dừng đúng tiến trình do mình quản lý trước khi đổi chế độ trên cùng cổng.

Khi cần sửa mã với HMR, dừng phiên preview đang quản lý rồi chạy `npm run dev`. Sau khi sửa, kiểm chứng, build lại và chạy preview. Thay đổi nguồn không tự xuất hiện trong bản build đang chạy. Không thay lệnh dev mặc định của dự án.

Không build ghi đè `.next-review` trong lúc một máy chủ đang phục vụ thư mục đó. Dừng đúng phiên preview trước khi build lại hoặc dùng bản build cô lập để chuẩn bị rồi chuyển máy chủ sau khi kiểm chứng.

Hai output local được hỗ trợ qua `ERP_LOCAL_SLOT`: `review` (mặc định, `.next-review`) và `review-next` (`.next-review-next`). Chọn slot không đang phục vụ để build, kiểm tra ở cổng riêng, sau đó chuyển cổng 3000 sang slot đã kiểm chứng. Cả hai thư mục đều bị Git bỏ qua; không tự dừng tiến trình hoặc ghi đè slot đang hoạt động.

```powershell
$env:ERP_LOCAL_SLOT='review-next'
npm run preview:build
$env:ERP_LOCAL_PORT='3002'
npm run preview:start
```

Sau khi kiểm chứng, dừng đúng máy chủ do mình quản lý trên cổng 3000, đặt `ERP_LOCAL_PORT='3000'` và chạy `preview:start` với cùng slot. Giữ output trước để có thể khôi phục. Thư mục build phải nằm trong gốc ứng dụng theo hướng dẫn `distDir` của Next được cài tại dự án.

## Hoàn thiện danh sách chứng từ

- Nhập/xuất/chuyển/điều chỉnh kho dùng cùng `WarehouseDocumentFilters` và các thành phần `FilterBar`, `FilterTabs`.
- Các trạng thái thường dùng được chọn nhanh. Không hiển thị số lượng suy ra từ một trang dữ liệu như thể đó là tổng toàn bộ.
- Gõ tìm kiếm và sửa bộ lọc là bản nháp; chỉ Tìm/Áp dụng mới đổi truy vấn. Nhiều tiêu chí được áp dụng cùng một lần. Khoảng ngày sai giữ bảng lọc mở.
- Điều kiện đang áp dụng có thể bỏ riêng. Query, trạng thái, kho, khoảng ngày và trang nằm trong URL; giữ `projectId` và các tham số phạm vi có sẵn. Native History API của Next cập nhật URL mà không điều hướng server lại.
- Danh mục kho không bị tải lại chỉ vì thay bộ lọc chứng từ. Mở dòng bằng một lần bấm; quay lại giữ điều kiện. Các endpoint, quyền và phép tính nghiệp vụ không thay đổi.

## Kiểm chứng

Toàn bộ Vitest: 180 file đạt, 1 file bỏ qua; 1.089 test đạt, 37 bỏ qua. Có 5 kiểm tra mới cho bộ lọc chứng từ. Lint các tệp thay đổi sạch cảnh báo; build tối ưu kiểm tra TypeScript và các route. Kiểm tra trình duyệt chặn mọi ghi nghiệp vụ; phiên đăng nhập và hình ảnh dữ liệu thật chỉ lưu trong thư mục tạm ngoài repo.

## Kết quả tại cổng chính

Đã dừng đúng tiến trình dev CT_NoiBo đã xác định và chạy `preview:start` tại chính localhost:3000. Máy chủ dùng `.next-review`, không phục vụ từ thư mục snapshot. Phiên đăng nhập mới qua form thật đạt; cookie Secure được trình duyệt chấp nhận trên localhost, thời gian phản hồi đăng nhập 1.742 ms và tới dữ liệu điều hành 4.581 ms tính từ nút Đăng nhập. Không đổi mật khẩu.

Đo lại sau đăng nhập, cùng phương pháp và cổng 3000:

| Trang | Lượt đo 1 | Lượt đo 2 |
| --- | ---: | ---: |
| Điều hành | 2.465 ms | 2.371 ms |
| Nhân viên | 850 ms | 820 ms |
| Tạo phiếu nhập | 1.634 ms | 1.656 ms |

Trình duyệt kiểm chứng 24 trạng thái ở 1440, 768 và 390 px trên bản build: bốn danh sách chứng từ, bộ lọc nháp, đúng một lượt tải kết quả sau Apply, không tải lại danh mục kho, chặn khoảng ngày sai, chọn nhanh trạng thái, mở một lần bấm và quay lại giữ điều kiện. Không có lỗi JavaScript/API nghiệp vụ hoặc thao tác ghi nghiệp vụ.

Các phiên kiểm tra được đăng xuất riêng; máy chủ tối ưu trên cổng 3000 tiếp tục hoạt động cho người dùng. Các giới hạn nghiệp vụ/hạ tầng đã ghi nhận trước đó giữ nguyên. Kết quả tốc độ này không xác nhận nghiệm thu toàn bộ 82 nghiệp vụ hay phát hành ERP ra ngoài.

Sau lượt hoàn thiện hồ sơ nhân viên cùng ngày, cổng 3000 đã chuyển sang slot `.next-review-next` được kiểm chứng riêng; `.next-review` giữ làm bản trước. Xem [kiểm chứng chi tiết nhân viên](erp-employee-detail-refinement-20261106.md). Hai slot dùng cùng nguồn dữ liệu và cơ chế xác thực; không phải hai môi trường dữ liệu.
