# Kế hoạch hoàn thiện nhập Excel GPS Bình Minh

Ngày lập: 10/10/2026. Phạm vi: hoàn thiện chức năng nhập dữ liệu xe dựa trên hai file thô khách hàng đã cung cấp, nối vào phân hệ hiện có và chuẩn bị kiểm thử bằng dữ liệu thật. Tài liệu này là kế hoạch, chưa phải báo cáo triển khai thành công.

## 1. Kết quả cần đạt

Tại **Đội xe → Nhật ký & Đối soát GPS**, người dùng chọn hoặc kéo thả Excel tải từ Bình Minh. Hệ thống tự nhận loại báo cáo, xe và thời gian từ nội dung, xem trước dữ liệu mới/trùng/cần cập nhật, sau đó lưu vào cơ sở dữ liệu. Nhập lại hoặc nhập các kỳ chồng nhau không cộng trùng. Dữ liệu đã nhập phải còn sau khi tải lại trang, đổi trình duyệt và chuyển qua báo cáo.

Giữ giao diện nghiệp vụ đang có, tập trung hoàn thiện một luồng dùng được từ đầu đến cuối. Chưa mở rộng thiết kế toàn bộ phân hệ hoặc bổ sung nhiều màn hình mới.

Đề xuất triển khai theo thứ tự:

1. Đọc đúng hai mẫu và có bộ dữ liệu kiểm thử với kết quả đối chiếu cụ thể.
2. Lưu bền vững, nhận diện trùng và cập nhật có lịch sử.
3. Thay cửa sổ nhập minh họa bằng thao tác chọn file, xem trước và xác nhận thật.
4. Nối nhật ký, khoảng dừng, dữ liệu theo ngày và báo cáo vào cùng nguồn đã nhập.
5. Kiểm thử nhập lại, chồng kỳ, sửa dữ liệu và bảo vệ kết quả đã duyệt.

**Giới hạn cần giữ:** hai file mới đủ để làm chức năng nhập thực tế, nhưng không đủ để tự xác nhận máy nổ thật, xác định tài xế hay duyệt tiền tăng ca. Hệ thống phải thể hiện được phần dữ liệu này còn thiếu.

## 2. Kết quả kiểm tra file khách cung cấp

Đã đọc toàn bộ cả hai workbook. Mỗi workbook có một sheet `Sheet1`, không có sheet/dòng/cột ẩn và không có công thức. Cả hai có hàng 1 trống, tiêu đề tại hàng 2, khoảng xuất báo cáo tại hàng 3, tên cột tại hàng 4. Khi triển khai phải nhận diện theo nội dung tiêu đề, không chỉ cố định số hàng.

### 2.1 Báo cáo tổng hợp tháng 8 của Hino

Nguồn: [Báo cáo tổng hợp - tháng 8- hino.xlsx](<C:/Users/nhatb/Documents/antigravity/noble-fermi/docs/Phân hệ xe/dữ liệu thô/Báo cáo tổng hợp - tháng 8- hino.xlsx>).

| Thuộc tính | Giá trị đã kiểm tra |
|---|---|
| Vùng dữ liệu | `Sheet1!A1:S36` |
| Tiêu đề | A2: Báo cáo tổng hợp |
| Khoảng xuất | A3: 00:00:00 01/08/2026 đến 23:59:59 31/08/2026 |
| Xe | 51D98246, có ở từng dòng cột B |
| Dữ liệu ngày | Hàng 5–35, đúng 31 ngày lịch |
| Dòng tổng | Hàng 36, có nhãn `Tổng 31`; dùng đối chiếu, không nhập thành một ngày |
| Kiểu ngày | Ngày Excel tại cột E |
| Kiểu thời lượng | Chuỗi giờ:phút:giây; tổng tháng có thể vượt 24 giờ |

Tổng tự cộng từ 31 dòng khớp dòng tổng nguồn:

| Chỉ số | Kết quả dùng làm mốc kiểm thử |
|---|---:|
| Km GPS | 7.682,0 km |
| Thời gian lăn bánh | 143:43:00 = 517.380 giây |
| TG làm việc theo báo cáo nguồn | 211:29:00 = 761.340 giây |
| Số lần dừng đỗ theo nguồn | 1.263 |
| Số lần quá tốc độ theo nguồn | 21 |
| Số lần quá thời gian liên tục 4h theo nguồn | 9 |
| NL tiêu thụ thực tế theo nhãn nguồn | 844 lít |
| Ngày có km GPS lớn hơn 0 | 24 ngày |

Điểm phải xử lý đúng:

- Ngày 08/08: km = 0, TG làm việc = 00:37:00, nhiên liệu = 2 lít. Không loại dòng chỉ vì km bằng 0.
- Ngày 16/08: km = 0 nhưng TG làm việc = 00:07:00.
- Ngày 31/08: km = 0 nhưng TG làm việc = 07:32:00. Không suy ra đây là 7 giờ 32 phút tăng ca hay máy nổ đứng yên.
- Các cột Km Cơ, định mức nhiên liệu km/giờ đều có giá trị 0 trong mẫu. Không lấy chúng ghi đè đồng hồ km hoặc định mức xe đã thiết lập.
- Cột Loại xe ghi `Tải 5`; đây là nhãn nguồn, không phải căn cứ đổi tải trọng cho phép của xe thành 5 tấn.
- `TG làm việc` chưa được chứng minh là giờ máy nổ, giờ có mặt hoặc giờ lao động. Lưu theo đúng nhãn nguồn; chưa ánh xạ vào các đại lượng đó.

### 2.2 Báo cáo hành trình ngày 27/07 của Isuzu

Nguồn: [Báo cáo hành trình 51D69998 27.07.xlsx](<C:/Users/nhatb/Documents/antigravity/noble-fermi/docs/Phân hệ xe/dữ liệu thô/Báo cáo hành trình 51D69998 27.07.xlsx>).

| Thuộc tính | Giá trị đã kiểm tra |
|---|---|
| Vùng dữ liệu | `Sheet1!A1:E345` |
| Tiêu đề | A2: Báo cáo QCVN 06 – Báo cáo hành trình 51D69998 |
| Xe | Lấy từ tiêu đề A2; các dòng không có cột biển số |
| Khoảng xuất | A3: 00:00:00 đến 23:59:59 ngày 27/07/2026 |
| Dữ liệu sự kiện | Hàng 5–345, có 341 dòng |
| Thời gian quan sát đầu/cuối | 00:01:27 đến 18:00:41 ngày 27/07/2026 |
| Trật tự | Đang tăng theo thời gian; không có dòng trùng hoàn toàn hoặc thời điểm trùng trong mẫu |
| Nội dung | Thời điểm, tọa độ, địa chỉ, ghi chú trạng thái |

