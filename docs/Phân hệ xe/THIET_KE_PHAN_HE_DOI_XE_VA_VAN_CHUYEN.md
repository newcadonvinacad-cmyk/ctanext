# Thiết kế phân hệ Đội xe và Vận chuyển

Ngày thiết kế: 10/10/2026. Hệ thống: SIGNAGE ERP. Phạm vi: đặc tả nghiệp vụ và thiết kế chức năng, chưa triển khai phần mềm.

## 1. Định hướng thiết kế

Phân hệ này quản lý **phương tiện, công việc được giao, hoạt động thực tế, ngoại lệ và chi phí** của đội xe phục vụ nội bộ doanh nghiệp. Dữ liệu GPS do nền tảng bên ngoài cung cấp; ERP tiếp nhận và chuyển dữ liệu đó thành căn cứ điều hành, duyệt tăng ca và tính chi phí dự án.

Đề xuất một phân hệ độc lập mang tên **Đội xe & Vận chuyển**, giữ vị trí hiện có trong nhóm Sản xuất & Thi công. Một mục menu với bảy tab nghiệp vụ là đủ. Quản lý xe không phụ thuộc việc tạo kho, tạo dự án hay lập phiếu xuất vật tư.

Ba quyết định nền tảng:

1. **Lệnh là kế hoạch; GPS là thực tế; quyết định duyệt là kết luận.** Ba lớp liên kết với nhau nhưng không ghi đè lẫn nhau.
2. **Nhập một lần, dùng xuyên suốt.** Dữ liệu sau nhập phục vụ nhật ký, đối soát, tăng ca, vấn đề và báo cáo; không bắt nhập lại từng sheet.
3. **Người dùng xử lý những gì chưa rõ.** Hệ thống tự ghép dữ liệu chắc chắn, chỉ đưa dòng thiếu, xung đột hoặc bất thường vào danh sách cần xử lý. Không biến mỗi chỉ số thành một quy trình riêng.

Đọc nhanh theo mục đích: mục 5 nêu những chỗ phải sửa so với nguồn; mục 7 là thiết kế màn hình; mục 9 là luồng chuyển file thô thành dữ liệu; mục 11–15 là quy tắc nghiệp vụ; mục 18 là thông tin cần chốt; mục 20 là tiêu chí nghiệm thu.

“Chuẩn thị trường” được dùng theo nghĩa có các cấu phần phổ biến và ranh giới nghiệp vụ đúng, không có nghĩa mọi công ty dùng cùng công thức tăng ca, ngưỡng nhiên liệu hay quy trình duyệt. Phần lõi dùng chung; các quy tắc riêng của AN AN được cấu hình có hiệu lực theo thời gian.

### Kết quả người dùng phải nhận được

| Người dùng | Việc cần hoàn thành | Kết quả của phân hệ |
|---|---|---|
| Admin xe | Từ file GPS và ảnh Zalo làm thành sổ vận hành | Nhập file, sửa các dòng lỗi, hoàn thiện bằng chứng, biết ngày nào còn thiếu dữ liệu |
| Người điều phối | Biết xe nào làm gì, có còn khả dụng không | Lịch tuần rõ việc, tài xế, thời gian, tải hàng và các ngày đi tỉnh |
| Quản lý | Chỉ xem việc cần quyết định | Hàng chờ tăng ca, ngoại lệ có bằng chứng, vấn đề có người xử lý và hạn hoàn thành |
| Phụ trách dự án | Biết xe phục vụ dự án và chi phí được tính | Xem phần lệnh, tuyến và chi phí thuộc dự án mình |
| Nhân sự, kế toán | Nhận số liệu đã được duyệt, không nhập hoặc tính trùng | Bảng tăng ca và phân bổ có nguồn, phiên bản và trạng thái tiếp nhận |

## 2. Căn cứ đã đọc và mức độ đầy đủ

### 2.1 Tài liệu khách hàng

Đã đọc nội dung file Word, file mô tả TXT và toàn bộ 10 sheet Excel, gồm nhãn trường, dữ liệu mẫu, công thức và các tham số. Workbook có 944 ô chứa giá trị và 14.610 ô công thức, phần lớn là công thức kéo sẵn cho dòng trống. Không có sheet ẩn. Đây là đọc và phân tích nguồn, không phải xác nhận mọi công thức đã được tính lại trong Microsoft Excel.

| Nguồn | Nội dung sử dụng |
|---|---|
| `Đặc tả phân hệ Quản lý xe - SIGNAGE ERP.docx` | Sáu câu hỏi kinh doanh, hai cấp vận hành, điểm dừng, tăng ca, vấn đề xe và báo cáo |
| `mô tả sơ về 1 trường hợp mà khách mô tả bằng lời.txt` | Bối cảnh hai xe, bốn xưởng, GPS Bình Minh, ảnh Zalo, chuyến nhiều ngày và phạm vi loại trừ |
| Excel — HƯỚNG DẪN | Cách vận hành, dữ liệu mẫu, điều kiện duyệt và các thông tin cần xác nhận |
| Excel — LỆNH ĐIỀU XE | Kế hoạch, tuyến, tải hàng, thời điểm lập và tăng ca dự kiến |
| Excel — NHẬT KÝ NGÀY | Tổng hợp GPS, ảnh, kiểm lốp, công thức đối soát và kết quả duyệt |
| Excel — CHẶNG TĂNG CA | Khoảng mở/tắt máy và cách chia bốn khung giờ |
| Excel — NHẬT KÝ DẦU | Lít hóa đơn, GPS ghi nhận nạp, đồng hồ km và ảnh đổ dầu |
| Excel — SỔ SỰ CỐ - CHI PHÍ | Sự cố, vi phạm, khoản chi, bên chịu và dự án |
| Excel — LỊCH XE - TÀI XẾ | Hạn giấy tờ và chu kỳ bảo dưỡng theo km |
| Excel — BÁO CÁO TUẦN | Chỉ số theo tài xế, tăng ca và năm tiêu chí tuân thủ |
| Excel — BÁO CÁO THÁNG | Chỉ số theo xe, chi phí và cách phân bổ mẫu |
| Excel — THAM SỐ | Danh mục, định mức, đơn giá, ngưỡng và thông tin đang tạm ghi |

**Cập nhật nguồn sau bản thiết kế ban đầu:** khách hàng đã cung cấp hai Excel trong thư mục `dữ liệu thô`: báo cáo tổng hợp Hino tháng 8/2026 và báo cáo hành trình Isuzu ngày 27/07/2026. Đã đọc đầy đủ hai file; cấu trúc, ánh xạ và các kết quả đối chiếu được ghi trong [kế hoạch hoàn thiện import GPS Bình Minh](<C:/Users/nhatb/Documents/antigravity/noble-fermi/docs/Phân hệ xe/KE_HOACH_HOAN_THIEN_IMPORT_GPS_BINH_MINH.md>). Hai mẫu chưa có điện áp, tài xế hoặc cặp báo cáo cùng xe/ngày để xác nhận toàn bộ logic máy nổ/OT. Workbook quản lý có các dòng “MẪU” ở trên vẫn chỉ là sổ đã xử lý, không dùng thay định dạng xuất thô. Các nội dung còn ghi “cần mẫu” trong thiết kế phải đọc cùng cập nhật chi tiết của kế hoạch này; chưa khẳng định bộ đọc đã được triển khai.

### 2.2 Đối chiếu với cách tổ chức phổ biến

