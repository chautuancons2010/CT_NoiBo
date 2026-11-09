# Luồng nghiệp vụ hệ thống Châu Tuấn

Tài liệu này mô tả cách các phân hệ hiện có phối hợp trong vận hành công ty xây dựng. Đây là chuẩn quy trình nội bộ để phát triển và UAT; không thay thế quy định kế toán, thuế hoặc quy trình đã được Ban giám đốc phê duyệt.

## Nguyên tắc thiết kế

- Mỗi nghiệp vụ có một nguồn dữ liệu chính; dữ liệu tổng hợp chỉ đọc từ nguồn đó.
- Màn hình cần dẫn người dùng theo thứ tự: chọn đúng đối tượng/phạm vi → nhập hoặc rà soát → kiểm tra điều kiện → gửi duyệt/ghi sổ → theo dõi kết quả.
- Trạng thái phải thể hiện được việc cần làm tiếp theo. Chứng từ đã ghi sổ được sửa bằng nghiệp vụ đảo/điều chỉnh có lý do, không sửa dữ liệu lịch sử.
- Công trình, công trường, kỳ, kho và phạm vi nhân viên phải được giữ xuyên suốt từ chứng từ nguồn đến màn hình theo dõi/báo cáo.
- Cảnh báo dữ liệu thiếu, trùng, quá hạn hoặc sai đối chiếu phải gắn với bản ghi và hành động xử lý cụ thể; không chỉ đổi màu.
- Quyền được kiểm tra ở server theo vai trò và phạm vi dữ liệu. Ẩn nút trên giao diện không thay thế kiểm tra quyền.

## Luồng theo phân hệ

| Nghiệp vụ | Luồng chuẩn trong ứng dụng | Kiểm soát trước khi hoàn tất |
| --- | --- | --- |
| Hồ sơ nhân sự và tài khoản | Tạo hồ sơ theo mã nhân viên → gán phòng ban/chức vụ/hợp đồng → mời hoặc cấp tài khoản → gán quyền tối thiểu → cập nhật điều chuyển/nghỉ việc | Mã nhân viên duy nhất; dữ liệu nhạy cảm theo quyền; khóa quyền truy cập khi offboard |
| Chấm công văn phòng | Chọn ca/ngày → ghi nhận vào/ra → nhân viên theo dõi → HR xử lý ngoại lệ → đối chiếu lịch và nghỉ phép | Không gộp nguồn chấm công cá nhân với điểm danh công trường; thao tác đồng bộ lặp không tạo bản ghi trùng |
| Điểm danh công trường | Chọn công trình/công trường và ngày → mở phiên → xác nhận danh sách → ghi nhận trạng thái/evidence → giám sát rà soát → hoàn tất phiên | Đúng site, roster và policy ảnh/vị trí; xử lý thiếu hoặc không khớp trước khi khóa kỳ |
| Nghỉ phép | Nhân viên chọn loại và ngày → kiểm tra số dư/đính kèm → gửi duyệt → người có thẩm quyền duyệt hoặc từ chối → cập nhật sổ nghỉ chính thức | Không tự sửa số dư; lưu lịch sử quyết định và lý do; dữ liệu nghỉ được đưa vào đối chiếu bảng công |
| Bảng công | Mở kỳ → tổng hợp dữ liệu chấm công, nghỉ và lịch → xử lý ngoại lệ → gửi duyệt/khóa kỳ → xuất báo cáo | Phiên đã khóa chỉ được mở lại bởi người có quyền và có audit; đối chiếu số nhân viên, ngày công và phiên bản nguồn |
| Lương và phiếu lương | Chọn kỳ → xác nhận nguồn bảng công và hồ sơ lương → tính lương → kiểm tra đầu vào/dòng âm/thay đổi phiên bản → khóa và duyệt → phát hành phiếu lương → nhân viên xác nhận | Nếu bảng công, danh sách nhân viên hoặc lịch sử lương đổi sau khi tính thì phải tính lại; không phát hành khi thiếu người nhận hoặc kỳ chưa khóa |
| Công trình và công trường | Khai báo công trình/site → giao người phụ trách và thời hạn → cập nhật tiến độ/evidence → ghi nhận vấn đề → giao người xử lý → theo dõi đến khi đóng | Vấn đề cần người phụ trách và hạn xử lý; cập nhật giữ được lịch sử; phạm vi dữ liệu theo công trình được giao |
| Vật tư và kho | Khai báo kho, mặt hàng, đơn vị tính → lập phiếu nhập/xuất/điều chuyển hoặc điều chỉnh → rà soát dòng hàng và số tồn → ghi sổ → tra sổ kho/tồn → kiểm kê và xử lý chênh lệch | Chỉ sửa nháp; chặn âm kho theo chính sách; ghi sổ tạo ledger; điều chỉnh/đảo cần lý do; kiểm kê theo expected → counted → variance → post |
| Lô hàng XNK | Khai báo đối tác/hợp đồng/lô → cập nhật mốc vận chuyển và ETA → lưu chứng từ phiên bản → theo dõi hải quan → nhận hàng một phần/toàn phần vào kho → xử lý thiếu thừa → đóng lô | Chỉ chuyển trạng thái hợp lệ; nhận không vượt số lượng còn lại trừ khi có dung sai và lý do; thiếu hàng phải được xử lý trước khi đóng |
| Phê duyệt | Người lập gửi yêu cầu → chụp phiên bản quy trình hiện hành → người được giao xem nội dung/evidence → duyệt, từ chối hoặc chuyển người xử lý kèm lý do → lưu quyết định | Quyết định không bị thay đổi bởi cấu hình quy trình mới; người duyệt phải có quyền trên hồ sơ và đúng bước hiện tại |
| Báo cáo và xuất dữ liệu | Chọn kỳ/phạm vi công trình/phòng ban → xem số liệu tổng hợp → đối chiếu với danh sách nguồn → xuất khi có quyền | Giữ cùng bộ lọc trên màn hình và tệp xuất; xuất dữ liệu nhạy cảm cần quyền, mục đích công việc và audit |