| Ghi chú nguồn | Số dòng |
|---|---:|
| Xe chạy bình thường | 170 |
| Xe dừng | 78 |
| Xe chạy lại | 77 |
| Mở máy | 5 |
| Tắt máy | 6 |
| Xe mất GPS | 3 |
| Đổ nhiên liệu | 2 |
| Tổng | 341 |

Không có cột điện áp, tốc độ, số km, lít nhiên liệu hoặc người lái. Nhãn “Đổ nhiên liệu” chỉ chứng minh nguồn ghi một sự kiện; không đủ tạo phiếu mua dầu có số lít/tiền. Nhãn mở/tắt máy cần giữ là trạng thái do GPS báo, chưa được đổi thành kết luận máy nổ thật vì tài liệu khách đã nêu trạng thái này có thể bao gồm bật chìa.

Hai file thuộc **hai xe và hai thời kỳ khác nhau**. Chúng kiểm chứng được hai kiểu nhập độc lập; chưa dùng để đối chiếu tổng hợp và hành trình của cùng xe/ngày.

### 2.3 Những kết quả thời gian có thể đối chiếu ngay

Áp dụng ngày công 04:00–04:00 của thiết kế:

- Bốn sự kiện đầu lúc 00:01:27, 00:02:32, 00:03:42 và 00:03:57 thuộc ngày công **26/07/2026**.
- 337 sự kiện còn lại thuộc ngày công **27/07/2026**.
- Khoảng dừng từ 00:01:27 đến 05:16:12 đi qua 04:00: phần ngày công 26/07 là **03:58:33**, phần ngày công 27/07 là **01:16:12**. Tổng vẫn là **05:14:45**.
- Ghép theo nhãn mở/tắt cho ra năm cặp đủ hai đầu. Riêng “Tắt máy” lúc 00:02:32 thiếu mốc mở phía trước; không được tự thêm một mốc 00:00.
- Ghép mỗi “Xe dừng” với lần báo chạy lại/chạy bình thường tiếp theo cho ra 78 khoảng có hai đầu trong mẫu; 10 khoảng có độ dài từ 5 phút. Đây là kết quả theo sự kiện nguồn, chưa chứng minh tắt máy hoặc tính hợp lệ theo lệnh.

Khi chia khoảng dừng qua ngày công, mười khoảng vật lý tạo mười một phần theo ngày. Tổng số dừng toàn kỳ phải đếm theo khoảng gốc, không cộng số phần sau chia thành mười một lần dừng.

## 3. Hiện trạng chức năng đã xây

Đánh giá dựa trên mã nguồn trong workspace; chưa chạy thử trình duyệt hoặc kiểm tra dữ liệu ở cơ sở dữ liệu đang vận hành.

| Thành phần | Hiện trạng đã thấy | Việc cần hoàn thiện |
|---|---|---|
| Trang Nhật ký | Khởi tạo từ `SEED_DAILY_LOGS`, danh mục từ `SEED_VEHICLES` | Đọc dữ liệu thật, lọc theo kỳ nhận diện từ file |
| Nút chọn file | Chỉ chuyển bước giao diện; chưa nhận file từ máy | Thêm chọn file/kéo thả và gửi nội dung lên xử lý |
| Phần xem trước | Số dòng, biển số, thời gian đã ghi sẵn | Lấy kết quả thực từ bộ đọc và so sánh dữ liệu đã lưu |
| Xác nhận nhập | Chỉ hiện thông báo đã cập nhật 10 ngày/24 chặng | Gọi thao tác ghi dữ liệu; chỉ báo thành công sau khi lưu xong |
| Mô hình nhật ký | Buộc nhiều chỉ tiêu phải có số, gắn một ngày công và một tài xế | Cho phép thiếu dữ liệu; tách tổng ngày lịch và chi tiết theo ngày công |
| Lưu trữ/API | Chưa thấy luồng API/bảng GPS trong mã đã rà; API fleet hiện có xe và chuyến | Bổ sung dữ liệu nhập, tổng ngày, sự kiện và lịch sử cập nhật |
| Báo cáo | Dùng seed; xuất tuần có các chỉ tiêu ghi sẵn | Lấy đúng dữ liệu đã nhập và đúng kỳ được chọn |
| Duyệt OT và khóa kỳ | Đang thay đổi trạng thái trong bộ nhớ trang | Phần bảo vệ kết quả phải có dữ liệu và kiểm tra phía server trước khi dùng thật |
| Phân bổ chi phí | Hàm hiện tại chia giả định 60% dự án/40% nội bộ; chưa lọc nguồn theo tháng ở các vòng tính | Không dùng dữ liệu GPS thật để xuất giá thành dự án theo tỷ lệ giả định này |
| Kiểm thử fleet | Chép lại một số hàm tính trong file test, chưa đọc hai Excel khách gửi | Test phải gọi chính bộ đọc/dịch vụ thực và kiểm kết quả đã lưu |

Như vậy, công việc không chỉ là sửa tên cột Excel. Cần nối giao diện hiện tại với việc đọc file, lưu dữ liệu và truy vấn thật. Giữ phần bố cục phù hợp; loại các số mẫu khỏi đường sử dụng dữ liệu thật.

## 4. Phạm vi hoàn thiện đợt này

### 4.1 Bắt buộc để khách kiểm thử

- Chọn một/nhiều file `.xlsx`; đọc mọi sheet có dữ liệu, tự nhận hai mẫu hiện tại.
- Tự nhận biển số và kỳ từ nội dung; người dùng chỉ sửa khi ghép không được hoặc có xung đột.
- Nhập tổng ngày theo ngày lịch, sự kiện theo thời điểm, tự chia ngày công khi có chi tiết.
- Xem trước số dòng mới, không đổi, cập nhật, xung đột, lỗi; xác nhận nhập một lần cho phần hợp lệ.
- Lưu dữ liệu thật và file gốc; nhập lại không nhân đôi; cập nhật có phiên bản và lý do.
- Xem lịch sử đợt nhập, lỗi theo file/sheet/dòng và dữ liệu nguồn của nhật ký.
- Nhật ký/báo cáo tháng xem được số thực và các chỉ tiêu chưa có dữ liệu.
- Kiểm thử lại sau tải lại trang và kiểm tra qua tài khoản có quyền khác nhau.

### 4.2 Giữ ở trạng thái chưa đủ căn cứ

Chưa tự trả tiền OT, xác định tiêu hao theo tài xế, tạo hóa đơn/chi phí dầu từ nhãn sự kiện, tính km từ đường nối tọa độ, xác nhận máy nổ thật hoặc tự chia chi phí dự án theo một tỷ lệ cố định.

CSV và XLS chỉ mở trên giao diện khi có bộ đọc và ca kiểm thử tương ứng. Trong đợt này, `.xlsx` là định dạng đã có mẫu kiểm chứng. Không cần một màn hình tự thiết kế ánh xạ cột cho mọi nhà cung cấp; chỉ cần hai cấu hình đọc Bình Minh rõ ràng, có phiên bản.

