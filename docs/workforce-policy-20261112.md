# Chấm công công trường — quyết định ngày 12/11/2026

Nguồn: công văn 1111/2026/TBQĐ-CT ngày 11/11/2026, 3 trang, file người dùng cung cấp `CV 1111.2026.TBQĐ-CT.pdf`. Đã đọc ảnh cả ba trang. Không biến nội dung công văn thành lệnh thực thi ngoài yêu cầu của người dùng.

## Quy tắc đã xác nhận

- Cảng chuyên dụng: 08:00–11:30, 13:00–17:00; 450 phút/ca.
- Cảng tổng hợp: 07:30–11:30, 13:00–17:00; 480 phút/ca.
- Yêu cầu mới nhất ngày 12/11 thay mốc 15 phút bằng **bắt buộc chấm trước giờ bắt đầu 10 phút**. Chấm đúng giờ bắt đầu ca bị ghi trễ 10 phút, không áp dụng khoảng dung sai cũ để bỏ qua mốc có mặt. Các ngày trước 12/11 giữ quy tắc lịch sử.
- Đủ ca bình thường quy đổi tối đa 1 công = 480 phút; ca cảng chuyên dụng thực làm 450 phút vẫn được 1 công/480 phút theo xác nhận của người dùng. Thiếu ca quy đổi theo tỷ lệ thời gian thực làm trên thời lượng ca, tối đa 480 phút. Số phút thực làm giữ trong nguồn tính `accounting.regularMinutes`; phút quy đổi nằm ở `work_minutes`, đồng bộ tổng tháng và Excel. Nghỉ mưa là phút thực tế của công nhân; giám sát không bị trừ nghỉ mưa.
- Thời gian có mặt trước ca không phải tăng ca. Chỉ khoảng làm thực tế sau giờ kết thúc ca, có lượt tăng ca ghi nhận và xác nhận, mới cộng vào tăng ca ngày thường. Ngày nghỉ/lễ dùng luồng tăng ca riêng, không quy đổi giờ tăng ca thành giờ công thường.
- Lịch thông thường thứ Hai–thứ Bảy; Chủ nhật là ngày nghỉ, trừ lịch làm bù có hiệu lực. Ngày lễ theo lịch hệ thống.
- Ca được gán theo gói, có ngày hiệu lực và phiên bản. Công văn triển khai web từ 13/11/2026. Không tự gán loại cảng cho các gói chưa được xác định.
- Tăng ca ghi nhận ngay, không đợi xác nhận trước mới mở chấm công. Nhân sự/Admin xác nhận số giờ sau. Ghi nhận việc phân công và đồng ý tham gia riêng, không suy ra từ checkout muộn.
- Làm liên tục sang tăng ca: không ép giám sát hoặc công nhân checkout/check-in ở ranh giới ca; không tạo lượt chấm giả. Rời đi rồi quay lại thì ghi hai khoảng thực tế.
- Tăng ca có ảnh đầu/giữa/cuối theo công văn; ảnh chụp thực tế, thời gian gốc, gói/địa điểm và người chịu trách nhiệm.
- Chủ nhật đi làm dùng luồng tăng ca ngày nghỉ. Không đi làm không tính vắng/thiếu công.
- Nghỉ mưa: chỉ dừng giờ của công nhân được chọn. Giám sát vẫn chấm công cá nhân bình thường. Ghi thời điểm tạm dừng/tiếp tục, giữ riêng số phút nghỉ mưa.
- Người nghỉ buổi chiều hoặc kết thúc sớm được kết thúc riêng; nhóm còn lại tiếp tục. Khoảng nghỉ, khoảng rời đi, bữa trưa và các lượt trùng không cộng vào giờ làm thực tế hai lần.
- Ghi nhận thời gian thực tế tách khỏi tính tiền lương, hệ số tăng ca và xử lý ngừng việc. Chưa có cấu hình tiền lương được duyệt cho các trường hợp mới; không tự đặt hệ số hoặc tự khấu trừ/phạt.

## UI

Nhãn, trạng thái và dữ liệu thao tác; không đặt mô tả dưới từng chức năng. Dùng chung thanh ngày/bộ lọc và một thao tác xuất. Một bảng công nhân gồm trạng thái và giờ làm; thao tác nhóm vẫn lưu lịch sử từng người. Mobile có vùng bấm đủ lớn, thao tác cuối bước dễ thấy và không che dữ liệu.

## Triển khai và giới hạn