## Luồng liên phân hệ ưu tiên

### Nhân sự đến kỳ lương

`Hồ sơ nhân sự + lịch sử lương` → `chấm công và nghỉ phép` → `đối chiếu/khóa bảng công` → `tính và rà soát lương` → `duyệt/khóa kỳ` → `phát hành phiếu lương` → `nhân viên xác nhận`.

Điểm chặn chính là tính lại khi đầu vào hoặc phiên bản nguồn đã đổi. Bảng công đã khóa và phiếu lương đã phát hành phải có lịch sử thay đổi, không sửa ngầm.

### Công trình đến vật tư

`Công trình/công trường` → `theo dõi tiến độ và vấn đề` → `lô hàng/tiếp nhận` → `phiếu nhập kho` → `cấp phát hoặc điều chuyển` → `sổ kho và kiểm kê` → `đối chiếu theo công trình`.

Mỗi phiếu nhập từ XNK phải tham chiếu lô và dòng hàng; nhận một phần cập nhật số còn lại. Nhu cầu mua hàng, nhà cung cấp, đơn đặt hàng và công nợ phải trả chưa phải là chuỗi nghiệp vụ đầy đủ trong phạm vi ứng dụng hiện tại.

### Duyệt nghiệp vụ

`Tạo bản nháp` → `kiểm tra dữ liệu/quyền` → `gửi duyệt` → `đúng người, đúng bước` → `duyệt/từ chối/chuyển xử lý kèm lý do` → `ghi sổ hoặc cập nhật sổ nghiệp vụ` → `tra cứu lịch sử`.

Không coi “đã duyệt” và “đã ghi sổ” là cùng một trạng thái nếu nghiệp vụ còn bước ghi nhận chính thức.

## Phạm vi hiện tại và khoảng trống

Ứng dụng hiện tập trung vào vận hành nội bộ công ty xây dựng: HR, chấm công, nghỉ phép, bảng công/lương, công trình, kho, XNK, phê duyệt, báo cáo và tích hợp. Không nên biểu diễn các chức năng kế toán chưa có như đã hoàn tất chỉ vì MISA có các phân hệ đó.

Các phân hệ cần quyết định riêng trước khi phát triển tiếp: yêu cầu mua hàng và đơn đặt hàng; nhà cung cấp và công nợ phải trả; bán hàng/nghiệm thu, hóa đơn và công nợ phải thu; quỹ/ngân hàng; sổ cái, thuế, giá thành công trình và báo cáo tài chính. Mỗi mục cần chủ quy trình, chứng từ nguồn, quyền duyệt, cách xử lý điều chỉnh và yêu cầu pháp lý được xác nhận.

## Tham khảo và cách áp dụng

- [MISA SME – Quy trình nghiệp vụ](https://helpsme.misa.vn/2026/kb/quy-trinh-nghiep-vu/): tham khảo cách tổ chức công việc hằng ngày, tháng/quý và cuối năm, gồm kiểm kê, đối chiếu chứng từ/sổ sách và khóa kỳ. Đây là quy trình kế toán MISA; ứng dụng nội bộ chỉ áp dụng phần phù hợp với các phân hệ đang có.
- [Dtech – Giá thành dịch vụ](https://huongdanketoan.dtechvn.com/cuoi-ky/gia-thanh/gia-thanh-dich-vu): tham khảo cách theo dõi chi phí theo công trình/vụ việc từ vật liệu, nhân công và chi phí chung đến doanh thu, giá vốn và kiểm tra báo cáo. Ứng dụng cần xác định phạm vi giá thành trước khi triển khai sổ kế toán.
- [Dtech – Kiểm tra chứng từ, thao tác cuối kỳ, sổ sách](https://huongdanketoan.dtechvn.com/tien-ich/kiem-tra-chung-tu-thao-tac-cuoi-ky-so-sach): tham khảo việc chạy đối chiếu có kịch bản, kỳ kiểm tra và chi tiết lỗi để người dùng xử lý.
- [Dtech – Khai thác báo cáo](https://huongdanketoan.dtechvn.com/bao-cao/khai-thac-bao-cao): tham khảo lọc kết hợp theo kỳ, đối tượng và công trình; giữ điều kiện lọc rõ ràng khi đọc và xuất báo cáo.

Các nguồn trên dùng để tham khảo cấu trúc quy trình và cách kiểm soát. Quy định pháp lý hiện hành và nghiệp vụ đã được doanh nghiệp phê duyệt luôn là nguồn quyết định.