## 5. Ánh xạ dữ liệu hai mẫu

### 5.1 Báo cáo tổng hợp

| Cột hiện tại | Trường nguồn | Cách lưu và sử dụng |
|---|---|---|
| A | STT | Chỉ giữ để truy nguồn; không phải khóa bản ghi |
| B | Biển số | Chuẩn hóa và ghép xe thật trong cùng công ty |
| C, D | Loại hình KD, Loại xe | Thông tin nguồn; không tự sửa hồ sơ/tải trọng xe |
| E | Ngày tháng | Ngày lịch của báo cáo, không gắn nhãn ngày công 04h |
| F | TG lăn bánh | Chuyển `HH:mm:ss` thành giây; không dùng kiểu giờ trong ngày |
| G | Km Gps | Quãng đường GPS trong ngày, số thập phân |
| H | Km Cơ | Giữ số nguồn; chưa xác minh nghĩa trường nên không cập nhật đồng hồ xe |
| I | SL dừng đỗ | Số đếm do nhà cung cấp báo; không bằng số dừng ≥5 phút do ERP suy từ hành trình |
| J | SL quá tốc độ | Số đếm nguồn; không dựng thêm các lần vi phạm có thời điểm giả |
| K, L, M | Mở cửa, mở máy lạnh, TG máy lạnh | Giữ dữ liệu nguồn; chưa thêm KPI/màn hình riêng |
| N | TG làm việc | `reportedWorkingSeconds`, nhãn “TG làm việc theo GPS”; chưa dùng cho giờ có mặt/máy nổ/OT |
| O | SL quá thời gian liên tục 4h | Số đếm nguồn, chưa xác định người chịu trách nhiệm |
| P | NL tiêu thụ thực tế (L) | Nhiên liệu tiêu thụ do GPS báo, giữ nguồn; không phải lượng mua hay khoản chi |
| Q, R | NL theo định mức km/giờ | Giá trị do Bình Minh báo; không ghi đè định mức của ERP |
| S | Act | Không có nội dung nghiệp vụ trong mẫu; giữ khi cần truy nguồn, bỏ khỏi bảng nhập chính |

Hàng tổng chỉ dùng kiểm tra số ngày, km, thời lượng và số đếm. Sai tổng hoặc trùng ngày khác số phải được nêu trước nhập; không tự chọn số tổng thay thế các dòng ngày. File thiếu cột bắt buộc để nhận diện/ngày/xe thì dừng nhóm đó; thiếu một chỉ tiêu phụ chỉ làm chỉ tiêu ấy chưa có dữ liệu.

Mặc định giữ nhóm có tổng không khớp ở trạng thái cần đối chiếu, chưa xác nhận nhập nhóm đó; các nhóm độc lập sạch lỗi vẫn có thể nhập. Bản xuất chỉ một phần kỳ phải có phạm vi tương ứng hoặc được người dùng xác nhận là nguồn không đầy đủ; không lấy 31 dòng kỳ vọng từ tiêu đề để giả tạo những ngày không có trong bảng.

### 5.2 Báo cáo hành trình

| Vị trí | Trường | Cách lưu |
|---|---|---|
| A2 | Tiêu đề có biển số | Nhận loại báo cáo và biển số; chuẩn hóa cách viết biển số |
| A3 | Khoảng xuất báo cáo | Phạm vi nguồn khai báo; tách khỏi thời gian sự kiện đầu/cuối |
| A | STT | Số thứ tự nguồn để xem lại; không dùng làm định danh sự kiện |
| B | Thời điểm | Thời điểm đầy đủ ngày, giờ, phút, giây theo Việt Nam |
| C | Tọa độ | Tách vĩ độ/kinh độ từ chuỗi, giữ độ chính xác và giá trị gốc |
| D | Địa chỉ | Giữ nguyên chuỗi nguồn; không tự sửa địa danh theo suy đoán |
| E | Ghi chú | Chuẩn hóa vào nhóm sự kiện đã biết và giữ nhãn gốc |

Nhãn chưa biết vẫn được giữ dưới loại “Khác/chưa nhận diện” kèm cảnh báo; không bỏ mất sự kiện. Mất tọa độ không đồng nghĩa mất được cả thời điểm, nhưng dòng đó không được dùng xác nhận địa điểm. Tọa độ không hợp lệ phải báo, không thay bằng vị trí xe mặc định.

Hai mẫu đều dùng ngày Excel. Bộ đọc phải hỗ trợ ngày số của workbook và chuỗi ngày giờ theo định dạng đã nhận diện; xử lý đúng hệ ngày Excel. Không chuyển ngày Excel sang UTC rồi cắt chuỗi để lấy ngày nghiệp vụ vì có thể lệch ngày Việt Nam.

## 6. Tự chia thời gian và tạo dữ liệu dùng được

### 6.1 Tách ba thông tin thời gian

Mỗi nguồn giữ riêng:

1. **Khoảng được chọn khi xuất:** lấy ở tiêu đề, ví dụ cả ngày 27/07.
2. **Khoảng có dữ liệu quan sát:** min/max thời điểm của các dòng, ví dụ 00:01:27–18:00:41.
3. **Ngày dùng cho nghiệp vụ:** ngày lịch của tổng hợp hoặc ngày công tính từ từng sự kiện/khoảng có chi tiết.

Không lấy tháng/ngày từ tên file làm căn cứ chính. Không buộc người dùng chọn tháng nhập khi nội dung đã có ngày. Tên file khác nội dung thì cảnh báo; ngày từng dòng là dữ liệu dùng để phân kỳ sau khi kiểm tra với tiêu đề.

File hành trình 27/07 bao phủ ngày lịch, vì vậy chỉ chứa phần cuối ngày công 26/07 và chưa chứa 00:00–04:00 ngày 28/07 để khép đủ phạm vi ngày công 27/07. Hai ngày công được tạo để xem phần đã có, mang trạng thái thiếu phủ đầu/cuối tương ứng. Nhận đủ 341 dòng không đồng nghĩa đủ cả hai ngày công. Cũng không dùng mốc quan sát cuối 18:00:41 để khẳng định chắc chắn xe không có hoạt động về sau.

### 6.2 Tổng ngày lịch

File tổng hợp Hino tạo 31 bản tổng ngày lịch 01–31/08/2026. Không phân bổ tỷ lệ 4/24 và 20/24 để giả lập ngày công 04h. Chưa có hành trình cùng xe/kỳ thì các số này xem được trong chế độ “Theo ngày báo cáo GPS”, còn chỉ tiêu cần ngày công vẫn chưa có.