Odoo Fleet tách hồ sơ xe, dịch vụ/bảo dưỡng và phân tích chi phí theo xe hoặc tài xế. Đây là căn cứ cho ranh giới phân hệ và việc liên kết chi phí với phương tiện; không phải căn cứ cho quy tắc tăng ca của khách hàng. Nguồn: [Odoo Fleet](https://www.odoo.com/documentation/18.0/applications/hr/fleet.html), [Odoo Cost analysis](https://www.odoo.com/documentation/18.0/applications/hr/fleet/cost_analysis.html).

Hướng dẫn nhập nhiên liệu của Fleetio yêu cầu nhận diện xe cho từng dòng nhập. Thiết kế này áp dụng nguyên tắc tương ứng: nhận diện đúng xe, kiểm tra dữ liệu trước khi ghi nhận và giữ nguồn để đối soát. Các chi tiết chống trùng và chốt kỳ dưới đây là quyết định thiết kế cho SIGNAGE ERP. Nguồn: [Fleetio Fuel Entries Import Guide](https://help.fleetio.com/en_US/fuel-entries-import-guide).

Các chức năng điều xe tuần, ngày công 04h–04h, bốn mức tiền tăng ca, điện áp xác định máy nổ và tin Zalo là phần thích ứng với khách hàng. Không coi chúng là chuẩn chung của sản phẩm quản lý đội xe.

## 3. Hiện trạng và cách tách khỏi Kho

### 3.1 Những gì hệ thống đang có

Đã đối chiếu mã nguồn hiện tại, chưa kiểm tra dữ liệu đang chạy trên cơ sở dữ liệu thực tế:

| Thành phần hiện có | Nhận xét | Hướng kế thừa |
|---|---|---|
| Menu M15, trang `/van-chuyen` | Đã có mục Đội xe & Vận chuyển dưới Sản xuất & Thi công | Giữ điểm vào, thiết kế lại nội dung bên trong |
| Hồ sơ `vehicles` | Có mã, biển số, trạng thái hoạt động | Bổ sung thông số vận hành và lịch sử cần thiết |
| `trips`, `trip_stops` | Có chuyến, tài xế, dự án, điểm đi/giao và trạng thái | Giữ định danh cũ, mở rộng thành lệnh và công việc theo thiết kế mới |
| Kho có loại `vehicle`, liên kết `vehicle_id` | Là biểu diễn nơi giữ hàng trên xe; không đủ để quản lý phương tiện | Đội xe sở hữu hồ sơ xe, Kho chỉ sở hữu tồn vật tư và chứng từ |
| `trip_stock_documents` | Đã có liên kết chuyến với phiếu kho | Tái sử dụng khi thật sự có giao nhận hàng |
| Biểu mẫu tạo chuyến hiện tại | Giao diện bắt chọn dự án, trong khi dịch vụ cho phép dự án trống | Bỏ ràng buộc dự án cho việc nội bộ, khảo sát và bảo dưỡng |
| Dịch vụ đội xe nằm trong `ProjectService` | Hiện thiên về chuyến giao cho dự án | Tách trách nhiệm nghiệp vụ đội xe khi triển khai, không nhân đôi hồ sơ |
| Quyền đọc/tạo chuyến có đường cho quyền dự án đi kèm | Chưa thể hiện đủ hai cấp Admin xe và Quản lý | Xác thực quyền đội xe và phạm vi dự án riêng |
| Chấm công tính OT từ giờ và chính sách lương | Chưa thể hiện luồng nhận khoản OT đội xe đã chốt theo bốn đơn giá | Cần hợp đồng tiếp nhận rõ để tránh tính lại sai tiền |
| Giá thành dự án cộng vật tư và khoản chi | Nếu cộng thêm phân bổ xe không đối soát có thể trùng khoản đã chi | Gắn nguồn chi phí thống nhất khi nối phân hệ |

### 3.2 Quyền sở hữu nghiệp vụ

| Phân hệ | Sở hữu | Nhận/tham chiếu từ Đội xe |
|---|---|---|
| Đội xe | Hồ sơ xe, lệnh, thực tế GPS, dầu, lịch, vấn đề, quyết định OT và phân bổ quản trị | Là đầu mối vận hành phương tiện |
| Kho | Vật tư, tồn kho, xuất/nhập/chuyển và xác nhận giao nhận | Xe/chuyến chở hàng, liên kết phiếu kho |
| Dự án | Công việc, địa điểm dự án, quyền thành viên và giá thành | Lệnh phục vụ dự án và phần chi phí được phân bổ |
| Nhân sự | Hồ sơ nhân viên, chấm công, bảng lương và kỳ trả lương | Giờ, khung giờ, tiền OT đã duyệt và nguồn quyết định |
| Tài chính | Chứng từ thanh toán, trạng thái chi trả và sổ tài chính | Đề nghị/chi phí có liên kết nguồn, không sinh thêm tiền chi vì phân bổ |

Một xe có thể chở hàng giữa hai xưởng hoặc đi bảo dưỡng mà không có dự án. Một lệnh có thể không liên quan phiếu kho. Hoàn thành lệnh không tự xuất kho hoặc xác nhận hàng đã nhập ở nơi nhận.

Kho trên xe đang tồn tại phải được kiểm tra số dư và chứng từ khi chuyển đổi. Nếu doanh nghiệp vẫn theo dõi vật tư tồn trên xe, giữ như địa điểm giữ hàng có liên kết xe. Nếu chỉ dùng tạm để đại diện phương tiện, đối soát và chuyển số dư bằng nghiệp vụ kho trước khi ngừng sử dụng. Không xóa kho đang có tồn hoặc làm mất lịch sử.

## 4. Phạm vi sản phẩm

### 4.1 Phải có trong phiên bản hoàn chỉnh đầu tiên

- Hồ sơ xe và tài xế liên kết nhân sự; thêm xe mới không sửa cấu trúc báo cáo.
- Lệnh theo tuần, nhiều công việc trong ngày, chuyến đi tỉnh nhiều ngày, sao chép tin gửi Zalo.
- Nhập Excel GPS theo ngày, tuần, tháng hoặc khoảng bất kỳ; nhiều sheet, xem trước, báo lỗi, chống trùng và nhập lại có kiểm soát.
- Nhật ký ngày, điểm dừng, chặng máy, đối chiếu lệnh, ảnh báo cáo và kiểm lốp.
- Đề xuất và duyệt tăng ca đủ/một phần/không duyệt, lưu căn cứ và lịch sử.
- Đổ dầu, sự cố, vi phạm, chi phí và bên chịu.
- Lịch giấy tờ, bảo dưỡng và lịch sử thực hiện.
- Vấn đề có người chịu trách nhiệm, hạn, giải trình, quyết định và kết luận.
- Báo cáo tuần/tháng, chi phí/km, phân bổ dự án, xuất Excel, tiếp nhận vào HRM và dự án.
- Phân quyền, truy nguồn, phiên bản tham số và kiểm soát sửa dữ liệu đã duyệt.

### 4.2 Chưa làm vì chưa giải quyết nhu cầu hiện tại

Không xây GPS thời gian thực, máy tối ưu tuyến, ứng dụng riêng cho tài xế, cổng hãng sửa chữa, quản lý kho phụ tùng/lốp chi tiết, hợp đồng vận tải thuê ngoài, doanh thu cước, tự tra phạt nguội, tự đọc mọi tin Zalo hoặc hệ thống thưởng phạt tự động. Không xây công cụ tùy biến quy trình hay công cụ nhập liệu tổng quát cho mọi nhà cung cấp.

Ảnh Zalo được Admin xác nhận đã xem hoặc tải lên. Tin điều xe do hệ thống tạo để người dùng sao chép; phần mềm không tự gửi tin. Điểm GPS có thể mở vị trí trên bản đồ khi có tọa độ, chưa cần màn hình phát lại hành trình.

## 5. Những điểm cần điều chỉnh so với tài liệu nguồn

Đây là các quyết định thiết kế đề xuất. Những thay đổi ảnh hưởng quyền lợi tài xế và chính sách tiền phải được công ty xác nhận trước khi dùng số liệu thật.

| Điểm trong nguồn | Rủi ro nếu giữ nguyên | Quyết định thiết kế |
|---|---|---|
| Word: một lệnh/xe/ngày; Excel: một dòng/chuyến | Cộng trùng ngày, không biết lệnh nào cho phép OT | Một lệnh ngày có nhiều công việc; nhiều ngày cùng nhóm hành trình |
| Word dùng tốc độ TB ≥70%; Excel dùng trễ giờ về ≤30 phút để xét định mức | Cùng dữ liệu cho hai kết quả duyệt khác nhau | Giữ cả ba kiểm tra km, tốc độ, giờ về; mỗi chỉ báo hiện lý do. Mặc định ngoại lệ cần giải trình, không tự bác tiền |
| Excel có một cờ OT; Word tách sáng/đêm | Một cờ “Có” vô tình cho phép mọi khung | Tách sáng và tối/đêm, gắn với công việc/thời gian được giao |
| Excel làm tròn giờ mỗi chặng còn hai chữ số trước khi nhân tiền | Tiền lệch dù đọc đúng các mốc giờ gốc | Tính từ thời lượng gốc; chỉ làm tròn tiền ở cuối |
| Word có điểm dừng chi tiết nhưng Excel không có sheet này | Không đủ căn cứ kiểm tra địa chỉ và phút máy nổ | Bổ sung dữ liệu điểm dừng từ file GPS; tổng ngày không thay thế được chi tiết |
| Dừng được chọn “điểm giao” và có lệnh là coi đúng lệnh | Có lệnh bất kỳ cũng có thể hợp thức hóa điểm dừng | Phải gắn điểm dừng với công việc/địa điểm trên lệnh, hoặc có xác nhận và lý do |
| Điện áp 26V/12,6V được dùng nhận biết máy nổ | Ngưỡng của một thiết bị có thể sai khi áp cho xe khác | Tham số riêng từng xe, có trạng thái đã kiểm chứng; thiếu tín hiệu thì kết luận chưa xác định |
| Lít mua tháng/km tháng gọi là tiêu hao thực tế | Dầu còn trong bình và các lần đổ lệch kỳ làm sai kết luận | Tách lượng mua, tiêu hao GPS và tiêu hao đo bằng kỳ đầy bình |
| Excel lấy một lần đổ/km từ lần trước | Đổ chưa đầy bình hoặc nhập không theo thứ tự gây sai | Dùng kỳ đầy bình đến đầy bình, cộng các lần đổ trong khoảng theo thời gian thực |
| Phân bổ tổng chi phí toàn đội theo tổng km kế hoạch | Dự án dùng xe rẻ có thể gánh chi phí của xe đắt; khoản trực tiếp bị chia lại | Phân bổ trong từng xe/kỳ, tách chi phí trực tiếp và chi phí chung |
| “Giờ có mặt” tính bằng máy mở đầu tới tắt cuối | Máy nổ không chứng minh toàn bộ giờ làm của con người | Giữ chỉ số vận hành có nhãn rõ; OT GPS là căn cứ đề xuất, không thay thế chấm công |
| Vấn đề vừa tự tạo chi phí vừa cho nhập sổ sự cố | Dễ có hai dòng tiền cho cùng việc | Một vấn đề liên kết các khoản chi; một khoản chi có một nguồn duy nhất |
| Mục luồng ngày chỉ nói ngoại lệ nặng; mục vấn đề nói nặng và trung bình | Sinh việc không nhất quán | Nặng và trung bình tạo vấn đề; nhẹ nằm danh sách nhắc, có thể nâng thành vấn đề |
| Tải ISUZU 1.900 kg chỉ là số tạm | Hệ thống có thể xác nhận sai khả năng chở hàng | Không coi đã xác minh; yêu cầu thông số giấy đăng kiểm trước khi xác nhận tải hợp lệ |
| Mốc ảnh về xưởng mỗi ngày | Chuyến nhiều ngày luôn bị báo thiếu ảnh sai | Yêu cầu ảnh theo mốc thực sự phát sinh; ngày chưa về thì mốc này không áp dụng |

### 5.1 Cập nhật quy định giờ lái theo thời điểm thiết kế

Tài liệu nguồn đề nghị kiểm tra lại ngưỡng 10 giờ/ngày và 48 giờ/tuần. Luật 118/2025/QH15 đã sửa khoản 1 Điều 64: thời gian lái liên tục vẫn có mốc 4 giờ với ngoại lệ bất khả kháng/trở ngại khách quan; thời gian làm việc ngày, tuần theo Bộ luật Lao động. Sửa đổi áp dụng từ 01/07/2026. Vì vậy tại ngày thiết kế 10/10/2026, không gắn nhãn “vi phạm pháp luật” chỉ vì vượt 10/48 giờ lái. Nguồn: [nội dung sửa đổi do Chính phủ công bố](https://xaydungchinhsach.chinhphu.vn/noi-dung-co-ban-cua-luat-118-2025-qh15-sua-doi-bo-sung-mot-so-dieu-cua-10-luat-co-lien-quan-den-an-ninh-trat-tu-119260123142251615.htm), [thông tin hiệu lực trên Công báo](https://congbao.chinhphu.vn/van-ban/luat-so-118-2025-qh15-468680/61578.htm).

Thiết kế giữ 10/48 như ngưỡng cảnh báo nội bộ từ tài liệu, có thể thay đổi. Kiểm tra liên tục 4 giờ phải theo tài xế, không bị đặt lại chỉ vì đổi xe, qua nửa đêm hoặc sang ngày công. Chỉ có tổng giờ ngày thì chưa đủ xác định một đợt lái liên tục. Các giới hạn lao động và mức trả lương do HRM/chính sách đã được công ty xác nhận quản lý; bốn đơn giá trong mẫu không được gắn nhãn là mức trả hợp pháp cho mọi loại ngày.

## 6. Luồng vận hành đầu cuối

### 6.1 Thiết lập ban đầu

Admin bổ sung hai xe, ghép biển số GPS, ghép tài xế với nhân viên và nhập các hạn giấy tờ đang có. Quản lý xác nhận tải trọng, định mức, chính sách OT và tham số có hiệu lực. Hệ thống tạo danh sách hạng mục lịch mặc định ở trạng thái “Chưa có thông tin”; không tạo ngày hết hạn giả.

### 6.2 Lập lịch tuần

Admin mở tuần, chọn xe/tài xế, nhập công việc và thời gian dự kiến. Công việc giao dự án chọn dự án; trung chuyển chọn xưởng; bảo dưỡng chọn nơi thực hiện. Một ô xe/ngày có thể có nhiều việc. Lưu nháp trong lúc soạn, phát hành khi đủ dữ liệu, sao chép một bản tin cho cả tuần hoặc riêng phần thay đổi.

Việc đi tỉnh nhiều ngày được nhập một lần khoảng ngày rồi phân việc cho các ngày liên quan; người dùng xem như một hành trình liên tục. Không nhân đôi km toàn chuyến trên từng ngày.

### 6.3 Nhận file và đối soát

Khi có file GPS, Admin tải một hoặc nhiều báo cáo, xem trước kết quả, xử lý ghép xe và lỗi dữ liệu rồi xác nhận nhập. Hệ thống cập nhật ngày tương ứng, tính lại chỉ số chưa khóa và chỉ ra dữ liệu còn thiếu. File tháng vẫn đi qua đúng quy trình này; không buộc chia thủ công thành từng ngày.

Admin ưu tiên danh sách “Cần xử lý”: điểm dừng chưa rõ, ngày không lệnh, thiếu ảnh, sai tài xế hoặc số liệu mâu thuẫn. Nhập thêm đổ dầu, phí đường và sự cố khi phát sinh, không chờ đến lúc có GPS.

### 6.4 Quản lý xét duyệt

Quản lý mở hàng chờ OT và vấn đề. Dòng đủ dữ liệu, đúng lệnh, không có điều kiện cần giải trình có thể duyệt hàng loạt. Dòng ngoại lệ xem bằng chứng và giải trình trước khi quyết định. Mỗi quyết định giữ phiên bản dữ liệu đã xem.

### 6.5 Chốt tuần và tháng

Thứ bảy có thể duyệt phần tuần đã phát sinh, nhưng báo cáo thứ hai–chủ nhật vẫn là “Tuần chưa kết thúc” cho đến khi có đủ phần còn lại. Tuần có ngày chưa có GPS là “Chưa đủ dữ liệu”, không coi các ngày đó không vi phạm.

Cuối tháng, hệ thống tập hợp OT đã duyệt, chi phí đủ căn cứ và cơ sở phân bổ. Quản lý xem đối chiếu tổng trước khi chốt. Sau chốt, chuyển kết quả sang dự án/HRM hoặc xuất file theo cùng cấu trúc. Các hồ sơ thiếu chứng từ được liệt kê rõ và chưa ghi nhận vào kết quả chính thức tương ứng.

### 6.6 Dữ liệu GPS đến muộn

Lịch điều xe, nhật ký sự cố, chi phí và lịch giấy tờ vẫn dùng bình thường. Chỉ số GPS hiện “Chưa nhận dữ liệu đến ngày…”. Không hiển thị trạng thái xe thời gian thực, không kết luận an toàn và không tính OT GPS cho ngày chưa đủ căn cứ.

Khi nhập bù một tháng, cảnh báo lịch sử được gom thành đợt để Admin xử lý. Hạn giải trình tính từ lúc phát hiện/ghi nhận vấn đề; ngày sự việc vẫn là ngày gốc. Không tạo hàng trăm thông báo đã quá hạn chỉ vì file đến chậm. Tình trạng giấy tờ đang quá hạn hoặc xe đang không an toàn vẫn được ưu tiên riêng.

## 7. Cấu trúc màn hình

Một menu **Đội xe & Vận chuyển**, bảy tab. Hồ sơ xe có trang chi tiết riêng; các giao dịch nhỏ mở ngăn chi tiết bên phải. Tuân thủ quy chuẩn UI/UX của dự án: bảng gọn, lọc nhanh, bật/tắt cột, giữ ngữ cảnh khi mở chi tiết và không nhồi các mục nhỏ vào sidebar.

| Tab | Nội dung mặc định | Thao tác chính | Nội dung chi tiết |
|---|---|---|---|
| Điều xe | Lịch tuần ngày × xe; chuyển sang danh sách khi cần | Thêm việc, sao chép tuần, phát hành, copy tin Zalo | Công việc, tuyến, tải, ảnh mốc, lịch sử thay đổi |
| Nhật ký | Một dòng xe/ngày; mặc định lọc ngày cần hoàn thiện | Nhập GPS, nhập tay, sửa dữ liệu nghiệp vụ | Tổng hợp, điểm dừng, chặng máy, tài xế, ảnh, nguồn nhập |
| Tăng ca | Hàng chờ theo tài xế/ngày, mở ra được các xe liên quan | Duyệt đủ, một phần, không duyệt, yêu cầu giải trình | Bốn khung, lệnh cho phép, kiểm tra định mức, quyết định cũ |
| Chi phí | Sổ khoản chi, có chế độ Đổ dầu | Thêm đổ dầu, thêm khoản chi, liên kết chứng từ | Lít/km/ảnh, bên chịu, dự án, nguồn và thanh toán |
| Vấn đề | Vấn đề đang mở, ưu tiên nặng và quá hạn | Giao xử lý, ghi giải trình, quyết định, đóng/mở lại | Bằng chứng, trao đổi, nguyên nhân, chi phí, lịch sử |
| Hồ sơ & lịch | Danh sách xe/tài xế và việc sắp đến hạn | Thêm xe, cập nhật hồ sơ, ghi nhận gia hạn/bảo dưỡng | Lịch sử km, hạn, dịch vụ đã làm, tài liệu; Tham số cho Quản lý |
| Báo cáo | Tuần theo tài xế / tháng theo xe | Lọc, xem dòng nguồn, xuất Excel, chốt/chuyển kết quả | Phân bổ dự án, tình trạng dữ liệu, lịch sử chốt |

Đầu tab Điều xe có một dải thông tin thu gọn: xe khả dụng, vấn đề đang mở, OT chờ duyệt, lịch đến hạn và dữ liệu GPS mới nhất. Đây là nội dung bảng điều khiển trong nguồn; không cần thêm trang dashboard riêng.

### 7.1 Lịch điều xe

Mỗi ô hiển thị tài xế, tóm tắt việc và trạng thái. Mở ô để chỉnh danh sách công việc: thứ tự, loại việc, điểm đi/đến, dự án hoặc mục đích nội bộ, giờ dự kiến, km, tải và cho phép OT. Chỉ hiện trường đặc thù khi cần; không ép bảo dưỡng xe phải nhập “số điểm giao”.

Hỗ trợ nhập liên tiếp bằng bàn phím, dán nhiều dòng và sao chép việc. Khi dán, xem trước lỗi trước khi lưu. Sao chép tuần chỉ sao chép kế hoạch; không sao chép thực tế, bằng chứng, quyết định OT hoặc trạng thái hoàn thành.

Mã lệnh tự sinh và ổn định; mã tham chiếu cũ là trường riêng. Lệnh phát hành có số phiên bản. Tin sao chép chứa tuần/ngày, biển số, tài xế, việc, nơi đến, giờ và OT được phép; tin sửa đổi nêu rõ phần thay đổi. Có nút sao chép, không coi sao chép là bằng chứng tài xế đã đọc.

### 7.2 Nhật ký ngày và màn hình đối soát

Bảng chính chỉ cần ngày, xe, tài xế, lệnh, km, giờ lăn bánh, ảnh/kiểm lốp, số ngoại lệ và mức đầy đủ dữ liệu. Các cột khác mở qua lựa chọn cột. Không bắt người dùng làm việc trên toàn bộ 43 cột như Excel.

Khi mở một ngày, bố trí dữ liệu gốc và dữ liệu chuẩn hóa cạnh nhau trong chế độ đối soát. Điểm dừng có thời gian, địa chỉ, loại, lệnh liên quan, phút máy nổ và kết luận. Cho chọn nhiều dòng để phân loại cùng một địa điểm; vẫn xem trước số dòng ảnh hưởng. Trường tính toán chỉ đọc, trường nhập tay có dấu nhận biết và lý do điều chỉnh.

### 7.3 Trạng thái giao diện cần thể hiện đúng

Phân biệt “0”, “chưa có dữ liệu”, “không áp dụng”, “đang xử lý” và “dữ liệu có lỗi”. Màu luôn đi cùng chữ. Bộ lọc và vị trí dòng được giữ khi đóng ngăn chi tiết. Khi hai người cùng sửa, báo có phiên bản mới, không âm thầm ghi đè. Duyệt và chốt chỉ hiển thị thành công sau khi hệ thống xác nhận lưu xong.

## 8. Hồ sơ nền và lệnh điều xe

### 8.1 Xe

| Nhóm | Trường | Quy tắc |
|---|---|---|
| Nhận diện | Mã xe, biển số, tên/model, đang sử dụng/ngừng sử dụng | Mã và biển số duy nhất trong công ty; không xóa xe đã phát sinh |
| Năng lực | Tải cho phép kg, nguồn xác minh, ngày xác minh | Chưa xác minh thì không hiển thị tải “Đạt” |
| Nhiên liệu | Định mức lăn bánh L/100km, nổ máy đứng yên L/giờ | Có ngày hiệu lực, không sửa ngược kết quả đã chốt |
| GPS | Nhà cung cấp, mã thiết bị/biển số nguồn, hệ điện, ngưỡng điện áp | Lưu lịch sử ghép khi thay thiết bị hoặc biển số |
| Vận hành | Xưởng quản lý, tài xế mặc định, km đồng hồ gần nhất | Tài xế mặc định chỉ gợi ý; không thay thế người thực lái |
| Khả dụng | Có thể điều xe, đang bảo dưỡng, tạm dừng | Có khoảng hiệu lực và lý do; khác trạng thái đã ngừng sử dụng |

Giá trị từ nguồn: HINO 51D98246, hệ 24V, tải 1.750 kg, định mức 10 L/100km; ISUZU 51D69998, hệ 12V, định mức 9 L/100km. Cả hai có mức nổ máy đứng yên 2 L/giờ trong Excel. Tải ISUZU 1.900 kg chưa xác minh. Tốc độ chuẩn 55/47 km/h là đề xuất trong Word, chưa có trong sheet THAM SỐ; không coi là chuẩn bắt buộc với mọi tuyến.

### 8.2 Tài xế

Liên kết nhân viên có sẵn bằng định danh, thêm hạng/số GPLX, hạn GPLX, hạn sức khỏe, xe mặc định và tình trạng được phân công. Một người lái được nhiều xe theo thời gian. Tên nhập từ nguồn phải ghép một lần vào nhân viên; không tạo nhân sự trùng chỉ vì cách viết tên khác.

Nếu có đổi tài xế giữa ngày, ghi nhận thời điểm bàn giao, km đồng hồ nếu có và người tiếp nhận. Khoảng thực tế chưa xác định tài xế được giữ ở nhóm “Chưa phân tài xế”; không phân cả ngày cho người lái mặc định rồi tính OT hoặc lỗi cho người đó.

### 8.3 Đơn vị kế hoạch

**Lệnh ngày:** một xe trong một ngày công, có một bản đang hiệu lực. Trong lệnh có một hoặc nhiều công việc, mỗi việc có khoảng thời gian, tài xế và nơi phục vụ. Giao diện mặc định một tài xế cả ngày; chỉ mở phần bàn giao khi khác thực tế.

**Công việc:** trung chuyển xưởng, rải vật tư, giao dự án, khảo sát, bảo dưỡng hoặc việc khác có mô tả. Dự án chỉ bắt buộc khi chọn việc phục vụ dự án. Có thể có nhiều dự án trong một ngày; mỗi công việc phân biệt được đối tượng hưởng chi phí.

**Hành trình nhiều ngày:** nhóm các lệnh ngày bằng mã hành trình và khoảng ngày. Từng ngày có công việc, OT và km kế hoạch riêng; mốc xuất phát/về xưởng thuộc toàn hành trình. Đây là cách tổ chức dữ liệu để liên kết chuyến, không thêm một màn hình điều hành khác.

Trường tối thiểu khi phát hành: ngày, xe, người lái, nội dung/loại việc, thời gian hoặc lịch ngày, nơi đi/đến phù hợp loại việc, lựa chọn OT sáng và tối/đêm. Km dự kiến, tải hàng và tuyến chi tiết có thể bổ sung theo loại việc; thiếu dữ liệu cần đối soát thì hiện “Chưa đủ căn cứ”, không ngầm dùng 0.

### 8.4 Vòng đời và thay đổi kế hoạch

Trạng thái: **Nháp → Đã phát hành → Đang thực hiện → Hoàn thành**; Nháp/Đã phát hành có thể Hủy. Sau khi đã chạy chỉ kết thúc sớm hoặc điều chỉnh phần còn lại, không xóa lịch sử thực hiện. Hoàn thành vận chuyển và hoàn tất đối soát dữ liệu là hai trạng thái độc lập.

Phát hành kiểm tra xe khả dụng, tài xế, hồ sơ bắt buộc còn hiệu lực, trùng lịch và tải. Thiếu hồ sơ chưa xác minh đưa vào cần kiểm tra; giấy tờ bắt buộc đã xác định hết hiệu lực, xe tạm dừng an toàn, lịch xe/tài xế chồng nhau hoặc tải vượt mức xác minh thì không cho phát hành công việc liên quan. Cho phép lưu nháp để sửa.

Với kế hoạch chỉ ghi ngày, hệ thống giữ chỗ xe/tài xế cho cả ngày đó. Muốn xếp thêm việc hoặc bàn giao cho người khác thì bổ sung khoảng giờ đủ để kiểm tra chồng lịch. Hành trình qua ngày giữ chỗ trên toàn khoảng liên quan, không chỉ ngày xuất phát. Dữ liệu lịch sử nhập bù được lưu cùng ngoại lệ dù có quá tải/hết hạn, vì không thể dùng kiểm tra phát hành để xóa sự việc đã xảy ra.

Tải kiểm theo **mức hàng tối đa cùng có trên xe**, không lấy tổng hàng giao cả ngày khi xe đã về nạp lại. Mặc định nhập tải cao nhất của từng chuyến/công việc; chưa xây bảng tải từng kiện. Từ 90% đến 100% là sát tải; trên 100% là quá tải. Tải thiếu không bằng 0 và không tự đạt.

Thời điểm lập do hệ thống ghi:

- Trước chuyến: bản phát hành có trước lúc bắt đầu công việc.
- Bổ sung trong ngày: thêm việc khi ngày đang diễn ra, lưu thời điểm bổ sung và thời điểm việc mới bắt đầu. Không cho cờ OT bổ sung phủ ngược thời gian đã chạy.
- Lập bù: công việc đã bắt đầu/kết thúc rồi mới ghi nhận. Giữ ngày nghiệp vụ và thời điểm tạo thực tế, bắt buộc lý do.

GPS đến muộn có thể giúp phân loại lại thời điểm lập theo thực tế, nhưng không được sửa dấu thời gian gốc. Lệnh lập bù có thể cung cấp căn cứ sau giải trình, không tự trở thành lệnh đã có trước chuyến. Hủy lệnh đã có thực tế giữ liên kết và phát sinh yêu cầu đối soát.

## 9. Nhập file GPS và chuẩn hóa dữ liệu

Đây là chức năng trung tâm của phân hệ. Đơn vị nhập là **đợt nhập**, gồm một hoặc nhiều file và các sheet được lựa chọn, không mặc định một file tương ứng một tháng hoặc một xe.

### 9.1 Dữ liệu đích và mức có thể kết luận

| Loại dữ liệu | Tối thiểu cần có | Dùng được cho | Không được suy ra nếu thiếu chi tiết |
|---|---|---|---|
| Tổng hợp ngày | Xe, ngày, km và các chỉ tiêu thời gian có trong báo cáo | Khai thác ngày, kiểm tra chênh lệch tổng, đối chiếu km | Địa điểm dừng, thời gian OT thực từng khung, nguyên nhân quá tốc độ |
| Điểm dừng | Xe, thời điểm bắt đầu/kết thúc, địa chỉ hoặc tọa độ | Dừng ở đâu, bao lâu, phân loại và ghép lệnh | Đã tắt máy nếu không có dữ liệu máy nổ đáng tin |
| Chặng máy | Xe, bắt đầu/kết thúc đầy đủ ngày giờ, ý nghĩa trạng thái nguồn | Khoảng máy hoạt động và OT đề xuất nếu nguồn đã xác minh | Tài xế đang làm việc suốt khoảng đó |
| Chi tiết hành trình | Xe, dấu thời gian, điện áp/tốc độ/tọa độ tùy báo cáo | Kiểm chứng máy nổ, chia theo mốc giờ và đối soát sự kiện | Dữ liệu trong khoảng GPS mất tín hiệu |
| Nhiên liệu GPS | Xe, thời gian, loại số đo, đơn vị | Tiêu hao hoặc lượng nạp tùy đúng nghĩa trường | Không dùng lượng nạp để thay tiêu hao và ngược lại |
| Sự kiện an toàn | Xe/tài xế, thời điểm, loại; hoặc tổng đếm ngày | Theo dõi cảnh báo nhà cung cấp | Không dựng ra sự kiện chi tiết từ số đếm tổng |

File chỉ có một phần vẫn được tiếp nhận cho phần đó. Nhật ký hiển thị ma trận đủ/thiếu theo loại dữ liệu. Một xe/ngày có thể đã đủ km nhưng thiếu chặng máy để tính OT.

### 9.2 Quy trình năm bước

1. **Chọn file:** hỗ trợ `.xlsx` và `.csv` trong phạm vi đầu tiên. Liệt kê toàn bộ sheet có dữ liệu, kể cả sheet ẩn; cho xem và chọn rõ. Nếu mẫu thực tế là `.xls`, phải bổ sung hỗ trợ hoặc hướng dẫn xuất `.xlsx` trước nghiệm thu, không đổi đuôi giả.
2. **Nhận dạng báo cáo:** chọn loại báo cáo và cấu hình đọc Bình Minh. Nhớ hàng tiêu đề, vùng dữ liệu, cột, cách hiểu ngày/số/thời lượng theo từng mẫu đã xác nhận. Sheet lạ hoặc mẫu thay đổi phải báo để xác nhận lại.
3. **Ghép và chuẩn hóa:** ghép xe, tài xế, ngày giờ, đơn vị. Thông tin biển số/ngày ở đầu trang có thể áp xuống các dòng bên dưới khi bộ đọc mẫu đã xác nhận cấu trúc đó.
4. **Xem trước và xử lý:** hiện dữ liệu gốc cạnh kết quả, thống kê thêm mới/trùng/xung đột/lỗi/không nhập; mỗi lỗi có file, sheet, dòng, trường và hướng sửa. Xem trước tác động tới ngày đã duyệt.
5. **Xác nhận nhập:** ghi đợt nhập, cập nhật các nhóm xe/ngày hợp lệ, tính lại phần chưa khóa, sinh/cập nhật ngoại lệ. Trả biên bản với số dòng và danh sách ngày ảnh hưởng.

Không ghi dữ liệu chính thức ngay khi tải file. Một nhóm xe/ngày/loại báo cáo có dòng lỗi thì mặc định giữ cả nhóm chờ sửa; các nhóm độc lập hợp lệ có thể được người dùng chọn nhập trước. Không âm thầm lấy vài chặng rồi đánh dấu ngày đã đủ dữ liệu.

### 9.3 Quy tắc dữ liệu

- Chuẩn hóa biển số để ghép: bỏ khác biệt dấu chấm/gạch/khoảng trắng, giữ giá trị gốc. Ghép bằng danh mục trong công ty; kết quả nhiều ứng viên hoặc không tồn tại phải chọn, không tự tạo xe.
- Ngày giờ nguồn phải được hiểu theo cấu hình mẫu; không đoán `05/10` là ngày 10 tháng 5. Dùng múi giờ Việt Nam khi nghiệp vụ diễn ra ở Việt Nam.
- Thời lượng `6:45` là 6 giờ 45 phút, không phải 6,45 giờ. Phân biệt thời lượng trên 24 giờ với giờ trong ngày. Đọc cả kiểu ngày số của Excel và chuỗi theo mẫu đã kiểm chứng.
- Lưu thời điểm bắt đầu và kết thúc đầy đủ ngày. Chỉ suy ra qua đêm từ giờ kết thúc nhỏ hơn giờ bắt đầu khi mẫu bảo đảm chặng dưới 24 giờ; còn lại yêu cầu ngày kết thúc.
- Đơn vị chuẩn: km, lít, kg, phút/giây, VND. Chỉ chuyển đổi đơn vị khi được xác định rõ trong mẫu.
- Bỏ qua tiêu đề lặp, tổng cộng, ghi chú và dòng trống theo cấu trúc được nhận diện; biên bản vẫn nêu số dòng loại. Không cộng cả chi tiết lẫn dòng tổng.
- Trường công thức trong file không được thực thi như chương trình. Chỉ đọc giá trị đã lưu khi thích hợp; thiếu giá trị kết quả phải báo lỗi, không đoán số. Không chạy macro hoặc truy cập liên kết ngoài.
- Số âm, cuối trước đầu, thời lượng không hợp lệ, km không phù hợp, tọa độ ngoài phạm vi và máy nổ nhỏ hơn lăn bánh phải báo. Không tự cắt về 0 để che sai dữ liệu.
- File lớn xử lý có tiến độ; mặc định giới hạn 20 MB/file, 200.000 dòng dữ liệu/đợt như mục tiêu kỹ thuật ban đầu, điều chỉnh sau khi có mẫu thực. Đóng tab không làm mất đợt nhập đã tiếp nhận; người dùng xem trạng thái và thử lại khi lỗi.

### 9.4 Chống trùng và nhập lại

| Tình huống | Hành vi |
|---|---|
| Tải lại đúng file, cùng nội dung | Nhận diện đã nhập; không tạo thêm bản ghi hoặc vấn đề |
| Đổi tên file nhưng nội dung giữ nguyên | Vẫn nhận diện trùng |
| File tháng chứa các ngày đã nhập theo tuần | So sánh theo sự kiện hoặc xe/ngày/loại báo cáo, không chỉ theo tên file |
| Cùng khóa, cùng dữ liệu | Bỏ qua và thống kê số dòng trùng |
| Cùng khóa, khác dữ liệu | Hiện so sánh trước/sau, yêu cầu chọn bản dùng; giữ cả nguồn và lịch sử |
| Cùng xe/thời gian nhưng sự kiện khác có thật | Không loại chỉ vì giống giờ; dùng mã nguồn nếu có, nếu không dùng nhóm trường định danh và phát hiện xung đột |
| File mới thiếu một dòng từng có | Không tự xóa sự kiện cũ; chỉ thay toàn vùng khi người dùng chọn rõ phạm vi và xác nhận |
| Bấm nhập nhiều lần hoặc kết nối mất lúc xác nhận | Một đợt chỉ ghi nhận một lần; mở lại thấy kết quả đã lưu |

Ưu tiên khóa sự kiện của nhà cung cấp. Khi không có, dấu nhận diện gồm công ty, nguồn, xe, loại báo cáo, thời điểm/khoảng thời gian và trường định danh phù hợp loại dữ liệu. Tổng ngày có khóa riêng; thứ tự dòng Excel không phải khóa nghiệp vụ.

Chi tiết và tổng ngày được lưu để đối chiếu nhưng chỉ **một nguồn được chọn cho mỗi chỉ tiêu**. Ví dụ có km ngày từ báo cáo tổng hợp và tổng km chặng, không cộng hai số. Chỉ tiêu chọn nguồn, độ đầy đủ và sai lệch được hiển thị khi có xung đột; Admin xác nhận nguồn dùng và ghi lý do.

### 9.5 Truy nguồn, sửa và thu hồi đợt nhập

Lưu bản file gốc, dấu nhận diện nội dung, loại báo cáo, cấu hình đọc/phiên bản, người và thời điểm nhập, sheet/dòng nguồn. Điều chỉnh bằng tay lưu giá trị gốc, giá trị sử dụng, lý do và người sửa. Nhập lại không xóa phân loại điểm dừng, ảnh hoặc giải trình đã nhập tay nếu sự kiện vẫn là cùng một sự kiện.

Trước khi có duyệt/chốt, Admin có thể thu hồi đợt nhập và xem trước phần bị tác động. Chỉ thu hồi đóng góp của đợt đó, không xóa dữ liệu còn nguồn hợp lệ khác. Sau duyệt/chốt phải đi qua điều chỉnh có quyền Quản lý; không hoàn tác âm thầm tiền đã gửi HRM hoặc chi phí đã phân bổ.

Nhập tay là đường dự phòng chính thức cho mẫu không đọc được hoặc dữ liệu thiếu: nhập cùng các trường nghiệp vụ, gắn nguồn/ảnh và lý do. Luôn phân biệt với dữ liệu tải từ GPS; không dùng nhãn “GPS xác nhận” cho số nhập tay.

## 10. Nhật ký, điểm dừng và đối chiếu

### 10.1 Các trục thời gian

Ngày công đội xe D bắt đầu 04:00 ngày D, kết thúc trước 04:00 ngày D+1. Khoảng chặng dùng đầu bao gồm, cuối không bao gồm để không đếm trùng tại ranh giới. Chặng kéo qua 04:00 được cắt sang hai ngày công.

Ngày lịch của file GPS thường là 00:00–24:00 nhưng phải xác minh bằng file mẫu. Nếu chỉ có tổng ngày lịch, giữ nguyên tổng với nhãn ngày nguồn; không tùy tiện chuyển tổng km sang ngày công. Chỉ tạo tổng ngày công chính xác khi có chi tiết đủ chia, hoặc bản nhập tay đã được xác nhận. Chênh lệch do hai cách chia ngày được giải thích rõ.

Nhật ký vận hành và báo cáo OT dùng ngày công. Nhiên liệu, chứng từ và kỳ chi phí dùng ngày phát sinh theo lịch. Các phần báo cáo ghi rõ cơ sở kỳ; phân bổ cắt công việc nhiều ngày về ngày phục vụ thực tế. Khi cần dùng km ngày lịch thay km ngày công vì thiếu chi tiết, phải gắn nhãn nguồn và không dùng để khẳng định khớp từng lệnh ngày công.

Riêng khoản OT được gắn ngày công của hồ sơ đã duyệt; ngày duyệt hoặc ngày trả tiền không tự chuyển khoản này sang kỳ vận hành khác. Nếu chính sách kỳ HRM khác ngày công đội xe, bản chuyển phải ghi cả ngày công nguồn và kỳ tiếp nhận. Km dùng tính chi phí/km và nhiên liệu phải cùng khoảng lịch với tử số; không dùng tổng km ngày công lệch bốn giờ mà bỏ qua chênh phạm vi, nhất là ở ranh giới tháng.

### 10.2 Chỉ số ngày

| Chỉ số | Cách xác định | Điều kiện |
|---|---|---|
| Km thực tế | Nguồn GPS được chọn cho đúng khoảng | Có kiểm tra trùng và độ đầy đủ |
| Giờ lăn bánh | Tổng khoảng xe di chuyển không trùng | Tổng nguồn hoặc chi tiết đã kiểm chứng |
| Khoảng hoạt động đầu–cuối | Mốc cuối trừ mốc đầu trong ngày công | Ghi chú là chỉ số thay cho “giờ có mặt” trong mẫu; không phải giờ công pháp lý |
| Thời gian không lăn bánh trong khoảng | Khoảng đầu–cuối trừ lăn bánh | Chứa chờ, nghỉ, giao hàng; không tự gọi toàn bộ là thời gian lãng phí |
| Tỷ lệ lăn bánh | Lăn bánh / khoảng đầu–cuối | Mẫu số >0; thiếu dữ liệu trả chưa xác định |
| Nổ máy đứng yên | Thời gian máy nổ thực trừ thời gian lăn bánh tương ứng | Cùng nguồn/độ phủ và không có mâu thuẫn |
| Tốc độ TB lăn bánh | Km / giờ lăn bánh | Không phải tốc độ trung bình cả ngày |
| Lệch km | (Km thực tế − km kế hoạch) / km kế hoạch | Cùng phạm vi, kế hoạch >0 và đủ tất cả công việc |
| L/100km GPS | Lít tiêu hao GPS / km ×100 | Là tiêu hao, không phải số lít nạp GPS |

Không dùng riêng hai mốc mở/tắt để suy ra xe chạy liên tục hoặc máy nổ liên tục suốt ngày. Nếu dữ liệu máy nổ không tin cậy, chỉ số nổ máy đứng yên chưa xác định. Nhập thiếu GPS không làm mất lệnh kế hoạch của ngày đó.

Một ngày chỉ được đánh dấu đã đủ dữ liệu sau khi có báo cáo bao phủ phạm vi yêu cầu hoặc Admin xác nhận xe không hoạt động từ căn cứ phù hợp. Không có bản ghi không có nghĩa xe nghỉ. Ngày nghỉ đã xác nhận được tách khỏi ngày mất dữ liệu và không làm tăng số ngày chạy.

### 10.3 Điểm dừng

Ghi nhận khoảng đứng yên từ 5 phút trở lên theo nguồn/mẫu đã chốt. Nhãn ngắn hơn 5 phút, nếu cần giữ từ nguồn, không đưa vào số điểm dừng nghiệp vụ. Một điểm dừng lưu thời gian bắt đầu/kết thúc, vị trí, phút máy nổ và nguồn xác định, loại, công việc liên quan và ghi chú.

Danh mục ban đầu: điểm giao theo lệnh; xưởng lên/xuống hàng; nạp dầu; ăn nghỉ; nghỉ sau đợt lái; bảo dưỡng/sửa xe; đỗ qua đêm; ngoài lệnh; chưa rõ.

| Điều kiện | Đánh giá máy |
|---|---|
| Dừng từ 5 đến hết 10 phút | Dừng ngắn |
| Trên 10 phút, thiếu tín hiệu đủ tin cậy | Chưa xác định |
| Trên 10 phút, tỷ lệ máy nổ ≤10% | Đã tắt máy |
| Trên 10 phút, tỷ lệ máy nổ ≥80% | Không tắt máy |
| Trên 10 phút, tỷ lệ ở giữa | Tắt một phần |

Ngưỡng điện áp ban đầu từ Word: xe 24V ≥26V, xe 12V ≥12,6V. Chỉ áp dụng sau khi kiểm chứng bằng các khoảng biết chắc bật chìa/tắt máy/nổ máy của xe đó. Tính phút theo độ dài khoảng thời gian được quan sát, không lấy số mẫu cao áp chia số mẫu nếu nhịp gửi khác nhau. Khoảng mất tín hiệu không nội suy vô hạn; độ trễ mẫu tối đa và tỷ lệ phủ tối thiểu phải chốt bằng file Bình Minh. Chưa chốt hoặc độ phủ không đạt thì kết luận “Chưa xác định”, cho nhập phút có bằng chứng để quản lý xem.

Đối chiếu lệnh:

- Điểm giao cần ghép với công việc/địa điểm tương ứng. Có thể gợi ý theo địa chỉ/tọa độ, người dùng xác nhận khi chưa chắc chắn.
- Xưởng, cây xăng, nơi nghỉ hoặc sửa chữa có loại phù hợp được ghi nhận “Phù hợp mục đích”; không được dùng loại này để xóa kiểm tra thiếu lệnh cả ngày.
- Ngoài lệnh giữ nguyên kết quả cho đến khi có giải trình được chấp nhận.
- Chưa rõ vào hàng chờ phân loại, chưa coi là lỗi tài xế đã kết luận.
- Khi chưa có tọa độ, cho ghép thủ công bằng địa chỉ và bằng chứng. Không bắt mua dịch vụ bản đồ để dùng được phân hệ.

Danh mục địa điểm quen dùng chung xưởng/địa chỉ dự án nếu đã có. Hệ thống nhớ loại đã xác nhận và gợi ý lần sau; điểm gần nhau hoặc có nhiều mục đích vẫn cần xác nhận. Không coi tự gợi ý là tự chứng minh đúng lệnh.

### 10.4 Ảnh và kiểm lốp

Ảnh gắn với mốc: xuất phát hành trình, từng điểm giao yêu cầu bằng chứng, về xưởng khi kết thúc. Mỗi mốc có trạng thái “Đã kiểm tra trên Zalo”, “Đã đính kèm”, “Thiếu”, “Không áp dụng”; người đánh dấu và thời điểm được lưu. Đã kiểm tra trên Zalo không đồng nghĩa có bản ảnh lưu ở ERP.

Nguồn cho phép Admin tick ảnh đã nhận, vì vậy không bắt tải lại tất cả ảnh. Với đổ dầu, sự cố và giải trình ảnh hưởng tiền, ưu tiên giữ bản đính kèm để xem lại; hồ sơ chưa có bản vẫn thể hiện mức bằng chứng thực có. Không suy ra tính xác thực chỉ từ thời điểm tệp hoặc tọa độ ảnh.

Kiểm lốp: Đạt, Có vấn đề, Chưa kiểm tra. “Có vấn đề” phải mô tả; nếu ảnh hưởng an toàn tạo vấn đề và chuyển xe tạm dừng theo quyết định người có quyền. Ngày xe không chạy không tự bị tính thiếu kiểm lốp. Ngày đi tỉnh tiếp tục chạy vẫn cần kiểm lốp, dù không có mốc về xưởng.

## 11. Tăng ca và quyết định duyệt

### 11.1 Dữ liệu và công thức

Hệ thống tính **OT đề xuất theo khoảng máy hoạt động đã xác minh**, theo yêu cầu nguồn. Đây là căn cứ vận hành cho Quản lý xét, không khẳng định mọi phút máy nổ là phút làm việc. Thời gian bốc dỡ khi tắt máy chỉ bổ sung bằng đề nghị có bằng chứng và quyết định, không tự phát sinh từ giờ chờ.

| Khung trong ngày công D | Đơn giá khởi tạo |
|---|---:|
| 04:00–08:00 ngày D | 75.000 đ/giờ |
| 17:00–22:00 ngày D | 50.000 đ/giờ |
| 22:00–24:00 ngày D | 75.000 đ/giờ |
| 00:00–04:00 ngày D+1 | 100.000 đ/giờ |

Thời gian một khung bằng tổng phần giao giữa các khoảng hợp lệ và khung đó. Gộp khoảng trùng trước khi cộng. Giữ độ chính xác thời gian gốc khi tính, chỉ làm tròn số hiển thị; tiền VND làm tròn ở kết quả cuối. Khoảng 08:00–17:00 không sinh OT theo chính sách mẫu này.

Ví dụ: chặng 21:30 ngày D đến 01:30 ngày D+1 có 0,5 giờ khung 17–22, 2 giờ khung 22–24 và 1,5 giờ khung 24–04. Tổng 4 giờ, tiền đề xuất 325.000 đồng. Chặng 03:30–05:00 được chia 0,5 giờ cho ngày công trước và 1 giờ cho ngày công sau.

Đối chiếu dữ liệu mẫu 05/10/2026 của Hino: chặng đầu tạo 98 phút OT sáng, chặng sau tạo 100 phút OT chiều. Tính trên phút gốc cho tiền duyệt đủ 205.833 đồng; Excel đang lưu 205.750 đồng do làm tròn thành 1,63 và 1,67 giờ trước khi tính. Đây là chênh lệch có chủ ý cần thống nhất khi nghiệm thu, không dùng tiền đã làm tròn trung gian trong mẫu làm đáp án bắt buộc.

Một tài xế đổi xe trong ngày không được cộng trùng khoảng thời gian. Một xe đổi tài xế phải tách phần giờ từng người. Màn hình duyệt theo tài xế/ngày và mở được phần từng xe; khi một xe/một người thì vẫn đơn giản như mẫu.

### 11.2 Ghép lệnh và đánh giá

| Kết quả | Điều kiện | Hành động |
|---|---|---|
| Không có OT | Dữ liệu đủ và không có khoảng thuộc khung | Không tạo yêu cầu trả tiền |
| Chưa đủ dữ liệu | Thiếu chặng hợp lệ, thiếu người lái, dữ liệu xung đột hoặc ngày chưa khép đủ | Hoàn thiện, không duyệt hàng loạt |
| Không có lệnh | Chưa có lệnh hiệu lực/căn cứ công việc tương ứng | Không được duyệt; cần bổ sung và giải trình trước |
| Đủ điều kiện đề xuất | Dữ liệu đầy đủ; lệnh cho phép đúng khung và phạm vi; các kiểm tra áp dụng đạt | Có thể chọn duyệt hàng loạt |
| Cần giải trình | OT ngoài cho phép, lệnh lập bù, lệch km, tốc độ thấp, trễ giờ hoặc điều chỉnh thủ công | Quản lý xem lý do và quyết định từng hồ sơ |

OT sáng yêu cầu cho phép sáng; ba khung còn lại yêu cầu cho phép tối/đêm. Có một công việc được OT không tự cho phép toàn bộ việc khác cùng ngày. Khoảng được giao và các thay đổi kế hoạch có hiệu lực là căn cứ ghép.

Kiểm tra định mức đề xuất ban đầu:

- Lệch km tuyệt đối >15% so với kế hoạch đầy đủ thì cần giải trình.
- Tốc độ TB lăn bánh <70% tốc độ chuẩn của xe thì đưa chỉ báo cần xem; tuyến nội thành, tắc đường hoặc công việc đặc thù có thể được giải trình. Không suy diễn thành cố tình kéo dài giờ.
- Trễ về >30 phút so với mốc kế hoạch tương ứng là chỉ báo bổ sung từ Excel. Với hành trình nhiều ngày phải so đúng mốc ngày/công việc, không so với giờ về xưởng cuối chuyến cho tất cả ngày.

Thiếu chỉ tiêu bắt buộc để xét một chính sách thì chưa đủ điều kiện duyệt hàng loạt. Chỉ tiêu được xác định không áp dụng, ví dụ không có km kế hoạch cho một việc bảo dưỡng, được ghi rõ “Không áp dụng” và lý do; không tự biến thành kiểm tra đạt. Bộ điều kiện chính thức cần được công ty chốt vì hai nguồn đang khác nhau.

### 11.3 Duyệt đủ, một phần và không duyệt

Duyệt đủ lấy toàn bộ phút đủ căn cứ. Duyệt một phần nhập số phút được duyệt **theo từng khung**; màn hình hiển thị tổng giờ và tiền ngay. Không duyệt ghi 0 và lý do. Giờ duyệt không âm và không vượt phần có căn cứ; phần làm việc bổ sung ngoài GPS phải là dòng riêng có bằng chứng, lý do và phê duyệt, tránh sửa số GPS.

Thiết kế ưu tiên duyệt từng khung vì một giờ buổi chiều và một giờ sau nửa đêm có đơn giá khác nhau. Nếu cần giữ thao tác nhập một tổng giờ như Excel, nút “Chia theo tỷ lệ” phân bổ tổng giờ vào các khung theo tỷ lệ gốc, cho xem trước và lưu rõ cách chia. Đây là cách tương thích công thức mẫu, không âm thầm chọn khung có giá thấp hoặc cao.

Tiền duyệt = tổng giờ được duyệt ở mỗi khung × đơn giá có hiệu lực của khung. Với ví dụ 325.000 đồng ở trên, duyệt một nửa theo tỷ lệ cho 2 giờ được 162.500 đồng; nếu duyệt cụ thể 2 giờ ở khung 22–24 thì được 150.000 đồng. Màn hình phải thể hiện được sự khác nhau này.

### 11.4 Trạng thái và sửa sau duyệt

Trạng thái hồ sơ: Chưa đủ dữ liệu → Chờ duyệt → Đã duyệt/Không duyệt; có cờ Cần duyệt lại khi căn cứ thay đổi. Mỗi quyết định lưu người, thời điểm, lý do, nguồn chặng, lệnh/phiên bản và đơn giá áp dụng.

Duyệt hàng loạt chỉ gồm dòng đủ điều kiện, chưa bị người khác thay đổi. Kết quả nêu rõ dòng thành công và dòng phải xem lại. Không có nút tự duyệt không qua người có quyền.

Sau duyệt, thay GPS, tài xế, lệnh cho phép OT hoặc tham số liên quan tạo kết quả đề xuất mới và thông báo cần duyệt lại; bản quyết định cũ vẫn giữ nguyên. Nếu chưa chuyển HRM thì bản cũ bị giữ không chuyển tiếp. Nếu HRM đã tiếp nhận hoặc kỳ đã khóa thì tạo điều chỉnh có tham chiếu, không sửa ngược khoản đã dùng. Thay đổi tham số tương lai không tự làm mất hiệu lực các kỳ trước.

## 12. Nhiên liệu và chi phí

### 12.1 Phiếu đổ dầu

Trường: ngày giờ, xe, người thực hiện/tài xế, cây xăng, số/chứng từ nếu có, số lít hóa đơn, đơn giá, thành tiền, km đồng hồ, có đổ đầy bình không, lít GPS ghi nhận nạp nếu có, ảnh trước/sau/cột bơm và ghi chú. Nguồn chỉ có ngày vẫn được lưu nhưng đánh dấu chưa đủ thời điểm để ghép tự động với các lần nạp cùng ngày.

Thành tiền mặc định = lít × đơn giá. Nếu tổng hóa đơn khác vì làm tròn/điều chỉnh, lưu riêng tổng hóa đơn và lý do; số được xác nhận dùng làm chi phí. Kiểm tra trùng theo mã hóa đơn hoặc nhóm xe/thời gian/cây xăng/lít/tiền; kết quả nghi trùng cần đối chiếu, không tự xóa lần đổ có thật.

Km đồng hồ phải tăng theo diễn biến thời gian. Ghi nhận thay đồng hồ/hiệu chỉnh bằng sự kiện có lý do và giá trị nối tiếp, không giả vờ xe chạy số km âm. Nhập lần đổ cũ tính lại các khoảng liên quan chưa khóa theo thứ tự thời gian, không theo thứ tự nhập.

### 12.2 Ba khái niệm nhiên liệu riêng biệt

| Đại lượng | Cách tính | Sử dụng |
|---|---|---|
| Lượng mua | Tổng lít hóa đơn trong kỳ | Chi phí và đối chiếu mua dầu |
| Tiêu hao GPS | Tổng lượng tiêu thụ cảm biến theo khoảng đầy đủ | Chỉ số vận hành; ghi rõ nguồn và chất lượng cảm biến |
| Tiêu hao đầy bình | Tổng lít nạp sau mốc đầy bình trước đến và gồm mốc đầy bình sau, chia km giữa hai mốc ×100 | Đo tiêu hao thực nghiệm, có thể đi qua nhiều lần nạp một phần |

Lần đầy bình đầu chỉ thiết lập mốc. Không đủ hai mốc hoặc km hợp lệ thì chưa có chỉ số đầy bình. Nếu có sự kiện xả/rút/chuyển dầu, khoảng đo bị đánh dấu cần điều chỉnh, không kết luận thất thoát từ tỷ lệ đơn thuần.

Lít mua tháng/km tháng có thể hiện như chỉ số tham khảo “Lít mua trên 100 km”, không gọi là tiêu hao thực tế và không tự sinh lỗi vượt định mức. Muốn tính tiêu hao theo cân bằng bình phải có tồn đầu/cuối được xác nhận; không bắt nhập tồn bình hằng ngày trong phạm vi đầu tiên.

Chênh nạp = lít hóa đơn − lít GPS ghi nhận **cùng lần nạp**. Tỷ lệ chênh dùng lít hóa đơn làm mẫu số để tương thích Excel `NHẬT KÝ DẦU!M5`. Vượt 10% theo trị tuyệt đối thì cần đối chiếu. GPS không có số thì “Chưa có dữ liệu”, GPS bằng 0 khi hóa đơn >0 là bất thường cần xem. Thiếu ảnh và lệch lít có thể cùng xuất hiện, không để một nhãn che mất nhãn còn lại.

Excel ghi cảm biến đang lệch khoảng 8% tại `THAM SỐ!C30`; đây là thông tin khách hàng, chưa phải kết quả kiểm chứng của thiết kế. Không dùng cảnh báo chênh dầu để kết luận tài xế gian lận.

### 12.3 Định mức và hiệu quả

Giữ chỉ số L/100km theo xe và tài xế nếu phần km/lít phân được đúng người. Khi cần xét tổng tiêu hao, dùng lượng tham chiếu = km × định mức lăn bánh /100 + giờ nổ máy đứng yên × định mức L/giờ, với điều kiện cả hai định mức và dữ liệu máy nổ đã được xác nhận.

Nếu chỉ có tiêu hao tổng mà không có thời gian nổ máy đứng yên tin cậy, báo so sánh L/100km với định mức lăn bánh dưới nhãn “Cần đối chiếu điều kiện vận hành”. Không quy toàn bộ phần tăng cho lái xe. Ngưỡng vượt 15% là ngưỡng yêu cầu xem xét, chỉ mở một vấn đề cho xe/kỳ khi có dữ liệu đủ dùng. Theo tài xế không phân bổ bằng cách đoán nếu ngày có đổi người mà thiếu chi tiết.

### 12.4 Một sổ chi phí

Sổ chung gồm dầu, OT đã duyệt, phí đường/ePass, gửi xe, bảo dưỡng/sửa chữa/lốp, đăng kiểm/bảo hiểm và sự cố/vi phạm theo chính sách ghi nhận. Dầu và OT hiện ở sổ qua liên kết nguồn, không nhập thêm bản sao bằng tay.

Mỗi khoản có ngày phát sinh, xe, loại, số tiền, bên chịu, dự án hoặc mục đích nội bộ, chứng từ, trạng thái xác nhận, nguồn liên quan và trạng thái thanh toán nếu đã nối Tài chính. Có thể tách phần công ty/tài xế bằng hai phần tiền có tổng bằng khoản gốc; mặc định chỉ một bên như mẫu.

Chi phí dự kiến của vấn đề tách khỏi khoản đã xác nhận. Báo cáo chính thức lấy phần công ty chịu, đã xác nhận, không hủy. Khoản chờ xác nhận và khoản tài xế chịu hiện riêng. Không tự trừ lương từ kết luận bên chịu; HRM/Tài chính xử lý theo quy trình và căn cứ riêng.

Chi phí vận hành trong phạm vi nguồn chưa bao gồm lương cứng, khấu hao và lãi vay. Phí trả trước nhiều kỳ hiển thị chính sách ghi nhận của Tài chính nếu đã có; không tự tạo bộ máy phân bổ tài sản trong Đội xe. Báo cáo phải nêu kỳ và cơ sở ghi nhận đang dùng để đọc đúng chi phí/km.

## 13. Vấn đề, sự cố và trách nhiệm xử lý

### 13.1 Một hồ sơ cho một việc cần giải quyết

Sự cố nhập tay và ngoại lệ tự sinh cùng đi vào **Vấn đề**. Không tạo thêm sổ sự cố có vòng đời độc lập. Sổ sự cố/vi phạm trong nguồn là một chế độ lọc của danh sách này; các khoản tiền liên quan nằm ở sổ chi phí và được mở từ hồ sơ vấn đề.

Thông tin: mã, ngày xảy ra và ngày phát hiện, xe/tài xế liên quan, loại, mức, mô tả, nguồn, người xử lý, hạn, giải trình, nguyên nhân gốc, bên chịu trách nhiệm, hành động, chi phí liên quan, dự án, kết luận và lịch sử. “Bên chịu trách nhiệm” có thêm Chưa xác định; không gán lỗi tài xế ngay khi tạo.

### 13.2 Danh mục ngoại lệ

| Ngoại lệ | Điều kiện đủ để phát hiện | Mức ban đầu | Xử lý |
|---|---|---|---|
| Hoạt động không có lệnh | Có thực tế vận hành đáng tin nhưng không có lệnh phù hợp | Nặng | Một vấn đề xe/ngày; không coi bản ghi GPS xe đỗ yên là một chuyến |
| Quá tải | Tải đã biết vượt tải cho phép đã xác minh | Nặng | Chặn phát hành; nếu phát hiện sau chuyến vẫn mở vấn đề điều phối |
| Dừng ngoài lệnh/chưa giải thích | Điểm dừng đã đối chiếu có bất thường | Trung bình | Gộp điểm dừng cùng loại trong xe/ngày, giữ danh sách bằng chứng |
| Không tắt máy | Dừng >10 phút, dữ liệu máy đủ và tỷ lệ ≥80% | Trung bình | Yêu cầu giải trình điều kiện vận hành |
| Quá tốc độ | Nguồn báo sự kiện hoặc số đếm >0 | Trung bình | Giữ căn cứ nhà cung cấp; không tự dựng giới hạn tốc độ đường |
| Lái liên tục trên 4 giờ | Nguồn có sự kiện đáng tin hoặc đủ chi tiết và người lái | Trung bình | Xem khoảng lái/nghỉ và giải trình; chưa tự kết luận xử phạt |
| Vượt giờ lái nội bộ | Trên 10 giờ/ngày hoặc 48 giờ/tuần theo chính sách đang bật | Nặng | Ghi rõ cảnh báo nội bộ; tuần gộp theo tài xế, kể cả đổi xe |
| Khoảng hoạt động >12 giờ | Đủ mốc đầu/cuối | Trung bình | Xem điều phối và nghỉ giữa chuyến |
| Thiếu ảnh/chưa kiểm lốp | Mốc hoặc ngày thực sự áp dụng nhưng chưa hoàn thiện | Nhẹ | Nhắc trên nhật ký; lỗi lốp ảnh hưởng an toàn xử lý riêng |
| Lệch nạp dầu/thiếu ảnh đổ dầu | Chênh vượt 10% trên dữ liệu ghép đúng hoặc thiếu bằng chứng | Trung bình | Một vấn đề gắn lần đổ, có đủ các lý do |
| Nhiên liệu vượt tham chiếu | Vượt 15% với khoảng đo đủ căn cứ | Trung bình | Một vấn đề xe/kỳ, điều tra xe/tuyến/cảm biến |
| Sắp đến hạn | Còn ≤30 ngày hoặc ≤500 km, vẫn chưa quá hạn | Nhẹ | Nhắc từ lịch |
| Quá hạn | Hạng mục đã có hạn và đã vượt hạn | Nặng | Một vấn đề cho hạng mục và chu kỳ, không sinh lại mỗi ngày |

Các mức từ nguồn dùng khởi tạo. Mức nghiêm trọng thực tế của sự cố nhập tay do người có quyền xác định; tai nạn hoặc hỏng xe mất an toàn không bị giới hạn ở mức Trung bình chỉ vì cùng nhóm.

Giai đoạn đầu ưu tiên tiếp nhận sự kiện lái liên tục do GPS báo, giữ nguyên thông tin nguồn. Chỉ tự tính lại khi đã xác nhận cách nhận biết xe di chuyển, thời gian nghỉ đủ để kết thúc một đợt lái và cách xử lý mất tín hiệu. Một điểm dừng 5 phút hoặc một lần tắt máy không mặc định đặt lại bộ đếm 4 giờ. Ngưỡng nghỉ này chưa có trong nguồn, cần chốt cùng bộ đọc GPS; chưa chốt thì không sinh kết luận tự tính. Với tổng đếm và danh sách sự kiện cùng loại, chọn một nguồn đếm để tránh cộng đôi.

### 13.3 Chống sinh vấn đề lặp và cảnh báo lặp lại

Khóa gộp theo bản chất: ngoại lệ ngày dùng xe/ngày/loại; quá giờ tuần dùng tài xế/tuần/loại; dầu dùng lần đổ; vượt tiêu hao dùng xe/kỳ; lịch dùng hạng mục/chu kỳ. Nhập lại dữ liệu cập nhật bằng chứng của hồ sơ cũ, không tạo một vấn đề mới vì thay mã đợt nhập.

Một sự kiện tính một lần dù có nhiều file nguồn. Ba sự việc độc lập cùng loại trong 90 ngày trên cùng xe hoặc cùng tài xế được gắn “Lặp lại”, hiện các sự việc liên quan và bắt buộc nguyên nhân gốc trước khi đóng. Không đếm ba lần nhập lại là ba lần tái diễn.

Nếu dữ liệu được sửa làm điều kiện không còn, vấn đề hiện “Căn cứ đã thay đổi”. Hồ sơ chưa có xử lý có thể được xác nhận không phát sinh; hồ sơ đã có quyết định/chi phí không tự đóng hoặc xóa. Quản lý/Admin có quyền phù hợp xem lại và lưu kết luận.

### 13.4 Vòng đời và quyền quyết định

Giữ các trạng thái nguồn: **Mới → Chờ giải trình → Chờ quyết định → Đang xử lý → Đã đóng**. Có thể bỏ qua bước không cần thiết với lý do; việc đơn giản không phải đi đủ năm lần bấm.

Admin ghi giải trình, đề xuất xử lý và thực hiện hành động đã được quyết định. Quản lý quyết định chấp nhận giải trình, nhắc nhở, yêu cầu sửa xe, thay đổi điều phối hoặc xác định trách nhiệm chi phí. Admin được đóng nhẹ/trung bình sau khi hoàn thành hành động đã được Quản lý quyết định; mức Nặng chỉ Quản lý đóng. Quản lý có thể mở lại với lý do.

Hạn mặc định tính từ phát hiện: Nặng 1 ngày, Trung bình 3 ngày, Nhẹ 7 ngày; lưu hạn cụ thể và lịch sử đổi hạn. Thông báo khi giao mới, sắp/quá hạn theo cấu hình hoặc đổi quyết định quan trọng; một đợt nhập lịch sử chỉ gửi bản tổng hợp. Nhắc tra phạt nguội thứ hai là đầu việc định kỳ gọn trong danh sách cần làm, lưu ngày tra và kết quả, không xây tích hợp tra cứu tự động.

Lỗi điều phối, tải cao, chờ thợ, giờ hoạt động dài được xem theo căn cứ. Không tự đánh dấu lỗi tài xế. Vấn đề có chi phí mở biểu mẫu chi ngay trong hồ sơ và tạo đúng một khoản nguồn; không tự tạo chi phí chính thức chỉ từ con số ước tính.

## 14. Lịch xe, giấy tờ và bảo dưỡng

Hạng mục mặc định cho xe: đăng kiểm, bảo hiểm TNDS, bảo hiểm thân vỏ, phí đường bộ, dịch vụ GPS, thẻ đi đường/ePass nếu có nghĩa vụ theo dõi thực, bảo dưỡng định kỳ và đảo/kiểm lốp. Với tài xế: GPLX, khám sức khỏe. Hạng mục không áp dụng được tắt với lý do, không buộc nhập ngày giả cho ePass nếu tài khoản không có hạn cần gia hạn.

Theo dõi theo ngày, theo km hoặc cả hai khi có chỉ dẫn; đến điều kiện nào trước thì nhắc trước. Trường gồm đối tượng, hạng mục, lần thực hiện trước, hạn ngày/km, chu kỳ, người phụ trách, chứng từ và trạng thái.

Km hiện tại lấy từ bản đọc đồng hồ đã xác nhận gần nhất: đổ dầu, bảo dưỡng hoặc cập nhật đồng hồ. Không dùng khoảng cách GPS tích lũy chưa hiệu chuẩn như km đồng hồ. Hiển thị ngày đọc; nếu số đọc cũ thì nhắc cập nhật, không báo “Còn hạn” với độ chắc chắn giả.

Trạng thái: Chưa có thông tin, Còn hạn, Sắp đến hạn, Đến hạn, Quá hạn, Không áp dụng. Còn đúng 0 km là đến hạn; hạn ngày còn giá trị hết ngày ghi trên giấy tờ trừ quy định cụ thể khác. Thiếu ngày/km không được tính thành 0 hạng mục quá hạn để tạo cảm giác hồ sơ đầy đủ.

Khi thực hiện bảo dưỡng/gia hạn, ghi ngày, km nếu có, nơi thực hiện, chứng từ và chi phí liên kết. Kết thúc chu kỳ cũ, sinh hạn tiếp theo nếu có chu kỳ đã xác nhận; giữ lịch sử. Chu kỳ 5.000 km bảo dưỡng và 10.000 km lốp trong Excel chỉ là gợi ý, phải đối chiếu sổ bảo hành/chính sách xe.

Lịch giấy tờ gắn cá nhân đi theo tài xế khi đổi xe. Bảo dưỡng có khoảng xe không khả dụng phản ánh ngay trên lịch điều xe. Không cần quản lý từng phụ tùng hay tồn kho sửa chữa trong giai đoạn này.

## 15. Báo cáo và phân bổ chi phí

### 15.1 Báo cáo tuần theo tài xế

Chọn tuần thứ hai–chủ nhật, xem từng tài xế và toàn đội; không giới hạn bốn tài xế như Excel. Có trạng thái đủ dữ liệu, ngày chưa nhận GPS, ngày chưa có người lái và OT chưa duyệt.

| Nhóm | Chỉ tiêu |
|---|---|
| Khai thác | Ngày có lái, số lệnh tham gia, ngày chạy không lệnh, km, khoảng hoạt động, giờ lăn bánh, thời gian không lăn bánh, tỷ lệ lăn bánh, máy nổ đứng yên |
| An toàn và bằng chứng | Số dừng, quá tốc độ, lái liên tục quá ngưỡng, dừng lâu không tắt máy, dừng ngoài lệnh, ngày thiếu ảnh, kiểm lốp chưa đạt, hoạt động trên 12 giờ |
| Nhiên liệu | Tiêu hao GPS, L/100km; chưa phân tài xế thì hiện phần chưa phân riêng |
| Tăng ca | Giờ đề xuất và duyệt theo bốn khung, tiền duyệt, số hồ sơ chờ/cần duyệt lại |
| Vấn đề | Số mở mới, đóng trong kỳ, còn mở cuối kỳ, đã xác định tài xế chịu trách nhiệm |
| Tuân thủ | Năm tiêu chí nguồn, số đạt, số chưa đủ căn cứ và trạng thái chốt |

Số ngày một tài xế chạy tính ngày phân biệt, không tăng thành hai ngày khi đổi hai xe. Cột toàn đội nếu cộng ngày phải ghi “Ngày-tài xế”; chỉ tiêu ngày lịch toàn đội tính riêng. Số lệnh toàn đội đếm lệnh phân biệt, không cộng trùng một lệnh có hai tài xế. Tỷ lệ toàn đội tính từ tổng tử/mẫu, không lấy trung bình các tỷ lệ cá nhân.

Năm tiêu chí: không quá tốc độ; tắt máy khi dừng lâu; không dừng ngoài lệnh; đủ ảnh và kiểm lốp; không sự cố/vi phạm đã kết luận do lỗi tài xế. Mỗi tiêu chí có Đạt, Không đạt, Chưa đủ căn cứ hoặc Không áp dụng. Không biến ngày thiếu dữ liệu thành đạt. Khi chưa chốt phụ lục thưởng, bảng chỉ phục vụ đánh giá; chưa xuất khoản thưởng/phạt tự động. Một sự việc không bị trừ lặp vì đồng thời có cảnh báo và hồ sơ vấn đề.

### 15.2 Báo cáo tháng theo xe

Chọn tháng, xe và xưởng quản lý. Gồm:

- Khai thác: số ngày phục vụ, số công việc theo loại, lệnh lập bù, chuyến quá tải, km, khoảng hoạt động, giờ lăn bánh/chờ và tỷ lệ.
- Nhiên liệu: lít mua, tiêu hao GPS, các kỳ đầy bình, định mức áp dụng, chênh lệch có căn cứ và phần chưa thể kết luận.
- An toàn: quá tốc độ, lái liên tục quá ngưỡng, không tắt máy, dừng ngoài lệnh, nổ lốp, sự cố khác, phạt nguội.
- Chi phí công ty chịu: dầu, OT đã duyệt, sự cố/vi phạm, phí đường, bảo dưỡng và các nhóm khác đã xác nhận; khoản tài xế chịu/chờ xác nhận tách riêng.
- Phân bổ: chi trực tiếp, chi phí chung đã phân, nội bộ và còn chưa phân.
- Lịch: đang quá hạn/sắp đến hạn/chưa có thông tin tại ngày xem. Nếu xem lịch sử chốt tháng, dùng ảnh chụp trạng thái lúc chốt, không lấy trạng thái hôm nay thay cho quá khứ.

Chi phí/km = tổng chi phí vận hành theo cơ sở kỳ / tổng km cùng phạm vi. Xe không chạy vẫn có chi phí nhưng chi phí/km là “Không xác định”, không phải 0. Số ngày phục vụ nhiều loại việc có thể giao nhau; không cộng các số ngày loại việc để kết luận tổng ngày xe chạy. Có thêm số công việc để so sánh khối lượng.

Mọi con số tổng hợp bấm được tới các dòng nguồn với đúng bộ lọc. Xuất Excel giữ bộ lọc, kỳ, đơn vị, trạng thái dữ liệu và thời điểm chốt/xuất; số liệu xuất phải trùng màn hình, không áp một bộ công thức riêng.

### 15.3 Quy tắc phân bổ dự án

Đối tượng hưởng chi phí gồm dự án thật và mục đích nội bộ như trung chuyển xưởng, khảo sát chung, bảo dưỡng. “Trung chuyển kho” không được tạo thành dự án giả chỉ để công thức chạy.

Thực hiện theo từng **xe và kỳ chi phí**:

1. Ghi thẳng khoản đã xác định dự án/việc cụ thể. Khoản này không còn trong quỹ chi phí chung.
2. Gom phần công ty chịu còn lại vào chi phí chung của đúng xe/kỳ.
3. Phân bổ chi phí chung theo km phục vụ nếu toàn bộ công việc liên quan có cơ sở km hợp lệ: ưu tiên km thực phân được; nếu chỉ có km kế hoạch đầy đủ thì dùng và ghi rõ “Theo km kế hoạch”. Không trộn km thực của vài việc với km dự kiến/0 của việc khác một cách ngầm định.
4. Nếu thiếu km đầy đủ, dùng ngày phục vụ đã xác nhận cho toàn bộ quỹ xe/kỳ đó. Một xe/ngày phục vụ một đối tượng = 1 ngày quy đổi. Nhiều đối tượng cùng ngày chia tỷ trọng tổng bằng 1; mặc định chia đều và yêu cầu Admin xác nhận, có thể điều chỉnh có lý do.
5. Công việc nội bộ cũng nhận phần tương ứng. Xe không có cơ sở phân hoặc việc chưa xác định đối tượng ở mục “Chưa phân bổ”; không chia ép vào dự án đang có.

Số phân cho đối tượng = chi phí trực tiếp + chi phí chung xe/kỳ × trọng số đối tượng / tổng trọng số đủ điều kiện. Mỗi khoản chỉ có một cách ghi nhận hiệu lực. Không lấy tổng chi phí tất cả xe chia theo tổng km cả đội như công thức `BÁO CÁO THÁNG!E43`.

Ví dụ: xe A có chi phí chung 4.000.000 đồng, km hợp lệ 600 cho dự án X, 300 cho Y, 100 cho nội bộ. Chi phí trực tiếp Y là 200.000 đồng. Kết quả X 2.400.000, Y 1.400.000, nội bộ 400.000; tổng bằng 4.200.000 đồng. Xe B được tính riêng dù cũng phục vụ X.

Chênh lệch làm tròn VND dồn vào dòng có phần dư lớn nhất theo quy tắc ổn định. Bắt buộc tổng chi phí nguồn = dự án + nội bộ + chưa phân bổ. Báo cáo dự án thấy cả khoản tạm tính và đã chốt, nhưng giá thành chính thức chỉ nhận phiên bản đã chốt.

### 15.4 Chốt và chuyển kết quả

Chốt tháng cần đủ dữ liệu cho phạm vi công bố, giải quyết xung đột số liệu, hoàn tất quyết định OT cần dùng và xác nhận cơ sở phân bổ. Vấn đề còn mở không mặc định chặn cả tháng; chỉ khoản/giờ còn tranh chấp ở trạng thái chờ xử lý, chưa nhập tổng chính thức và được công khai trong bảng đối chiếu.

Quản lý xem tổng xe, tổng theo dự án/nội bộ/chưa phân, giờ/tiền theo nhân viên và danh sách chưa hoàn thiện. Một bản “Tạm tính” vẫn xuất được nhưng không chuyển như số chốt. Bản chốt có phiên bản, người/thời điểm, bộ tham số và danh sách nguồn.

HRM nhận nhân viên, ngày công, phần xe/lệnh, phút duyệt từng khung, tiền duyệt, mã quyết định và phiên bản. Khoản này không tiếp tục nhân hệ số OT chung lần nữa. Nếu HRM chưa hỗ trợ khoản tiền đội xe đã duyệt, xuất bảng chuyển tiếp trước; chưa coi tích hợp trực tiếp hoàn thành. Nếu cùng khoảng đã có chấm công OT, hệ thống/nhân sự phải ghép loại trùng trước tiếp nhận.

Dự án nhận dòng chi phí phân bổ có mã nguồn. Thanh toán cùng khoản ở Tài chính và phân bổ ở Đội xe chỉ là hai góc nhìn của một chi phí, không cộng đôi vào giá thành. Chi phí OT được nhìn ở vận hành xe nhưng việc trả tiền thuộc HRM/Tài chính; không tự sinh hai chứng từ chi.

Gửi lại cùng bản chốt không nhân đôi. Có trạng thái Chưa chuyển, Đã tiếp nhận, Lỗi cần thử lại. Kỳ đích đã khóa thì ghi điều chỉnh theo quy trình kỳ đó hoặc chuyển kỳ sau với tham chiếu, không tự mở khóa. Bản phân bổ mới thay thế hoặc điều chỉnh bản cũ rõ ràng, không cộng chồng toàn bộ hai bản.

## 16. Quyền truy cập và kiểm soát thay đổi

Áp dụng quyền hiện có của ERP theo hành động và phạm vi dữ liệu. Hai cấp vận hành chính là Admin xe và Quản lý; không tạo thêm nhiều vai trò riêng chỉ để có tên khác nhau.

| Hành động | Admin xe | Quản lý | Phụ trách dự án | Nhân sự/Kế toán |
|---|---|---|---|---|
| Lập/phát hành lệnh | Có | Có | Xem phần liên quan; gắn bảng tuyến dự án mình | Xem khi có quyền nghiệp vụ |
| Nhập GPS, phân loại, bổ sung bằng chứng | Có | Có | Không | Không mặc định |
| Đổ dầu, khoản chi, vấn đề | Tạo/cập nhật trong phạm vi được giao | Có | Xem phần dự án mình | Xác nhận chứng từ theo quyền hiện có |
| Duyệt OT, duyệt lại | Không | Có | Không | Nhận kết quả đã duyệt |
| Sửa định mức, đơn giá, tham số | Không | Có | Không | Xem chính sách cần phối hợp |
| Đóng vấn đề | Nhẹ/trung bình sau quyết định | Mọi mức | Không | Không mặc định |
| Chốt/mở điều chỉnh kỳ đội xe | Không | Có | Không | Tiếp nhận, phản hồi kỳ đích |
| Xem/xuất toàn đội | Theo quyền được cấp | Có | Chỉ dự án được phép | Theo phạm vi nhân sự/tài chính |

Tài xế chưa cần tài khoản ở giai đoạn này. Quyền Admin xe không đồng nghĩa toàn quyền quản trị hệ thống. Không dùng quyền “tạo dự án” để tự suy ra quyền tạo/duyệt nghiệp vụ xe. Nếu một người đồng thời có hai vai trò, quyền hiệu lực theo cấu hình công ty và mọi lần duyệt vẫn lưu danh tính; có thể áp quy tắc không tự duyệt khi công ty yêu cầu.

Mọi truy cập, tải file gốc, ảnh và xuất báo cáo phải kiểm tra công ty/phạm vi ở phía hệ thống. Phụ trách một dự án trên lệnh nhiều dự án chỉ thấy nội dung và chi phí được phép, không được mở toàn bộ GPS/ảnh/tiền của dự án khác thông qua liên kết chung.

Nhật ký bắt buộc cho thay đổi lệnh đã phát hành, số liệu đã dùng duyệt, quyết định OT, phân loại ảnh hưởng kết luận, chi phí đã xác nhận, bản chốt và tham số: ai, lúc nào, giá trị cũ/mới, lý do và phiên bản. Dữ liệu có phát sinh chỉ ngừng sử dụng/hủy có lịch sử; không xóa cứng. Bản file và ảnh lưu theo chính sách dữ liệu của ERP; không mở đường dẫn công khai cho hồ sơ nhân sự và hành trình.

## 17. Mô hình dữ liệu nghiệp vụ đề xuất

Đây là mô hình logic, không phải yêu cầu “mỗi sheet một bảng” hoặc một số lượng bảng cố định. Tên và cách lưu vật lý được quyết định khi triển khai; tận dụng hạ tầng tệp, nhật ký, thông báo, nhân sự, dự án và khóa kỳ đã có.

| Nhóm dữ liệu | Một bản ghi biểu diễn | Liên kết/quy tắc chính |
|---|---|---|
| Xe | Một phương tiện có định danh ổn định | Biển số/thiết bị có lịch sử; ngừng dùng vẫn đọc được lịch sử |
| Hồ sơ lái xe | Phần bổ sung của một nhân viên | Nhân sự là nguồn định danh, hạn giấy tờ liên kết lịch |
| Lệnh ngày | Một xe/ngày công/bản hiệu lực | Có phiên bản phát hành, nhóm hành trình nếu nhiều ngày |
| Công việc trên lệnh | Một việc/khoảng phục vụ/đối tượng | Dự án hoặc nội bộ, tài xế, thời gian, tải, km và OT cho phép |
| Địa điểm và điểm kế hoạch | Điểm phục vụ được xác nhận | Dùng lại xưởng/địa chỉ dự án, hỗ trợ gợi ý điểm dừng |
| Đợt nhập và dòng nguồn | File, sheet, dòng và kết quả xử lý | Truy nguyên cấu hình đọc, lỗi, trùng, thay thế và thu hồi |
| Thực tế vận hành | Tổng nguồn ngày hoặc sự kiện dừng/chặng/sự kiện an toàn | Có loại và nguồn; tách kế hoạch, chống trùng theo loại |
| Nhật ký xe/ngày | Bản tổng hợp thực tế và dữ liệu Admin bổ sung | Một xe/ngày công; chỉ tiêu ghi nguồn và mức đầy đủ |
| Phân công thực tế | Ai lái xe trong khoảng nào | Mặc định từ lệnh; có bàn giao thì chia khoảng, không trùng |
| Hồ sơ OT và quyết định | Đề nghị một người/ngày cùng các phần xe/khung | Lưu bản tính và phiên bản duyệt, không dùng một ô tiền có thể ghi đè |
| Lần đổ dầu | Một lần mua/nạp xác định | Đồng hồ km, đầy bình, lượng mua/GPS nạp và chứng từ |
| Khoản chi phí | Một khoản tiền có nguồn duy nhất | Xe, bên chịu, phần trực tiếp/chung, trạng thái xác nhận và chứng từ |
| Vấn đề | Một việc cần kết luận/xử lý | Gộp nhiều bằng chứng, nhiều hành động/chi phí, không sao chép sự cố |
| Lịch và lần thực hiện | Một nghĩa vụ/chu kỳ và lịch sử hoàn thành | Xe hoặc tài xế, hạn ngày/km, chi phí liên quan |
| Tham số có phiên bản | Một bộ quy tắc đang có hiệu lực | Công ty/xe tùy loại, ngày bắt đầu, người thay đổi |
| Bản chốt và dòng phân bổ | Kết quả xe/kỳ, đối tượng nhận và lần chuyển | Đối soát tổng, khóa nguồn, thay thế/điều chỉnh có kiểm soát |

Quan hệ cốt lõi: một xe có nhiều lệnh và nhật ký; một lệnh có nhiều công việc; một sự kiện thực tế có thể có nhiều bằng chứng nguồn nhưng chỉ một sự kiện hiệu lực; một nhật ký sinh đề nghị OT và ngoại lệ; một vấn đề liên kết chi phí; các khoản chi đã xác nhận đi vào đúng một bản phân bổ hiệu lực của kỳ.

Nhật ký và báo cáo là kết quả tổng hợp của các nguồn trên, không thêm bảng nhập tay cho từng báo cáo tuần/tháng. Không xây kho dữ liệu lớn hoặc nhiều dịch vụ độc lập cho quy mô hai xe; chỉ cần module nghiệp vụ có ranh giới rõ và tác vụ nhập file có thể chạy lại an toàn.

## 18. Tham số và quyết định cần xác nhận

### 18.1 Giá trị khởi tạo

| Tham số | Giá trị từ nguồn/đề xuất | Cách áp dụng |
|---|---|---|
| Mốc ngày công | 04:00 | Theo Word; độc lập ngày lịch GPS |
| Bốn đơn giá OT | 75.000 / 50.000 / 75.000 / 100.000 đ/giờ | Cần công ty xác nhận chính sách và loại ngày áp dụng |
| Lệch km | 15% | Cảnh báo đối soát, không tự bác OT |
| Tốc độ chuẩn Hino/Isuzu | 55 / 47 km/h; ngưỡng 70% | Đề xuất Word, cần xác nhận tuyến phù hợp |
| Trễ giờ về | 30 phút | Chỉ báo có trong Excel |
| Điểm dừng tối thiểu/dừng ngắn | 5 / 10 phút | Theo quy tắc điểm dừng |
| Tỷ lệ máy nổ | ≤10% đã tắt; ≥80% không tắt | Khi dữ liệu đủ tin cậy |
| Điện áp Hino/Isuzu | 26 / 12,6 V | Cần kiểm chứng theo thiết bị |
| Tải sát ngưỡng | Từ 90% đến 100% | Trên 100% là quá tải; thống nhất biên 90% |
| Chênh dầu nạp | >10% trị tuyệt đối, mẫu số lít hóa đơn | Không suy thành kết luận trách nhiệm |
| Vượt tiêu hao tham chiếu | >15% | Áp dụng khi có khoảng đo đủ căn cứ |
| Hoạt động dài | >12 giờ | Kiểm tra điều phối |
| Giờ lái nội bộ | >10 giờ/ngày, >48 giờ/tuần | Phải ghi nhãn nội bộ tại thời điểm thiết kế |
| Tỷ lệ lăn bánh | Mốc tham khảo 50% | Không tạo thêm vấn đề độc lập nếu chỉ số thấp chưa có căn cứ |
| Nhắc hạn | 30 ngày / 500 km | Theo hạng mục áp dụng |
| Hạn xử lý vấn đề | 1 / 3 / 7 ngày | Từ ngày phát hiện, theo mức |
| Lặp lại | 3 sự việc trong 90 ngày | Xe hoặc tài xế; cùng sự kiện không đếm lại |

Thay tham số phải có ngày hiệu lực, lý do và người sửa. Một màn hình cấu hình cố định cho các nhóm trên là đủ; không cần cho người dùng viết biểu thức hoặc tự thiết kế quy tắc.

### 18.2 Những đầu vào cần chốt trước triển khai tương ứng

| Cần xác nhận | Đề xuất hiện tại | Ảnh hưởng nếu chưa có |
|---|---|---|
| File xuất GPS Bình Minh từng loại, nhiều sheet nếu có, một ngày qua đêm và một kỳ chồng dữ liệu | Làm bộ đọc đúng mẫu; kiểm cả file ít dữ liệu/mất GPS | Chưa thể cam kết nhập tự động và tính máy nổ/OT chính xác từ nguồn này |
| Tải ISUZU và thông tin đăng kiểm hai xe | Lấy giấy tờ xe làm căn cứ, bỏ trạng thái số tạm sau xác minh | Không cho xác nhận tải hợp lệ dựa trên 1.900 kg tạm ghi |
| Điều kiện xét OT: tốc độ hay giờ về, trường hợp nội thành và tăng ca tắt máy | Xem cả ba chỉ báo; quyết định theo giải trình, duyệt theo khung | Chưa dùng đề xuất để duyệt hàng loạt bằng tiền thật |
| Điện áp, tần suất mẫu, nghĩa “trạng thái máy” và số nhiên liệu | Đối chiếu một số khoảng đã biết thực tế của từng xe | Chưa tự kết luận không tắt máy, tiêu hao hoặc OT từ tín hiệu chưa hiểu |
| Cách duyệt một phần và chính sách ngày nghỉ/ngày lễ | Duyệt từng khung, có hỗ trợ chia tỷ lệ; HRM quản lý phần pháp lý/chính sách lương | Chưa chuyển thành khoản lương tự động |
| Phụ lục thưởng tuân thủ | Bảng đánh giá tham khảo, không tự phạt/trừ lương | Không chặn dùng phần vận hành khác |
| Có chia chi phí ngày cho nhiều dự án thường xuyên không | Có tỷ trọng ngày được xác nhận; km đầy đủ thì dùng km | Cần xác nhận tỷ trọng trước chốt phân bổ |
| Cơ sở ghi nhận chi phí và nơi HRM nhận khoản OT đã duyệt | Một nguồn tiền, bảng chuyển tiếp nếu chưa có điểm nhận phù hợp | Có thể báo cáo đội xe; chưa coi đã đồng bộ giá thành/lương |

Các mục này là điều kiện nghiệm thu dữ liệu và chính sách, không làm dừng việc lập thiết kế. Không lấp chỗ thiếu bằng tên cột GPS, tải trọng hay đơn giá suy đoán.

## 19. Chuyển đổi từ chức năng hiện tại

1. Kiểm kê xe, kho loại xe, chuyến, điểm giao, phiếu kho liên quan và dữ liệu có thật. Phân biệt dữ liệu thử nghiệm với dữ liệu vận hành; không nạp các dòng “MẪU” trong workbook như lịch sử thật.
2. Giữ định danh xe/chuyến và quan hệ chứng từ. Ghép những chuyến cũ cùng xe/ngày thành lệnh ngày có các công việc, giữ mã chuyến cũ làm tham chiếu. Thiếu giờ hoặc tài xế thì đưa vào danh sách kiểm tra, không tự ghép chắc chắn.
3. Chuẩn hóa tài xế với nhân viên; dự án và xưởng dùng danh mục ERP. “Trung chuyển kho” chuyển thành mục đích nội bộ, không tạo dự án mới.
4. Đối soát tồn trên các kho xe. Chuyển đổi bằng chứng từ nếu cần, sau đó ngừng cấu hình tạm; giữ lịch sử và đường dẫn tra cứu.
5. Nhập hồ sơ, hạn và tham số đã xác nhận. Dữ liệu lịch sử thiếu căn cứ giữ trạng thái lịch sử chưa xác minh; không phát sinh truy thu/phạt/OT tự động.
6. Chạy song song ít nhất một tuần và một kỳ tháng có dữ liệu đại diện. So sánh dòng nguồn, giờ, tiền, nhiên liệu và phân bổ, ghi rõ chênh lệch có chủ ý với Excel.
7. Chuyển thao tác sang phân hệ mới sau khi đạt tiêu chí. Chế độ cũ thành chỉ đọc/đường dẫn chuyển tiếp phù hợp; không để hai màn hình cùng sửa hai phiên bản của một chuyến.

## 20. Trình tự triển khai và tiêu chí nghiệm thu

### 20.1 Ba đợt triển khai, giữ cùng một phạm vi hoàn chỉnh

| Đợt | Mục tiêu | Điều kiện kết thúc |
|---|---|---|
| A — Lệnh và dữ liệu thực | Hồ sơ, lịch điều xe, nhập GPS, truy nguồn, nhật ký/điểm dừng, ảnh, quyền | Nhập được file thực và đối soát được từng ngày; không trùng khi nạp lại |
| B — Quyết định vận hành | OT, dầu, chi phí, vấn đề, lịch hạn/bảo dưỡng và cảnh báo | Quản lý xử lý trọn chu trình từ ngoại lệ đến kết luận/chi phí |
| C — Chốt và bàn giao | Báo cáo, tuân thủ, phân bổ, chốt, nối HRM/dự án và chuyển đổi dữ liệu | Tổng tiền đối chiếu đúng, không trả/cộng chi phí hai lần, lịch sử kiểm tra được |

Ba đợt là cách giảm rủi ro triển khai; không coi kết thúc A là đã đáp ứng toàn bộ yêu cầu khách hàng. Không đưa độ phức tạp của đợt C vào giao diện nhập liệu hằng ngày.

### 20.2 Tình huống nghiệm thu bắt buộc

| Mã | Tình huống | Kết quả chấp nhận |
|---|---|---|
| NT01 | Thêm xe thứ ba và tài xế mới | Lịch, nhập liệu, báo cáo tự mở rộng; không sửa cột cố định |
| NT02 | Điều xe trung chuyển hoặc bảo dưỡng không dự án | Lập/phát hành hợp lệ; chi phí về đúng mục đích nội bộ |
| NT03 | Một xe hai công việc, hai dự án trong ngày | Một nhật ký ngày, không cộng trùng GPS; phân được đối tượng chi phí |
| NT04 | Chuyến ba ngày chưa về xưởng ở ngày giữa | Không báo thiếu ảnh về xưởng ở ngày chưa áp dụng; km không nhân ba |
| NT05 | Xe/tài xế trùng giờ, xe tạm dừng hoặc quá tải | Cho lưu nháp và chỉ rõ điều kiện cản phát hành; sát tải đúng tại 90% |
| NT06 | Lập bù hoặc thêm OT sau khi công việc đã chạy | Giữ thời điểm thật, cần giải trình; không tự chuyển thành trước chuyến |
| NT07 | File tháng nhiều sheet, tiêu đề lặp và dòng tổng | Đọc đúng các sheet được chọn, không bỏ sheet âm thầm, không cộng dòng tổng hai lần |
| NT08 | Ngày/số/thời lượng Việt Nam, qua đêm, thời lượng >24h | Giữ đúng giá trị, không hiểu 6:45 thành 6,45 giờ |
| NT09 | Xe chưa ghép, cột đổi tên hoặc ngày không rõ | Báo đúng file/sheet/dòng; chưa ghi vào dữ liệu chính thức |
| NT10 | Nhập lại file cũ, đổi tên file, file tháng chồng file tuần | Không tăng bản ghi, số km, OT hoặc số vấn đề |
| NT11 | Một nhóm xe/ngày có chặng lỗi | Không đánh dấu nhóm hoàn chỉnh; nhóm hợp lệ độc lập có thể nhập trước có xác nhận |
| NT12 | Tổng ngày và chặng khác nhau | Hiện lệch và nguồn chọn; không cộng hai nguồn, không tự che sai lệch |
| NT13 | Có tổng ngày nhưng không có chặng máy | Báo được khai thác; OT chi tiết chưa đủ căn cứ |
| NT14 | Điểm dừng 10 phút, tỷ lệ đúng 10% và 80% | Đúng các biên đã đặc tả; thiếu điện áp không kết luận tắt máy |
| NT15 | Điểm được chọn “điểm giao” nhưng không có công việc phù hợp | Chưa tự đạt chỉ vì cùng ngày có lệnh |
| NT16 | Chặng 21:30–01:30 như ví dụ | 4 giờ, 325.000 đồng đề xuất; cắt khung đúng |
| NT17 | Chặng 03:30–05:00 và hai chặng nhập trùng | Chia đúng hai ngày công, không đếm chồng |
| NT18 | Tài xế đổi xe/xe đổi tài xế giữa ngày | Chia đúng giờ từng người; tổng và kiểm tra lái liên tục không đặt lại sai |
| NT19 | Duyệt một phần theo khung và theo tỷ lệ | Tiền đúng hai cách đã hiển thị; không duyệt số âm/vượt căn cứ |
| NT20 | Hai quản lý duyệt cùng lúc, Admin gọi hành động duyệt | Một quyết định hiệu lực, người còn lại nhận thông báo; Admin bị từ chối |
| NT21 | Nhập sửa GPS hoặc đổi tài xế sau duyệt | Bản duyệt cũ giữ nguyên, hồ sơ cần xét lại/điều chỉnh; không đổi khoản đã chuyển âm thầm |
| NT22 | Hai lần đầy bình xen một lần nạp một phần | Tính từ tổng lượng nạp trong khoảng; lần đầu chưa có tỷ lệ |
| NT23 | Hóa đơn có số, GPS thiếu hoặc bằng 0 | Phân biệt thiếu với 0; không tạo phần trăm vô nghĩa; đồng thời hiển thị thiếu ảnh nếu có |
| NT24 | Nạp dầu lệch kỳ tháng | Lít mua không bị gọi là tiêu hao thật; không quy lỗi tài xế tự động |
| NT25 | Nhập lại bất thường và ba sự cố thật trong 90 ngày | Bất thường cũ không nhân đôi; ba sự cố thật được đánh dấu lặp lại |
| NT26 | Một vấn đề phát sinh hai khoản chi; thêm phí đã có nguồn | Hai khoản khác nhau liên kết đúng; không cho nhân đôi cùng nguồn |
| NT27 | Ngày/km hết hạn trống, đến đúng hạn, số đọc km đã cũ | Trạng thái và nhắc phù hợp; không coi thiếu thông tin là còn hạn |
| NT28 | Gia hạn/bảo dưỡng xong | Lưu lịch sử cũ, hạn mới, chứng từ/chi phí; không ghi đè mất lần trước |
| NT29 | Ví dụ phân bổ 4.200.000 đồng và xe thứ hai | Đúng từng xe, trực tiếp không chia lại, nội bộ có phần; tổng khớp tới VND |
| NT30 | Thiếu km một số việc và nhiều dự án cùng ngày | Chuyển cơ sở phân bổ nhất quán, tỷ trọng ngày tổng bằng 1 hoặc giữ chưa phân |
| NT31 | Xe 0 km vẫn có phí bảo hiểm/sửa chữa | Chi phí giữ nguyên, chi phí/km chưa xác định |
| NT32 | Chuyển bảng OT/phân bổ hai lần và kỳ HRM đã khóa | Không nhân đôi; có trạng thái tiếp nhận và điều chỉnh đúng kỳ |
| NT33 | Phụ trách dự án mở lệnh nhiều dự án/file/ảnh/xuất Excel | Chỉ truy cập phạm vi được cấp, không lộ toàn đội qua liên kết |
| NT34 | File đến cuối tháng, tuần còn thiếu GPS | Hiện dữ liệu chậm/thiếu, gom thông báo, không tự cho điểm đạt |
| NT35 | Xem cảnh báo 10/48 giờ tại tháng 10/2026 | Ghi rõ ngưỡng nội bộ; không gắn nhãn vi phạm Điều 64 cũ |
| NT36 | Kho xe cũ còn tồn và chứng từ liên quan | Chuyển đổi không mất tồn, không làm đứt lịch sử phiếu |
| NT37 | Mở tổng trên báo cáo và xuất cùng bộ lọc | Danh sách nguồn đối chiếu ra cùng số; tỷ lệ tính từ tổng tử/mẫu |
| NT38 | Ngày không có bản ghi và ngày xe nghỉ đã xác nhận | Một ngày là thiếu dữ liệu, một ngày là không hoạt động; không đánh đồng |
| NT39 | Đợt lái có dừng ngắn, qua nửa đêm hoặc đổi xe | Không tự đặt lại đợt lái; chỉ tính lại khi quy tắc nghỉ và dữ liệu đã xác nhận |
| NT40 | OT, nhiên liệu và km ở ranh giới tháng | Ghi đúng ngày công/kỳ nguồn; chỉ số dùng cùng phạm vi thời gian hoặc hiện chưa đủ căn cứ |
| NT41 | Mẫu Hino 05/10/2026 với 98 phút sáng và 100 phút chiều | Duyệt đủ 205.833 đồng theo thời lượng gốc; giải thích được chênh với mẫu Excel |

### 20.3 Đối chiếu sáu yêu cầu cốt lõi

| Câu hỏi khách hàng | Chức năng đáp ứng | Dấu hiệu hoàn thành |
|---|---|---|
| Dừng đâu, bao lâu, đúng lệnh, tắt máy không | Nhập GPS, điểm dừng, lệnh và chất lượng tín hiệu | Xem được sự kiện nguồn và biết rõ phần chưa thể kết luận |
| Dầu có vượt định mức theo xe/tài xế không | Đổ dầu, GPS tiêu hao, kỳ đầy bình và định mức | Phân biệt mua với tiêu hao, có căn cứ phần phân theo người |
| Lái an toàn, sự cố/phạt nguội thế nào | Sự kiện an toàn, vấn đề, kiểm lốp và nhắc tra cứu | Có người xử lý và kết luận, không chỉ một ô màu đỏ |
| OT nào được duyệt trả | Ghép lệnh, chia khung, giải trình, duyệt và chuyển HRM | Giờ/tiền có phiên bản, không trả trùng và không tự đổi sau duyệt |
| Giấy tờ/bảo dưỡng nào đến hạn | Hồ sơ & lịch | Nhắc đúng theo ngày/km, hoàn thành giữ được lịch sử |
| Chi phí/km và từng dự án bao nhiêu | Sổ chi phí, báo cáo, phân bổ từng xe/kỳ | Tổng nguồn khớp tổng đã phân/nội bộ/chưa phân; không cộng trùng Tài chính |

## 21. Tài liệu và điểm đối chiếu trong dự án

Các đường dẫn dưới đây là nguồn đã đối chiếu, không phải các tệp đã thay đổi:

- [Đặc tả khách hàng](<C:/Users/nhatb/Documents/antigravity/noble-fermi/docs/Phân hệ xe/Đặc tả phân hệ Quản lý xe - SIGNAGE ERP.docx>)
- [Workbook quản lý mẫu](<C:/Users/nhatb/Documents/antigravity/noble-fermi/docs/Phân hệ xe/HE_THONG_QUAN_LY_XE_TAI_2_CAP.xlsx>) — trọng điểm: HƯỚNG DẪN B25/B31/B34; NHẬT KÝ NGÀY AJ5/AP5; NHẬT KÝ DẦU M5/P5; BÁO CÁO THÁNG B21/E43; THAM SỐ F6/C30.
- [Mô tả bối cảnh](<C:/Users/nhatb/Documents/antigravity/noble-fermi/docs/Phân hệ xe/mô tả sơ về 1 trường hợp mà khách mô tả bằng lời.txt>)
- [Quy chuẩn UI/UX](C:/Users/nhatb/Documents/antigravity/noble-fermi/docs/QUY_CHUAN_THIET_KE_UI_UX.md)
- [Trang vận chuyển hiện tại](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/(dashboard)/van-chuyen/page.tsx>)
- [Dịch vụ dự án và đội xe hiện tại](C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/project.service.ts)
- [Quyền và thao tác chuyến hiện tại](C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/fleet/trips/route.ts)
- [Cấu trúc xe, kho, chuyến và liên kết chứng từ](C:/Users/nhatb/Documents/antigravity/noble-fermi/database/migrations/002_erp_iam.sql)
- [Cách tính OT trong nhân sự hiện tại](C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/hrm.service.ts)

Các quy tắc tính tiền, nhập GPS và phân bổ trong thiết kế này thay thế cách làm tạm của workbook ở những điểm đã nêu rõ. Mục tiêu nghiệm thu là trả lời đủ sáu câu hỏi bằng dữ liệu có thể kiểm tra và một luồng thao tác gọn, không phải sao chép nguyên 10 sheet hoặc 12 màn hình lên web.