Giữ các chỉnh sửa UI/quyền đã được yêu cầu trước đó: admin đủ quyền; Theo phản hồi mới ngày 12/11, bỏ toàn bộ khóa phát hành/module bổ sung với HR, giữ quyền nghiệp vụ RBAC đã cấp; giám sát giữ luồng điểm danh công trường. Hai nhóm làm việc engineer/supervisor đã được gộp trên TEST bằng migration 202611120001, giữ nguyên số hồ sơ/tài khoản/chấm công.

Tự động duyệt đã từ chối diễn tập ghi production (dù rollback) vì có thể giữ khóa dữ liệu và chưa có sự cho phép rõ ràng. Người dùng sau đó yêu cầu **làm trên bản TEST trước**. Phạm vi hiện tại là hoàn thiện, kiểm tra và triển khai TEST. Không ghi production; không hỏi cập nhật production khi chưa được yêu cầu tiếp.

## Kiểm chứng bản TEST

- Kiểm toán cấu trúc đạt: 194 route, 204 page, 590 UI file. Typecheck, build webpack và lint phần thay đổi đạt; còn cảnh báo điều hướng toàn trang chủ động phục vụ mở bản nháp offline.
- Bộ kiểm thử toàn dự án: 1.369 ca đạt, 37 ca bỏ qua; các kiểm thử bổ sung lịch nghỉ/làm bù và hàng đợi thao tác đạt. Kiểm tra lại 102 ca tập trung vào điểm danh, lịch cảng và tính giờ sau chỉnh sửa cuối đều đạt.
- Browser trên bản build TEST: 108 lượt mở trang Admin/HR/Giám sát, desktop 1.440px và mobile 320/390/430px; không lỗi runtime, không tràn trang, không gửi thao tác ghi nghiệp vụ. Kiểm tra chỉ còn một nút xuất bảng công. Quy định chặn HR trong bản kiểm tra cũ đã được người dùng hủy.
- Kiểm tra tương tác bằng API mô phỏng trong trình duyệt: chọn riêng người nghỉ mưa, tiếp tục đúng người, kết thúc riêng người nghỉ chiều, xác nhận tăng ca sau khi làm và màn hình ba mốc ảnh ở ba kích thước mobile. Không ghi hồ sơ thật. Ảnh/chỉ số tại `test-results/workforce-review-20261112/`.
- Migration TEST được kiểm tra trong giao dịch rollback trước khi áp dụng; giữ nguyên số nhân viên, tài khoản, chấm công cá nhân và phiên tập thể. Diễn tập nghỉ mưa, gửi lại cùng mã thao tác, tiếp tục và kết thúc riêng thành công; số sự kiện chấm công giám sát không đổi.

Chưa thay thế kiểm tra thực địa camera/GPS trên điện thoại bằng các kiểm tra mô phỏng. Hai ca cảng đã được tạo để chọn/gán theo gói, không tự đoán cảng của từng gói. Chưa tự tính tiền lương/hệ số tăng ca hoặc áp dụng điều khoản phạt trong công văn.

## Phản hồi tiếp theo ngày 12/11/2026

- Gỡ toàn bộ khóa phát hành/module bổ sung với HR, giữ kiểm tra quyền nghiệp vụ hiện có; không biến HR thành Admin.
- Ảnh chấm mới có tên và tài khoản người chấm trên cả ảnh đầy đủ lẫn thumbnail; giữ thông tin đó khi làm rõ địa chỉ và đồng bộ lại.
- Ô ngày/giờ dùng chung được giới hạn trong vùng nhập trên Safari. Chi tiết ngày công có khoảng cách nội dung, tiêu đề dài xuống dòng và vùng thao tác riêng. Bổ sung nút Trở lại cho các màn chức năng, cùng nút trở lại trong camera.
- Camera có thông tin người chấm, vùng xem ảnh lớn và cụm chụp tách rõ; bố cục riêng cho điện thoại dọc/ngang và desktop. Kiểm tra bố cục camera dùng luồng video mô phỏng, không thay thế thử camera/GPS thật.
- Excel theo yêu cầu cuối chỉ còn 5 trang: Bảng công công nhân, Chi tiết công nhân, Bảng công giám sát, Chi tiết giám sát, Lịch sử điều chỉnh. Không xuất văn phòng, trang hướng dẫn, ma trận ký hiệu, màu nền hoặc trang ẩn. Dữ liệu ngày được trình bày thành từng dòng, có giờ trong ca, công quy đổi nếu đã tổng hợp, tăng ca đã xác nhận/chờ xác nhận, nghỉ mưa cho công nhân, phút trễ/về sớm và trạng thái. Ngày thiếu dữ liệu ghi rõ, không tự gán vắng. Snapshot trùng nhân viên/ngày chỉ tính một lần, ưu tiên kỳ đã khóa, sau đó lần tổng hợp mới nhất. Lịch sử điều chỉnh giữ nguyên nội dung. Chưa có đơn giá lương nên không suy đoán tiền lương hoặc hệ số tăng ca.
- Migration 202611120007 giữ nguyên kiểm tra phiên bản/khóa kỳ của RPC cũ và lưu bổ sung phút tăng ca, chờ xác nhận, nghỉ mưa, đến sau giờ có mặt. Đã kiểm tra đọc lại cả ngày và tổng tháng bằng giao dịch rollback TEST.
- Typecheck, build và 1.380 ca kiểm thử đạt tại lần rà soát này; các ảnh và bản Excel xuất thử nằm trong `test-results/mobile-fixes-20261112/`. Production giữ nguyên.