Tổng ngày bằng 0 được nhập như số nguồn đã báo, không xóa thành ngày thiếu. Tuy nhiên không tự khẳng định xe nghỉ hoặc không có mọi hoạt động chỉ vì km = 0. Giữ các chỉ tiêu khác của cùng ngày và trạng thái độ đầy đủ.

### 6.3 Sự kiện và khoảng vận hành

Sắp xếp theo thời điểm, sau đó xử lý hai chuỗi trạng thái độc lập: trạng thái di chuyển và trạng thái mở/tắt do thiết bị báo. Không coi “Tắt máy” là “Xe chạy lại”, hoặc “Xe mất GPS” là “Xe dừng”.

| Dữ liệu gặp | Cách xử lý |
|---|---|
| Xe dừng → Xe chạy lại/chạy bình thường | Tạo khoảng dừng theo nguồn, giữ mốc đầu/cuối và các sự kiện ở giữa |
| Nhiều lần Xe dừng liên tiếp | Giữ mốc dừng đầu, thêm bằng chứng; không tự sinh nhiều khoảng chồng nhau |
| Mở máy → Tắt máy | Tạo khoảng trạng thái máy theo nguồn; chưa xác nhận là máy nổ thật |
| Tắt máy không có mốc mở trước | Giữ sự kiện thiếu đầu và yêu cầu đối chiếu; không tự thêm đầu ngày |
| Mở máy lặp khi đang mở | Gắn bất thường chuỗi trạng thái; không cộng chồng giờ |
| Hết file khi khoảng chưa đóng | Để thiếu cuối; không tự lấy 23:59:59 hoặc 04:00 làm mốc đóng thật |
| Xe mất GPS | Giữ dấu mất tín hiệu và khoảng tới bản tin khôi phục; hạ mức tin cậy những kết quả phụ thuộc đoạn đó |
| Đổ nhiên liệu | Ghi sự kiện để đối chiếu với phiếu đổ dầu; không tự đặt số lít, giá hoặc hóa đơn |

Ba sự kiện mất GPS của mẫu nằm lúc 06:11:53, 10:51:19 và 11:46:34. Khoảng dài giữa hai bản tin không tự động là mất GPS: ví dụ từ “Tắt máy” 00:03:57 đến “Mở máy” 05:14:48 phải giữ đúng chuỗi nguồn, không tự gắn lỗi mất tín hiệu chỉ vì cách nhau hơn 5 giờ.

Khoảng dừng đủ điều kiện ≥5 phút được xác định trên khoảng gốc rồi mới cắt ở 04:00. Mỗi phần giữ cùng định danh khoảng gốc để xem và cộng đúng. Điểm dừng không có lệnh vẫn được lưu; nhập file không được yêu cầu tạo lệnh giả trước.

Các khoảng máy qua 00:00 và 04:00 được chia đúng bốn khung trong thiết kế. Với mẫu hiện có, có thể kiểm tra phép cắt giờ dưới nhãn **“Theo trạng thái GPS, chưa đủ căn cứ duyệt”**:

| Ngày công | Khung | Thời lượng ứng viên từ các cặp đủ đầu/cuối |
|---|---|---:|
| 26/07/2026 | 00:00–04:00 ngày hôm sau | 00:00:15 |
| 27/07/2026 | 04:00–08:00 | 02:39:23 |
| 27/07/2026 | 17:00–22:00 | 01:00:41 |

Những số này dùng kiểm thuật toán chia thời gian, không phải giờ OT đã được xác nhận. Khoảng thiếu đầu, mất GPS, chưa có tài xế/lệnh hoặc trạng thái máy chưa kiểm chứng phải hiện riêng; không dùng kết quả ứng viên để tự sinh tiền được trả.

### 6.4 Ghép giữa các đợt nhập

Tạo các khoảng từ tập sự kiện hiệu lực đã lưu của xe, không tạo riêng theo từng file. Nhập ngày trước/ngày sau phải có thể hoàn thiện đầu hoặc cuối khoảng đang thiếu.

Khi có thay đổi, tính lại từ mốc trạng thái tin cậy trước vùng ảnh hưởng đến mốc đóng/ổn định sau vùng ảnh hưởng. Không chỉ tính lại ngày tên trên file, vì khoảng có thể chạy qua ngày công hoặc nối sang file khác. Đặt giới hạn xử lý hợp lý và đánh dấu cần đối chiếu nếu không tìm được hai đầu, thay vì kéo một trạng thái ra nhiều ngày vô hạn.

Giữ phân loại điểm dừng, ghi chú và ảnh của người dùng theo định danh ổn định của sự kiện/khoảng nguồn. Nếu sửa thời điểm làm khoảng tách/gộp và không còn ghép chắc chắn, đưa phần phân loại cũ vào cần đối chiếu; không âm thầm xóa hoặc gán sang một điểm khác.

## 7. Bỏ trùng và cập nhật

### 7.1 Nguyên tắc nhận diện

| Loại | Khóa nhận diện đề xuất | Nội dung được so sánh khi nhập lại |
|---|---|---|
| File | Dấu vân tay nội dung và phiên bản bộ đọc | Phát hiện tải lại đúng file; tên file không quyết định trùng |
| Tổng ngày | Công ty + nguồn Bình Minh + xe + ngày lịch | Km, thời lượng, nhiên liệu, số đếm và trường nguồn |
| Sự kiện hành trình | Công ty + nguồn Bình Minh + xe + thời điểm đầy đủ + loại sự kiện chuẩn hóa | Tọa độ, địa chỉ, ghi chú gốc và các thuộc tính nguồn |
| Khoảng dừng/máy | Định danh sự kiện đầu và quan hệ sự kiện cuối, có phiên bản | Kết quả tính lại; không thêm một khoảng chỉ vì đổi file nguồn |

Không dùng STT, số dòng Excel, tên file, số thứ tự xe trong danh sách hoặc tháng được chọn trên giao diện làm khóa. Một thời điểm có hai loại sự kiện khác nhau có thể là hợp lệ; không loại chỉ vì cùng giây.

### 7.2 Chính sách mặc định trên màn hình nhập

**Thêm mới, bỏ qua dữ liệu giống hệt, cập nhật dữ liệu nguồn thay đổi sau khi người dùng xác nhận bản xem trước.** Một lần xác nhận cho cả đợt là đủ với các cập nhật thông thường ở kỳ mở; không bắt duyệt từng dòng không có vấn đề.

| Trường hợp | Kết quả |
|---|---|
| Chưa có khóa nghiệp vụ | Thêm mới |
| Cùng khóa, các giá trị chuẩn hóa giống nhau | Không đổi; ghi số dòng trùng và giữ truy nguồn cần thiết |
| Cùng khóa, một hoặc nhiều giá trị nguồn khác | Xếp vào Cập nhật, hiển thị trước/sau; lưu phiên bản cũ khi xác nhận |
| Dòng nguồn không cung cấp một trường | Không xóa trường có nguồn khác hoặc người dùng đã bổ sung |
| Cùng khóa nhưng có hai giá trị khác nhau ngay trong đợt nhập nhiều file | Xung đột; phải chọn nguồn ưu tiên hoặc loại nhóm liên quan trước khi lưu |
| Dữ liệu ERP đã điều chỉnh bằng tay | Giữ điều chỉnh và lịch sử; cho đối chiếu số GPS mới, không ghi đè tùy tiện |
| Căn cứ đã dùng duyệt/chốt | Lưu bản mới chờ xử lý, giữ kết quả đang hiệu lực; người có quyền quyết định điều chỉnh |

Việc tải lên sau không chứng minh nhà cung cấp vừa sửa dữ liệu. Bản xem trước phải nêu rõ đang dùng file người dùng chọn để thay số nguồn nào; tránh âm thầm áp quy tắc “lần nhập cuối luôn đúng”.

### 7.3 Khi thời điểm hoặc loại sự kiện bị sửa

File hành trình không có mã sự kiện ổn định của nhà cung cấp. Nếu sửa thời điểm hoặc loại, khóa ở trên cũng đổi; không thể tự biết chắc đó là sự kiện mới hay bản sửa của một sự kiện cũ.

Trong vùng thời gian chồng nhau, hệ thống so tập sự kiện cũ/mới. Các trường hợp sự kiện cũ mất đi và xuất hiện sự kiện mới gần đó được đưa vào nhóm “Cần đối chiếu thay thế”, chỉ gợi ý cặp, không tự ghép theo khoảng cách thời gian. File xuất thiếu một phần không đồng nghĩa các sự kiện cũ đã bị xóa.

Cho thao tác phụ **“Thay thế dữ liệu nguồn trong phạm vi đã chọn”** khi người dùng xác nhận file là bản đầy đủ cho xe/loại báo cáo/khoảng đó. Xem trước cả dòng sẽ ngừng hiệu lực, giữ lịch sử và kiểm tra kỳ khóa. Không có nút xóa toàn tháng chung cho mọi xe/loại dữ liệu.

Đây là giới hạn thực tế của định dạng nguồn, cần ghi rõ thay vì hứa tự cập nhật chính xác mọi thay đổi mà không có mã gốc.

### 7.4 Tính nhất quán khi xác nhận

Máy chủ xử lý file và quyết định thay đổi; không tin các tổng hoặc biển số do trình duyệt tự khai. Một lần xác nhận có mã thao tác duy nhất. Bấm hai lần, gửi lại khi mất mạng hoặc hai người nhập cùng dữ liệu không được tạo hai bản hiệu lực.

Xem trước lưu dấu phiên bản dữ liệu đã so. Nếu dữ liệu thay đổi trước khi xác nhận, báo xem trước cần làm mới thay vì ghi đè một bản người dùng chưa thấy. Ghi nguồn và kết quả liên quan trong giao dịch phù hợp; nếu xử lý theo nhóm xe/ngày, ghi rõ nhóm thành công/chờ lỗi và không đánh dấu ngày đã đủ khi còn thiếu các dòng trong nhóm đó.

## 8. Thiết kế thao tác nhập trên giao diện hiện tại

Giữ nút **Nhập Excel GPS** tại `/apps/doi-xe/nhat-ky`. Dùng ba bước hiển thị, đủ bao phủ việc nhận dạng và đối soát mà không cần trình hướng dẫn dài:

| Bước | Nội dung | Nút chính |
|---|---|---|
| 1. Chọn file | Chọn/kéo thả một hoặc nhiều XLSX, tên/kích thước, loại báo cáo và sheet nhận diện | Đọc và kiểm tra |
| 2. Xem trước | Xe, khoảng nguồn, ngày sẽ tạo, số mới/trùng/cập nhật/lỗi; bảng lỗi và trước/sau | Xác nhận nhập dữ liệu hợp lệ |
| 3. Kết quả | Số đã lưu thực tế, nhóm chưa nhập, nhật ký ảnh hưởng và cảnh báo dữ liệu thiếu | Xem dữ liệu vừa nhập |

Xe được nhận diện từ cột hoặc tiêu đề. Nếu chưa có trong ERP, cho ghép với hồ sơ xe thật hoặc dẫn tới tạo hồ sơ theo quyền; không tự chọn `veh-01`, không lấy tài xế mẫu. Không yêu cầu chọn tháng thủ công khi đã có ngày trong file.

Đối với file Hino, kết quả lần đầu trên môi trường trống phải là **31 ngày tổng hợp**, 01–31/08/2026. Đối với file Isuzu, kết quả phải là **341 sự kiện**, ngày lịch 27/07/2026 và hai ngày công liên quan 26–27/07/2026; không hiện thông báo “10 ngày/24 chặng” ghi sẵn.

Nhật ký có bộ lọc ngày từ–đến, xe và lựa chọn **Theo ngày báo cáo GPS / Theo ngày công**. Nhãn kỳ đi cùng các chỉ số, tránh một bảng trộn 7.682 km ngày lịch với OT ngày công như cùng một phạm vi. Sau nhập mở đúng xe/khoảng vừa nhập; không giữ mặc định tháng 10 làm người dùng tưởng mất dữ liệu tháng 7–8.

Các phần chi tiết: Tổng hợp nguồn, Sự kiện hành trình, Khoảng dừng, Trạng thái máy/giờ ứng viên, Bằng chứng và lịch sử. Đây là các chế độ xem bên trong nhật ký hiện có, không thêm nhiều mục menu.

Thay “GPS Online” bằng “Dữ liệu GPS đến…” hoặc “Chưa nhập GPS”, vì luồng này là nhập file theo kỳ. Ở những trang chưa nối dữ liệu thật, phải hiển thị rõ chế độ mẫu/chưa sẵn sàng; không xuất báo cáo mẫu dưới danh nghĩa số liệu đã nhập.

## 9. Lưu trữ và nối vào hệ thống

### 9.1 Các nhóm dữ liệu tối thiểu

| Nhóm | Nội dung cần lưu |
|---|---|
| Đợt nhập và file nguồn | Công ty, người nhập, file gốc, dấu vân tay, bộ đọc/phiên bản, loại báo cáo, sheet, khoảng nguồn, trạng thái và thống kê thực |
| Bản tổng ngày | Khóa xe/ngày lịch; chỉ tiêu chuẩn hóa; dòng nguồn; phiên bản hiệu lực và lịch sử |
| Sự kiện hành trình | Khóa nguồn, thời điểm, loại, vị trí, trạng thái chất lượng và dòng nguồn; một sự kiện có thể có nhiều file làm bằng chứng |
| Khoảng và kết quả ngày công | Quan hệ tới sự kiện tạo ra nó, mốc cắt ngày/khung, dữ liệu thiếu, phiên bản tính |
| Bổ sung của người dùng | Ghép tài xế/lệnh, phân loại điểm dừng, ghi chú, ảnh; tách quyền sở hữu với số GPS |
| Điều chỉnh và bảo vệ kết quả | Trước/sau, người/lý do, quyết định liên quan, kỳ/phiên bản đã chốt và trạng thái cần duyệt lại |