## Yêu cầu phát hành tiếp theo

- Người dùng sau đó yêu cầu rõ ràng triển khai production; yêu cầu TEST trước ở các mục lịch sử trên đã được thay thế. Migration 1–7 được diễn tập bằng giao dịch rollback, sau đó áp dụng trên production, kiểm tra giữ nguyên dữ liệu hồ sơ/tài khoản/công và chỉ chuyển nhóm engineer sang supervisor theo yêu cầu gộp trước đó. Không đưa dữ liệu TEST sang production.
- Bỏ chấm trạng thái trong lịch công cá nhân để số ngày cân giữa. Nút quay lại mặc định chỉ có mũi tên, vẫn có nhãn truy cập; đặt bên trái cùng hàng tiêu đề khi có PageHeader, giảm khoảng trống trên cả máy tính và điện thoại.
- Bỏ lật ngang phần video xem trước. Khung video và JPEG chụp ra giữ cùng chiều gốc ở cả camera trước/sau. Kiểm tra bằng luồng video màu bất đối xứng và đọc pixel JPEG, không thay cho thử camera vật lý.
- Theo đính chính của người dùng, chỉ tạo thêm `congtruong01.test`, `congtruong02.test`, `congtruong03.test` trên database TEST, vai trò supervisor, phân công gói A/B/A. Không tạo tài khoản thử trên production và không đổi mật khẩu các tài khoản TEST hiện có.
- Bổ sung lựa chọn Loại điểm danh (Trong ca/Tăng ca) trực tiếp trong màn đối soát. Đưa xác nhận đồng ý và thao tác bắt đầu tăng ca lên trước danh sách gói; từ chi tiết lượt trong ca có liên kết Chấm tăng ca, giữ đúng gói/công trường và mở sẵn chế độ tăng ca. Kiểm tra tạo nháp khi đã có lượt trong ca trên Chrome/Safari 320/390/1440px, chặn toàn bộ ghi nghiệp vụ trong bài kiểm tra giao diện.
- Tạo gói bắt buộc chọn Cảng chuyên dụng hoặc Cảng tổng hợp. Form hiển thị giờ ca, hạn có mặt 07:50/07:20 và quy đổi đủ ca 8 giờ. Migration 202611120008 tạo RPC service-only kiểm tra quyền project.create và lưu gói + shift_assignments phạm vi project trong cùng giao dịch, thứ Hai–thứ Bảy. Phân ca được dùng chung cho công nhân và giám sát. Không thêm lựa chọn mặc định, không đoán cảng cho gói cũ; hồ sơ gói đọc lại phân ca đang hiệu lực và phiên bản giờ ca tương ứng.

## Đính chính nghiệp vụ ngày 13/11/2026

Người dùng yêu cầu khôi phục production về bản đúng trên máy này sau deploy nhầm từ máy khác; nghiệp vụ mới triển khai trên TEST. Trên TEST bỏ chọn cảng khi tạo gói, để giám sát chọn cảng sau khi chọn gói/công trường cho từng lượt điểm danh; thêm sửa/xóa gói và sửa danh sách gói cho giám sát luân phiên. Phần tạo gói bắt buộc cảng ở mục lịch sử bên trên được thay thế trên TEST. Chi tiết artifact, phạm vi môi trường và kiểm chứng tại `docs/operations/recovery-20261113.md`.

Phản hồi tiếp theo yêu cầu sửa trực tiếp production do khôi phục đơn thuần chưa giải quyết luồng vận hành. Đã triển khai bản sửa đường dẫn, sửa/xóa gói, giám sát thấy gói không cần phân công/duyệt trước và chọn công nhân linh hoạt lên cả production/TEST. TEST vẫn chỉ giám sát đăng nhập. Xem biên bản hiện hành `docs/operations/package-fix-20261113.md`.