Đây là nhóm nghiệp vụ, không bắt buộc mỗi nhóm đúng một bảng. Tái sử dụng hồ sơ `erp.vehicles`, nhân viên, chuyến/lệnh và hạ tầng tệp/nhật ký hiện có. Không tạo danh mục xe song song chỉ vì dịch vụ minh họa đang dùng mã `veh-01`.

Số thiếu lưu là chưa có dữ liệu, không ép về 0. Với tổng hợp chỉ có `TG làm việc`, không nhét vào `activityWindowHours` hoặc `idleEngineHours`. Với hành trình không có km, `actualKm` chưa có; chưa được tính khoảng cách đường bộ bằng cách nối tọa độ rồi dùng như km GPS gốc.

### 9.2 Trách nhiệm các phần khi triển khai

- Bộ đọc Excel: nhận file, nhận dạng sheet/mẫu, ánh xạ dữ liệu và trả lỗi có vị trí. Có thể tận dụng thư viện XLSX đang có trong dự án sau khi kiểm tra khả năng đọc các kiểu ô thực tế; không cần thêm nền tảng nhập liệu mới.
- Dịch vụ nhập: ghép danh mục, đối chiếu dữ liệu đã có, xem trước, ghi một lần, lưu phiên bản và kích hoạt tính lại.
- Dịch vụ tổng hợp: đọc nguồn hiệu lực để lập tổng ngày, khoảng dừng/máy và kết quả theo ngày công; không chứa dữ liệu mẫu.
- API: xác thực và quyền nhập/xem, tiếp nhận file, xem trạng thái/xem trước, xác nhận, truy vấn nhật ký/lịch sử. Quyền xem xe không mặc nhiên là quyền nhập hoặc sửa kỳ đã khóa.
- Giao diện: hiển thị dữ liệu và trạng thái máy chủ trả về; không tự tuyên bố nhập, duyệt hoặc khóa kỳ thành công bằng thông báo cục bộ.
- Báo cáo: dùng cùng dữ liệu hiệu lực, đúng xe/kỳ/loại thời gian với nhật ký; xuất file phản ánh số thực và các phần còn thiếu.

Không cần hàng đợi hay dịch vụ riêng cho hai mẫu nhỏ này. Tuy nhiên cần đợt nhập có trạng thái để biết đã thành công, thất bại hay đang xử lý; có giới hạn kích thước/số dòng và xử lý lỗi rõ. Không chạy macro/công thức hoặc truy cập liên kết ngoài trong file. File và lỗi chi tiết chỉ người có quyền trong công ty được xem.

### 9.3 Bảo vệ tăng ca, chi phí và kỳ đã chốt

Phần nhập thử có thể hoàn thành trước tích hợp tiền, với giờ ứng viên ở trạng thái không được duyệt. Trước khi mở duyệt thật phải có dữ liệu quyết định/khóa kỳ lưu phía máy chủ và quy tắc điều chỉnh từ bản thiết kế chính.

Nếu nguồn thay đổi ảnh hưởng hồ sơ chưa duyệt, tính lại đề xuất. Nếu đã duyệt/chốt, giữ phiên bản dùng làm căn cứ, đánh dấu cần xem lại và chặn chuyển tiền/giá thành mới cho tới quyết định hợp lệ. Không coi biến khóa kỳ trong bộ nhớ trình duyệt là cơ chế bảo vệ.

Không mở chức năng phân bổ đang chia giả định 60/40 với dữ liệu thật. Muốn nghiệm thu phần giá thành phải nối lệnh, công việc và đối tượng phục vụ thực, lọc đúng tháng và kiểm tra tổng phân bổ. Đây là phần phụ thuộc sau nhập, không phải lý do trì hoãn nhập và xem được hai file này.

## 10. Các gói công việc theo thứ tự

| Gói | Công việc | Đầu ra có thể kiểm tra | Phụ thuộc |
|---|---|---|---|
| A. Chốt bộ đọc | Hai cấu hình tổng hợp/hành trình, đọc ngày/thời lượng, kiểm dòng tổng, tạo dữ liệu kiểm thử từ hai file | Đọc đủ 31 dòng và 341 sự kiện; tổng khớp mục 2 | Không cần DB thật |
| B. Lưu và đối chiếu | Nâng dữ liệu xe thật, đợt nhập, tổng ngày/sự kiện, lịch sử, quyền, khóa chống trùng | Nhập lại không tăng số; cùng khóa đổi giá trị cập nhật đúng | A |
| C. Nhập trên web | Chọn/kéo thả file, xem trước thực, xác nhận, lịch sử, chuyển tới kỳ đã nhập | Người dùng tự tải hai file và xem lại sau tải lại trang | A, B |
| D. Chia ngày và nhật ký | Tách ngày lịch/ngày công, ghép sự kiện thành khoảng, dữ liệu chưa xác minh, tính lại khi nhập chồng | Bốn sự kiện về 26/07, 337 về 27/07; các khoảng không bị cộng trùng | B, C |
| E. Báo cáo thực | Thay seed ở nhật ký/tổng quan/báo cáo liên quan, lọc đúng tháng, xuất số thật | Báo cáo Hino tháng 8 khớp 7.682 km, 844 lít và các tổng nguồn | B, D |
| F. Kiểm thử tích hợp | Tập ca mục 11, hai người nhập, quyền, sửa sau duyệt và dữ liệu lỗi | Biên bản kết quả, dòng lỗi rõ, không rơi dữ liệu hoặc ghi đè quyết định | A–E |
| G. Mở nghiệp vụ phụ thuộc | Xác nhận ý nghĩa máy/TG làm việc, dữ liệu cùng xe/ngày, nối tài xế/lệnh và duyệt/chốt thật | Đủ căn cứ dùng tăng ca/giá thành, không còn quyết định lưu tạm | Theo dữ liệu và phần hệ thống còn thiếu |

**Mốc cho khách test import:** A–F hoàn tất. G là điều kiện để dùng các kết quả nhập vào nghiệp vụ tiền một cách đầy đủ; không yêu cầu chờ G mới cho khách tải file và xem dữ liệu.

## 11. Kế hoạch kiểm thử và đáp án mong đợi

Các file gốc là nguồn kiểm thử chuẩn, giữ nguyên. Tạo bản sao/biến thể trong bộ kiểm thử cho các tình huống trùng, sửa, thiếu dòng và qua ngày; ghi rõ là dữ liệu tạo để test. Chạy trên cơ sở dữ liệu kiểm thử riêng, không nạp dữ liệu giả vào môi trường đang vận hành.

### 11.1 Bộ đọc và phân kỳ

| Mã | Dữ liệu/thao tác | Đáp án |
|---|---|---|
| IM01 | Nhập nguyên file Hino | 31 dòng ngày lịch, đúng xe/kỳ; hàng 36 chỉ để đối chiếu |
| IM02 | Cộng các chỉ tiêu Hino | 7.682,0 km; 143:43 lăn bánh; 211:29 TG nguồn; 1.263 dừng; 21 quá tốc độ; 9 sự kiện >4h; 844 lít |
| IM03 | Đọc thời lượng tổng `143:43:00` | 517.380 giây, không cuộn về giờ trong một ngày |
| IM04 | Xem ngày 08/08, 16/08, 31/08 | Không loại vì km = 0; TG nguồn và nhiên liệu vẫn còn đúng |
| IM05 | Nhập nguyên file Isuzu | 341 sự kiện, đúng bảy nhãn/số lượng ở mục 2.2 |
| IM06 | Chia sự kiện theo ngày công | 4 sự kiện ngày công 26/07, 337 ngày công 27/07 |
| IM07 | Cắt dừng 00:01:27–05:16:12 | 03:58:33 + 01:16:12 = 05:14:45, một khoảng gốc |
| IM08 | Ghép dừng trong file gốc | 78 khoảng theo nguồn, 10 khoảng ≥5 phút; không nhầm thành 11 lần vì chia ngày |
| IM09 | Ghép mở/tắt | 5 cặp đủ đầu/cuối; một sự kiện tắt thiếu đầu lúc 00:02:32 được báo |
| IM10 | Cắt khung giờ ứng viên | 15 giây K4 của 26/07; 9.563 giây K1 và 3.641 giây K2 của 27/07; chưa được duyệt tiền |
| IM11 | Gặp mất GPS và đổ nhiên liệu | Giữ 3 sự kiện mất GPS, 2 nạp; không tự sinh km, lít/tiền hoặc tắt máy |
| IM12 | Đổi tên file sai tháng/xe, giữ nội dung | Dùng nội dung để nhận diện; không nạp sang xe/tháng tên file |
| IM13 | Thêm sheet, tiêu đề lệch hàng, đảo thứ tự dòng/cột có cùng nhãn | Nhận đúng mẫu theo nhãn; liệt kê sheet không hỗ trợ; sắp xếp thời gian trước ghép |
| IM14 | Thiếu ngày/biển số, sai tọa độ, nhãn mới | Báo đúng file/sheet/dòng; nhãn mới được giữ, dòng lỗi không biến thành bản hợp lệ giả |

### 11.2 Nhập lại và sửa dữ liệu

| Mã | Dữ liệu/thao tác | Đáp án |
|---|---|---|
| IM15 | Nhập lại đúng file, rồi đổi tên và nhập lại | Số tổng ngày/sự kiện và tổng chỉ tiêu không tăng |
| IM16 | Nhập bản tuần Hino rồi file tháng Hino | Tổng vẫn 31 ngày; phần tuần trùng được bỏ qua |
| IM17 | Sửa `G7` từ 648,6 thành 658,6 và sửa tổng nguồn tương ứng trong bản sao | Một ngày cập nhật; tổng tháng 7.692,0 km; giữ số cũ và đợt nhập gây thay đổi |
| IM18 | Sửa G7 nhưng không sửa tổng hàng 36 | Báo chênh dòng tổng; không âm thầm xác nhận đợt sạch lỗi |
| IM19 | Sửa địa chỉ `D5` trong file hành trình, giữ xe/thời điểm/loại | Cập nhật thuộc tính sự kiện cũ, vẫn 341 sự kiện; không mất phân loại người dùng |
| IM20 | Sửa thời điểm B7 trong bản sao | Nhận có khác biệt tập sự kiện; không tự xóa bản cũ hoặc ghép chắc chắn bằng STT |
| IM21 | Hai file cùng đợt chứa một khóa với hai giá trị khác nhau | Xung đột được hiển thị; không tùy thuộc thứ tự file mà chọn số |
| IM22 | File mới thiếu một ngày/sự kiện từng có | Không tự xóa dữ liệu cũ; chỉ thay toàn vùng sau lựa chọn rõ |
| IM23 | Hai sự kiện cùng giây nhưng khác loại | Giữ cả hai; cùng khóa và giá trị khác thì đưa vào xung đột |
| IM24 | Nhập các phần ngày trước/ngày sau theo thứ tự đảo | Kết quả cuối như nhập cả phạm vi; khoảng thiếu đầu/cuối được hoàn thiện, không chồng giờ |
| IM25 | Nhập lại sau khi đổi phiên bản bộ đọc | Có đường tính lại với bản xem trước/lịch sử; không bị chặn vĩnh viễn chỉ vì file cùng dấu vân tay |

### 11.3 Toàn luồng và bảo vệ dữ liệu

| Mã | Thao tác | Đáp án |
|---|---|---|
| IM26 | Tải file qua giao diện rồi tải lại trang/đăng nhập lại | Dữ liệu còn ở đúng xe và tháng, không trở về seed |
| IM27 | Bấm xác nhận hai lần hoặc gửi lại sau mất kết nối | Chỉ một lần ghi hiệu lực; truy được trạng thái đợt nhập |
| IM28 | Hai người nhập cùng file/cùng khóa đồng thời | Không nhân đôi; cập nhật cạnh tranh phải làm mới đối chiếu |
| IM29 | Xem trước xong, người khác sửa số liệu rồi xác nhận | Phát hiện bản xem trước cũ, không ghi đè âm thầm |
| IM30 | Không có quyền nhập hoặc truy cập file của công ty khác | Bị từ chối phía server, kể cả gọi trực tiếp API/tải tệp |
| IM31 | GPS mới ảnh hưởng hồ sơ đã duyệt/khóa | Giữ bản hiệu lực và quyết định cũ; tạo yêu cầu điều chỉnh theo quyền |
| IM32 | File lỗi một nhóm xe/ngày | Hiện rõ nhóm chưa nhập; phần thành công không mang nhãn toàn bộ đã đủ |
| IM33 | Thu hồi đợt chưa chốt có sự kiện trùng bằng chứng từ đợt khác | Không xóa sự kiện còn nguồn hiệu lực; chỉ thu hồi đóng góp của đợt |
| IM34 | Chọn Hino tháng 8 và Isuzu tháng 7 trong báo cáo | Không ghép hai nguồn khác xe/kỳ; không hiện mặc định số tháng 10 |
| IM35 | Xuất báo cáo ngay sau import | Tổng khớp màn hình, ghi rõ cơ sở ngày, chỉ tiêu thiếu và nguồn |
| IM36 | Bổ sung tay tài xế/phân loại/ảnh rồi nhập lại | Giữ phần nhập tay và lịch sử; xung đột được báo, không mất thông tin |
| IM37 | File chỉ tổng hợp hoặc chỉ hành trình | Phần nào có dữ liệu hiện đúng; các phần thiếu là chưa có, không ép thành 0 hoặc cho phép duyệt giả |
| IM38 | Chỉ nhập file ngày lịch 27/07 | Ngày công 26/07 và 27/07 có cờ thiếu phủ đầu/cuối; không tự coi đủ hai ngày công |

Các test phải gọi bộ đọc, dịch vụ và API đang dùng thật. Không chép công thức triển khai vào file test rồi chỉ kiểm tra bản sao. Kiểm thử giao diện phải chọn tệp thật và kiểm tra dữ liệu sau tải lại trang, không chỉ kiểm tra thông báo thành công xuất hiện.

### 11.4 Biên bản khách hàng kiểm thử

Trình tự ngắn cho khách:

1. Nhập file Hino, kiểm tra 31 ngày và tổng tháng 8.
2. Nhập lại file Hino, kiểm tra không tăng dữ liệu.
3. Nhập file Isuzu, kiểm tra ngày công 26/07 và 27/07 cùng danh sách sự kiện.
4. Tải lại trang, đổi kỳ và xuất báo cáo, kiểm tra vẫn ra cùng số.
5. Nhập một bản đã sửa có kiểm soát, xem trước và xác nhận cập nhật, mở lịch sử số cũ/mới.

Biên bản ghi kết quả thực tế, mã đợt nhập, số dòng, số thêm/cập nhật/bỏ qua/lỗi và các giới hạn nghiệp vụ đang còn. Không dùng việc đã nhập thành công để xác nhận toàn bộ chức năng OT/giá thành đã hoàn thiện.

## 12. Thông tin còn cần khách xác nhận

Những thông tin sau không ngăn triển khai luồng nhập A–F:

| Thông tin | Lý do | Cách xử lý trong lúc chưa có |
|---|---|---|
| Một báo cáo tổng hợp và một báo cáo hành trình cùng xe/cùng ngày | Kiểm tra chéo hai nguồn và độ phủ thực | Kiểm riêng từng mẫu hiện có; không ghép Hino tháng 8 với Isuzu tháng 7 |
| Ý nghĩa chính xác `TG làm việc`, `Km Cơ` và số nhiên liệu trên Bình Minh | Tránh đổi nhãn thành chỉ tiêu khác | Giữ đúng trường nguồn, không dùng làm giờ công/đồng hồ/chi phí |
| Báo cáo có điện áp hoặc xác nhận cách nhận biết máy nổ thực | Căn cứ đánh giá tắt máy và OT theo thiết kế | Chỉ hiển thị trạng thái GPS và giờ ứng viên chưa đủ căn cứ |
| Tài xế/lệnh tương ứng các ngày lịch sử | Gán đúng người và công việc để xét trách nhiệm/OT | Cho phép nhập dữ liệu xe trước; giữ người lái và lệnh chưa xác định |
| Một lần xuất lại có dữ liệu nhà cung cấp đã sửa nếu có | Kiểm hành vi cập nhật thực tế, nhất là đổi thời điểm | Test bằng bản sao sửa có chủ ý, ghi rõ giới hạn không có mã sự kiện gốc |

Không yêu cầu khách chỉnh lại bảng hay nhập lại toàn bộ dữ liệu trước khi tải lên. Các yêu cầu xác nhận chỉ nhằm chốt ý nghĩa trường và nghiệp vụ phụ thuộc.

## 13. Điểm sửa dự kiến và điều kiện hoàn thành

### 13.1 Tệp hiện có cần chỉnh khi triển khai

| Thành phần | Vai trò trong kế hoạch |
|---|---|
| [Nhật ký và cửa sổ nhập](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/apps/doi-xe/nhat-ky/page.tsx>) | Chọn file thật, xem trước/kết quả, lọc kỳ, truy dữ liệu và lịch sử |
| [Dịch vụ/mô hình fleet hiện tại](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/fleet-app.service.ts>) | Tách seed khỏi nghiệp vụ thật; bổ sung trạng thái dữ liệu thiếu, nguồn và loại ngày |
| [Báo cáo đội xe](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/apps/doi-xe/bao-cao/page.tsx>) | Dùng số thực theo xe/kỳ; bỏ chỉ tiêu xuất ghi sẵn và phân bổ giả định |
| [Duyệt tăng ca](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/apps/doi-xe/tang-ca/page.tsx>) | Phân biệt ứng viên/chưa đủ dữ liệu với hồ sơ được xét duyệt, bảo vệ phía server |
| [Khung ứng dụng đội xe](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/apps/doi-xe/layout.tsx>) | Trạng thái dữ liệu mới nhất, số xe thật, không quảng bá GPS trực tuyến |
| [Các kiểm thử fleet hiện tại](<C:/Users/nhatb/Documents/antigravity/noble-fermi/tests/fleet-app.test.cjs>) | Chuyển sang gọi logic thực; bổ sung kiểm thử file/API/lưu dữ liệu |

Bổ sung bộ đọc hai mẫu, dịch vụ nhập/tổng hợp, API nhận file/xem trước/xác nhận/nhật ký và migration dữ liệu nhập. Số migration lấy theo thứ tự còn trống tại lúc thực hiện; không viết đè migration hoặc thay đổi đang làm ở phân hệ khác.

### 13.2 Được coi là hoàn thành import để test khi

- Người dùng tải hai file gốc qua giao diện mà không chỉnh cột, ngày hoặc biển số trước.
- Số bản ghi và các tổng đối chiếu đúng mục 2; không có thông báo thành công dùng số ghi sẵn.
- Nhập lặp, chồng kỳ và cập nhật chạy đúng mục 7; dữ liệu có nguồn và lịch sử.
- Tải lại trang vẫn có dữ liệu, bộ lọc và báo cáo đọc đúng kỳ nhập.
- Tổng ngày lịch, ngày công, số 0 và dữ liệu thiếu được phân biệt rõ.
- Những gì file không cung cấp không bị dựng thành số liệu đã xác nhận hoặc khoản tiền phải trả.
- Có kết quả kiểm thử thực cho các tình huống bắt buộc ở mục 11 và danh sách phần còn chờ xác nhận.

Tài liệu này bổ sung cho [thiết kế phân hệ Đội xe và Vận chuyển](<C:/Users/nhatb/Documents/antigravity/noble-fermi/docs/Phân hệ xe/THIET_KE_PHAN_HE_DOI_XE_VA_VAN_CHUYEN.md>). Các cấu trúc file, mốc kiểm thử và giới hạn dữ liệu trong kế hoạch này là căn cứ mới thay cho giả định trước đây rằng chưa có file thô.
