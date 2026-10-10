# Kế hoạch bổ sung tính năng và hoàn thiện quy trình Signage ERP

Ngày lập: **10/10/2026**. Căn cứ: ghi chú của người sử dụng, giải thích bổ sung về kho vật tư lẻ và mã nguồn hiện tại của dự án.

Cập nhật cùng ngày theo mẫu Excel trong thư mục **Tuần 4.9 - QCNT - CEN**: phần dự án/tiến độ ưu tiên xuất báo cáo tổng hợp, chi tiết khối lượng và khảo sát có nội dung tương đương mẫu. Gộp các phần trùng, dùng dữ liệu chung và giữ đủ các hạng mục khác nhau.

Mục tiêu là hoàn thiện các thao tác thực tế từ báo giá, dự án, vật tư, kho, thanh toán đến chấm công và tính lương. Ưu tiên xử lý quyền, trạng thái duyệt và cách tính số liệu trước khi bổ sung biểu mẫu.

## 1. Phạm vi đối chiếu và cách hiểu yêu cầu

Đã đối chiếu giao diện, API, dịch vụ nghiệp vụ và các migration liên quan đến CRM, dự án, kho, tài chính, IAM và HRM. Mốc mã nguồn là `58fad96`, có cả thay đổi chưa commit trong luồng sản xuất và dự án. Nhận định trong tài liệu là kết quả đọc mã nguồn; chưa kiểm thử thao tác trên hệ thống đang vận hành hoặc xác nhận migration nào đã được áp dụng vào database thật.

Các chức năng mới về BOM, lệnh sản xuất và bán theo lô đã có trong mã nguồn. Kế hoạch phải tích hợp với các luồng này và giữ liên kết chứng từ, tồn kho, giữ hàng và công nợ.

**Giải thích đã nhận từ người sử dụng:** kho vật tư lẻ là các vật tư phát sinh, không thường xuyên có sẵn trong danh mục; khi nhập kho cần thêm nhanh vật tư mới. Vì vậy yêu cầu này tập trung vào danh mục linh hoạt và thao tác nhập kho. Chức năng tấm lẻ Alu/Mica sau cắt đang có trong hệ thống là một nghiệp vụ riêng.

Các cách hiểu làm cơ sở cho bản kế hoạch:

- “Thêm phiếu, thanh toán PDF”: bổ sung lập, xem, duyệt phiếu thanh toán; tải PDF phiếu và đính kèm chứng từ PDF. Hai thao tác xuất PDF và tải tệp lên phải được phân biệt rõ trên giao diện.
- “Tải lịch sử giao dịch”: xuất lịch sử thu/chi và sổ quỹ theo bộ lọc, có số dư và thông tin đối soát.
- “Sửa báo giá, theo mẫu hoặc tự tạo”: sửa nội dung báo giá, tạo từ mẫu hoặc từ biểu mẫu trống; có mẫu trình bày khi in.
- “Thêm phiếu vật tư”: trước mắt hoàn thiện lập phiếu nhập/xuất/bổ sung vật tư từ dự án và màn hình kho. Phiếu **đề nghị cấp vật tư** độc lập là đề xuất mở rộng cần chốt riêng.
- “Tạo đơn hàng dự án”: tạo đơn bán/đơn thi công gắn dự án, có thể lấy từ báo giá hoặc tạo trực tiếp. Đơn mua vật tư cho dự án tiếp tục thuộc phân hệ mua hàng.
- “Xuất mẫu tiến độ tổng thể”: theo giải thích bổ sung, cần xuất **Excel tổng hợp công trình/đại lý, chi tiết khối lượng và danh sách khảo sát** theo nội dung hai mẫu CEN/QCNT đã cung cấp. Có thể xuất nhiều dự án theo tuần/tháng. Các trường và cách nhóm được chuẩn hóa theo nghiệp vụ, không cần sao chép phần trùng hoặc mọi chi tiết trình bày của file cũ. Biểu đồ Gantt, quản lý kế hoạch gốc và PDF tiến độ là mở rộng sau khi có nhu cầu riêng.

## 2. Đối chiếu toàn bộ ghi chú với hệ thống

Mức ưu tiên: **P0** ảnh hưởng quyền truy cập, tồn kho, tiền hoặc lương; **P1** cần để hoàn thành công việc hằng ngày; **P2** cải thiện tổ chức và trình bày sau khi quy trình đúng.

| Mã | Ghi chú đã chuẩn hóa | Hiện trạng trong mã nguồn | Phần cần bổ sung hoặc sửa | Ưu tiên |
|---|---|---|---|---|
| N01 | In dự toán và bóc tách vật tư | Có dự toán trong báo giá, BOM và vật tư dự án; chưa thấy luồng xuất thống nhất cho các dữ liệu này | In/PDF/Excel dự toán và BOM theo phiên bản; tách bản nội bộ có giá vốn và bản cấp vật tư | P1 |
| N02 | Thêm phiếu thanh toán, PDF | Có lập thu/chi, gạch nợ; giao diện nhận ảnh/PDF; phiếu ghi sổ ngay trong luồng tạo | Hoàn thiện nháp, gửi duyệt, duyệt, thực chi/thu, ghi sổ; PDF phiếu; lưu tệp đính kèm đúng định dạng | P0/P1 |
| N03 | Tải lịch sử giao dịch | Có lịch sử sổ quỹ và nút xuất CSV dùng chung của bảng | Xuất chuyên biệt theo kỳ, tài khoản, dự án, đối tác, trạng thái; đủ số dư đầu/cuối kỳ và toàn bộ kết quả lọc | P1 |
| N04 | Sửa báo giá, theo mẫu hoặc tự tạo | Có tạo, sửa và in báo giá; sửa đang cập nhật bản revision hiện tại | Quản lý phiên bản; bảo toàn bóc tách chi phí; mẫu nội dung và mẫu in; kiểm tra tổng tiền, thuế, chiết khấu | P1 |
| N05 | Thêm hợp đồng | Có bảng hợp đồng/mốc thanh toán; khu thêm hồ sơ hợp đồng tại dự án đang lưu danh sách vào state của trang | Lưu bền vững; lập hợp đồng thật, gắn báo giá/dự án, giá trị, mốc thu, phụ lục và tệp | P1 |
| N06 | Xuất Excel dự án/tiến độ theo mẫu CEN/QCNT | Có dự án, công việc, khảo sát, hạng mục và nhân sự; đã đọc hai file mẫu khách cung cấp | Excel tổng hợp công trình/đại lý, chi tiết khối lượng và khảo sát; lọc theo kỳ/nhóm; gộp phần trùng nhưng giữ đủ hạng mục | P1 |
| N07 | Nhiều kho, nhóm vật tư lẻ | Có nhiều kho; có nhóm vật tư; có chức năng tấm dư sau cắt riêng | Tổ chức vật tư phát sinh theo kho/nhóm; tìm kiếm dễ; thêm nhanh khi chưa có mã vật tư | P1 |
| N08 | Thêm phiếu vật tư | Có phiếu nhập/xuất/điều chuyển; sản xuất có cấp bổ sung và trả dư | Đưa thao tác tạo phiếu vào đúng dự án/kho; tự điền nguồn dữ liệu; theo dõi phiếu liên quan | P1 |
| N09 | Nhập kho chọn vị trí | Có nhãn kệ theo cặp kho–vật tư; chưa có vị trí chọn trên từng dòng phiếu | Danh mục khu/kệ/ô và chọn vị trí nhập/xuất; một mã vật tư có thể ở nhiều vị trí | P1 |
| N10 | Xuất kho bổ sung người nhận | Bản in có ô ký người nhận nhưng để trống; dữ liệu phiếu chưa có người nhận | Lưu người nhận nội bộ/bên ngoài, thông tin giao nhận và in tên người nhận | P1 |
| N11 | Tạo đơn hàng dự án | Chuyển báo giá thành dự án đã tạo SO liên kết; có bán theo lô sản xuất; tạo SO thông thường chưa nhận `projectId` | Tạo đơn ngay trong dự án; lấy đúng khách hàng/báo giá; hỗ trợ phát sinh và liên kết đúng nguồn | P1 |
| N12 | Thủ kho chỉ phụ trách từng kho | Có `warehouse_members` và phạm vi ASSIGNED/SELECTED; có nhánh mở mọi kho khi thủ kho chưa được gán | Giao diện phân công kho, hiệu lực và quyền từng thao tác; kiểm tra phạm vi cho mọi API kho | P0 |
| N13 | Tạo mới khi nhập kho | Danh mục vật tư có màn hình tạo riêng; phiếu kho chủ yếu chọn vật tư đã có | Thêm nhanh vật tư phát sinh trong phiếu nhập, tự chọn vào dòng và giữ nguyên phiếu đang soạn | P1 |
| N14 | Quyền, hạn mức, chờ duyệt chưa hoạt động đầy đủ | Có ma trận quyền, hạn mức và bảng thay đổi quyền; dịch vụ hiện cập nhật grant trực tiếp; nhiều nơi chỉ kiểm tra có quyền | Thực thi quyền theo đối tượng, phạm vi, số tiền và trạng thái; luồng thay đổi quyền chờ duyệt; làm mới quyền | P0 |
| N15 | Quy trình duyệt kho/thanh toán chưa chuẩn | Kho có gửi/duyệt/ghi sổ nhưng còn cho duyệt từ nháp; thanh toán tạo xong ghi sổ; có schema duyệt nhiều bước chưa được nối vào dịch vụ hiện tại | Quy trình duyệt dùng chung, người duyệt đúng phạm vi/hạn mức, trả về sửa, lịch sử và tách xác nhận thực tế | P0 |
| N16 | Ca thường, ca OT, xin OT trước/sau, HR chọn tính lương | Có ca làm và đơn OT; chấm công chưa gắn loại ca; tính OT từ giờ vượt 8 rồi cộng đơn đã duyệt | Chấm công theo phiên ca; đối chiếu OT thực tế với đơn; quyết định của HR; lưu chi tiết mỗi ngày và khóa kỳ lương | P0 |

N07 và N13 được triển khai trong cùng gói **thêm nhanh vật tư phát sinh**, tránh làm hai chức năng trùng nhau.

## 3. Những thiếu sót cần xử lý trước

### 3.1. Quyền chưa được thực thi nhất quán

- `allowedWarehouseIds` có nhánh trả mọi kho hoạt động cho WAREHOUSE_KEEPER khi không tìm thấy phân công. Điều này trái yêu cầu thủ kho chỉ phụ trách kho được giao.
- Kho thông thường và kho tấm lẻ chưa áp dụng đầy đủ cùng cách kiểm tra phạm vi như chứng từ liên kết sản xuất. Lọc dropdown chỉ là một phần; mở chi tiết, gọi API trực tiếp, duyệt, ghi sổ và xuất dữ liệu đều phải kiểm tra.
- API tạo thanh toán hiện còn chấp nhận một số quyền mua hàng/NCC thay cho `payment.create`; kiểm tra hạn mức thanh toán chưa nằm trong luồng tạo/ghi sổ.
- API duyệt đơn HRM mới kiểm tra đăng nhập; API cấu hình ca chưa có kiểm tra phiên đăng nhập và quyền tại route. Middleware chủ yếu kiểm tra có cookie, nên cần xác thực và phân quyền tại máy chủ.
- Quyền đang hợp nhất phạm vi và hạn mức thành một capability; cần giữ quan hệ giữa từng grant, đối tượng và hạn mức. Nếu vai trò A cho kho A hạn mức 100 triệu, vai trò B cho kho B hạn mức 10 triệu, không được suy thành kho B cũng duyệt được 100 triệu.
- Đọc hạn mức trong IAM đang dùng kiểm tra truthy, nên hạn mức **0** có thể bị hiển thị thành không giới hạn. Tên vai trò quản lý như DIRECTOR/CEO cũng đang được mở toàn quyền trong dịch vụ authorization; cần đối chiếu và sửa theo ma trận thực tế.

### 3.2. Quy trình duyệt chưa kiểm soát đầy đủ tác động nghiệp vụ

Kho đã có bước ghi sổ riêng và một phần hạn mức duyệt; cần hoàn thiện thay vì làm lại toàn bộ. Chức năng sản xuất mới còn có giữ hàng, phân bổ lô và kiểm tra kho/dự án, cần giữ các kiểm soát này khi chuẩn hóa.

Thanh toán hiện tạo `cash_entries` và phân bổ công nợ trong cùng luồng tạo phiếu. Khi bổ sung duyệt, phải chuyển các tác động này sang bước ghi sổ sau khi đủ điều kiện; phiếu nháp/chờ duyệt không thay đổi tiền hoặc công nợ.

Các bảng chính sách/yêu cầu/quyết định duyệt đã có trong schema. Nên nối chúng vào dịch vụ và giao diện, bổ sung liên kết còn thiếu cho HRM hoặc thay đổi quyền theo mô hình phù hợp.

### 3.3. HRM cần sửa cách tính, không chỉ thêm tên ca OT

Đọc mã nguồn cho thấy:

- Chấm công chưa nhận ID ca thường/OT; check-out đang đóng tất cả phiên chưa kết thúc trong ngày.
- Nếu check-out khi chưa check-in, dịch vụ tự sinh giờ vào 08:00. Cần thay bằng trường hợp thiếu dữ liệu và quy trình giải trình.
- Ma trận tháng chỉ giữ một bản ghi cho một người trong một ngày, nên chưa tổng hợp đúng nhiều phiên ca.
- Giờ vượt 8 đang tự thành OT; thời gian nghỉ và khung ca chưa được dùng để phân loại đúng. Nhánh vượt 8 giờ còn chưa cộng công thường cho ngày đó.
- Lương OT cộng thêm giờ trên đơn đã duyệt vào OT từ chấm công, có thể tính hai lần cùng một khoảng thời gian.
- Cấu hình ca, ca đêm và ngày nghỉ đã có nhưng phép tính lương hiện chủ yếu dùng một hệ số OT chung.
- Duyệt lương nhận các số tiền từ giao diện; cần tính/đối chiếu tại máy chủ, lưu quyết định điều chỉnh riêng và bảo vệ kỳ đã chốt.

### 3.4. Một số chức năng có giao diện nhưng dữ liệu chưa hoàn chỉnh

Phần thêm tài liệu/hợp đồng trong trang dự án hiện chỉ thêm vào state, nên chưa có cơ chế lưu và tải lại từ máy chủ. Cần sửa lưu hồ sơ trước khi phát triển hợp đồng đầy đủ.

Sửa báo giá đang xóa rồi tạo lại dòng của revision hiện tại. Với các dòng đã có thành phần dự toán, cần kiểm thử quan hệ khóa ngoại và bảo toàn dữ liệu; với báo giá đã được khách chấp thuận, cần tạo revision mới. Phần in cũng cần đối chiếu subtotal, thuế và total để tránh ghi “chưa VAT” cho một số tiền đã gồm thuế.

## 4. Gói A — Phân quyền, phân công kho và thay đổi quyền

**A01. Chuẩn hóa kiểm tra quyền tại máy chủ.** Mỗi hành động kiểm tra: tổ chức, quyền thao tác, đối tượng thuộc phạm vi, hạn mức, trạng thái chứng từ, hiệu lực phân công và kỳ đã khóa. Dùng cùng kết quả để điều khiển nút trên giao diện. Đánh giá từng grant thay vì gộp phạm vi/hạn mức thành một quyền rộng hơn.

**A02. Phân công thủ kho.** Tại màn hình kho có danh sách người phụ trách, ngày hiệu lực và nhóm quyền: xem, lập phiếu, gửi duyệt, duyệt, xác nhận thực tế. Có thể gán một người nhiều kho và nhiều người một kho. Người chưa được gán thấy thông báo “Chưa được phân công kho”; quản trị viên có đường dẫn cấu hình. Điều chuyển phải kiểm tra cả kho nguồn và đích theo trách nhiệm từng bên.

**A03. Hoàn thiện phạm vi SELECTED/ASSIGNED.** Khi chọn SELECTED phải có danh sách kho/dự án/phòng ban thực sự được cấp; khi chọn ASSIGNED phải dựa vào phân công có hiệu lực. Phân biệt rõ “không giới hạn”, “0” và hạn mức cụ thể. Giá trị dùng xét hạn mức do máy chủ xác định từ dữ liệu hợp lệ; không dựa vào tổng tiền tự gửi từ trình duyệt.

**A04. Thay đổi quyền chờ duyệt.** Tái sử dụng `iam.role_change_requests`: nháp → gửi duyệt → duyệt/từ chối → áp dụng. Hiển thị quyền đang hiệu lực và quyền đang đề xuất. Thay đổi đang chờ không có hiệu lực. Khi áp dụng cần kiểm tra version, người duyệt, bảo vệ quản trị viên cuối và ghi lịch sử trước/sau. Việc nào được áp dụng trực tiếp phải là ngoại lệ cấu hình có audit.

**A05. Cập nhật quyền sau thay đổi.** Làm mới cache tại máy chủ và giao diện theo policy version; yêu cầu bị thu hồi phải bị chặn ngay tại máy chủ. Rà soát API HRM, thanh toán, tài liệu và kho trong phạm vi các gói này để loại bỏ đường đi chỉ dựa vào cookie, tên vai trò hoặc quyền của phân hệ khác.

Nghiệm thu: tài khoản chỉ được gán kho A không thể xem/sửa/duyệt/ghi sổ/xuất dữ liệu kho B kể cả gọi API trực tiếp; hạn mức 0 không trở thành vô hạn; vai trò A/B có phạm vi và hạn mức khác nhau không làm mở rộng sai quyền; thay đổi quyền chờ duyệt chưa được sử dụng.

## 5. Gói B — Chuẩn hóa duyệt phiếu kho và thanh toán

### 5.1. Cơ chế duyệt dùng chung

Thiết lập theo loại phiếu, kho/dự án, mức tiền, vai trò/người duyệt và số bước. Có danh sách “Việc chờ tôi duyệt”, lịch sử, lý do từ chối/trả về sửa và thông báo khi tới lượt. Lưu chính sách và phiên bản chứng từ tại lúc gửi; sửa nội dung ảnh hưởng phê duyệt phải gửi lại. Người duyệt không tự duyệt phiếu của mình theo quy tắc mặc định; ngoại lệ phải được cấu hình và ghi lịch sử.

Vượt hạn mức thì chuyển đúng cấp có thẩm quyền. Chưa có người duyệt thì hiển thị lý do và cho quản trị viên xử lý cấu hình; không tự mở quyền để đi tiếp. Gửi/duyệt/ghi sổ lại cùng yêu cầu phải không tạo thêm bút toán hoặc phân bổ trùng.

### 5.2. Phiếu kho

Luồng chuẩn: **Nháp → Gửi duyệt → Duyệt đủ bước → Thủ kho xác nhận thực tế → Ghi sổ/hoàn tất**. Có nhánh trả về sửa, từ chối, hủy trước ghi sổ và phiếu đảo sau ghi sổ. Đối với điều chuyển cần thể hiện xác nhận xuất ở kho nguồn và nhận tại kho đích, cùng trạng thái đang chuyển nếu áp dụng.

- Nháp chỉ sửa/lưu/gửi; không duyệt trực tiếp từ nháp.
- Duyệt xác nhận quyền cấp hàng; việc giữ hàng áp dụng theo loại nghiệp vụ, không tăng/giảm tồn thực tế ở bước này.
- Ghi sổ dùng số lượng giao/nhận được xác nhận, đúng kho, lô, đơn vị và vị trí; không vượt tồn khả dụng hoặc lượng nguồn cho phép.
- Cấp bổ sung, trả dư và đảo phiếu giữ liên kết với dự án/lệnh sản xuất/dòng vật tư nguồn.
- Nếu giao/nhận từng phần, tạo chứng từ từng phần liên kết nguồn; không sửa số liệu trên phiếu đã ghi sổ.

### 5.3. Phiếu thanh toán

Luồng chuẩn: **Đề nghị/nháp → Gửi duyệt → Duyệt đủ bước → Kế toán xác nhận thu/chi thực tế → Ghi sổ**. Trạng thái đã duyệt và đã trả tiền phải hiển thị riêng.

- Có người đề nghị, đối tác/người nhận tiền, dự án, nội dung, số tiền, tài khoản quỹ, ngày giao dịch và chứng từ.
- Nháp/chờ duyệt/đã duyệt chưa tạo biến động quỹ hoặc gạch nợ. Ghi sổ mới thực hiện cả bút toán quỹ và phân bổ công nợ trong một giao dịch.
- Phân bổ phải cùng đối tác/phạm vi, không vượt tiền thanh toán hoặc dư nợ; tiền chưa phân bổ hiển thị rõ.
- Sau ghi sổ, xử lý sai bằng nghiệp vụ đảo/điều chỉnh có tham chiếu và phê duyệt; kỳ khóa chặn sửa trực tiếp.

Nghiệm thu: tạo và duyệt phiếu không làm đổi số dư thực tế; ghi sổ đúng một lần; vượt hạn mức đến đúng cấp; người lập không tự duyệt; từ chối/trả về/hủy xử lý đúng giữ hàng; phiếu đảo đối soát được với phiếu gốc.

## 6. Gói C — Nhập kho nhanh, vật tư phát sinh và người nhận

### 6.1. Thêm nhanh vật tư lẻ ngay trong phiếu nhập

Tại ô chọn vật tư có nút **“+ Thêm nhanh vật tư”**. Form tối thiểu: tên, đơn vị cơ sở, nhóm vật tư; mã tự sinh. Có thể bổ sung quy cách/ghi chú/ảnh khi cần. Nhóm “Vật tư phát sinh” là nhóm mặc định gợi ý, vẫn cho chọn nhóm khác. Không bắt buộc nhập đủ thông tin như danh mục vật tư thường xuyên.

Khi lưu, vật tư mới phải có ID danh mục thật và được tự chọn vào dòng phiếu; giữ nguyên kho, dự án, số lượng và các dòng đã nhập. Danh mục mới có thể tồn tại với tồn bằng 0; chỉ phiếu nhập được ghi sổ mới làm tăng tồn.

- Tìm kiếm tên/mã/đơn vị trước khi tạo, cảnh báo trùng và gợi ý dùng vật tư đã có. Mã phải duy nhất kể cả hai người tạo đồng thời.
- Không dùng một mã “vật tư khác” chung cho mọi hàng vì sẽ trộn tồn và lịch sử. Mỗi loại cần một mã hoặc quy cách nhận diện phù hợp.
- Có quyền tạo danh mục riêng. Nếu thủ kho chỉ có quyền lập phiếu thì cho chọn hàng đã có hoặc tạo đề nghị bổ sung danh mục; không tự cấp quyền rộng hơn.
- Sau này quản trị viên có thể hoàn thiện thông tin hoặc ngừng dùng mã ít sử dụng; không xóa mã đã có giao dịch.
- Khi thêm nhanh thất bại, giữ phiếu đang soạn và hiện lỗi rõ ràng.

Nghiệm thu: đang nhập ba dòng vẫn thêm được vật tư chưa có, tự quay về dòng đúng; tải lại vẫn tìm được vật tư; chưa ghi sổ thì tồn không tăng; người thiếu quyền tạo danh mục không vượt quyền bằng đường thêm nhanh.

### 6.2. Vị trí trong kho

Bổ sung danh mục khu/kệ/ô theo từng kho. Dòng nhập chọn vị trí đích; dòng xuất chọn vị trí nguồn có tồn. Một vật tư/lô có thể chia ở nhiều vị trí. Vị trí phải thuộc đúng kho và còn hoạt động. Điều chuyển vị trí trong một kho có lịch sử riêng.

Hiện tồn kho tổng hợp theo kho–vật tư–lô, còn `bin_label` chỉ là nhãn theo kho–vật tư. Khi mở rộng vị trí cần bảng tồn/phân bổ theo vị trí và quy tắc đối soát với tồn tổng; không chỉ thêm dropdown. Vật tư cũ chưa xác định vị trí đưa vào “Chưa phân vị trí”, sau đó phân bổ bằng nghiệp vụ có lịch sử, không đoán vị trí hoặc tạo thêm tồn.

### 6.3. Người nhận và thao tác tạo phiếu

- Phiếu xuất chọn người nhận nội bộ hoặc nhập tên người nhận bên ngoài; lưu tên tại thời điểm giao, đơn vị/đội thi công và số điện thoại nếu có.
- Lưu thời điểm giao/nhận, người giao và ghi chú; xác nhận nhận hàng/chữ ký có thể bổ sung sau bước lưu thông tin cơ bản.
- Tên người nhận xuất hiện ở chi tiết, lịch sử và PDF. Trạng thái nháp chưa cần đầy đủ xác nhận; trước xuất thực tế phải đủ trường bắt buộc.
- Tạo phiếu từ dự án, BOM hoặc lệnh sản xuất tự điền đúng dự án, dòng vật tư và nguồn liên kết; không tạo lại phiếu khi đã có phiếu nguồn phù hợp.
- Lọc vật tư phát sinh theo kho, nhóm, trạng thái còn tồn; chức năng tấm dư sau cắt tiếp tục quản lý theo lô/kích thước riêng.

**Đề xuất thêm, cần chốt phạm vi:** phiếu đề nghị cấp vật tư từ đội thi công → PM duyệt → thủ kho lập phiếu xuất hoặc bộ phận mua hàng xử lý thiếu. Nếu triển khai, phân biệt “đề nghị cấp” với “xuất kho thực tế” và tái sử dụng nguồn cấp NVL của sản xuất để tránh cấp hai lần.

## 7. Gói D — HRM: ca thường, ca OT và quyết định tính lương

### 7.1. Quy tắc theo yêu cầu người sử dụng

1. Ca thường và ca OT là hai loại ca tính công khác nhau. Làm lâu trong phiên ca thường không tự trở thành OT.
2. Muốn làm OT sau ca thường, nhân viên phải **check-out ca thường rồi check-in ca OT**. Ví dụ mốc 17:00 là một cấu hình ca; không hardcode 17:00 cho mọi người.
3. Ca OT có khung giờ, thời gian nghỉ và quy tắc tính lương riêng; thời gian thực tế trong phiên OT là căn cứ tính, không phải toàn bộ giờ xin trên đơn.
4. Cho phép xin OT trước hoặc bổ sung đơn sau khi đã làm; mỗi đơn gắn ngày, khoảng giờ, nhân viên và dự án/công việc nếu có.
5. Trạng thái duyệt OT và quyết định trả lương OT là hai thông tin riêng. HR có quyền chuyên biệt quyết định tính/không tính hoặc tính một phần cho OT chưa duyệt/từ chối, kèm số phút và lý do. Trạng thái đơn vẫn được giữ.
6. Khi chốt lương, HR phải xem được từng ngày: giờ OT thực tế, giờ xin, giờ được duyệt, trạng thái đơn, giờ được đưa vào lương, người quyết định và lý do.
7. Sau chốt, chi tiết này vẫn xem lại được theo bản lương đã chốt. Phê duyệt đơn OT muộn không tự thay đổi lương đã khóa; xử lý bằng mở kỳ có quyền hoặc điều chỉnh kỳ sau.

### 7.2. Giao diện và dữ liệu cần bổ sung

- **Danh mục ca:** loại tính công thường/OT; khung giờ, nghỉ, qua đêm, lịch ngày làm/ngày nghỉ và phiên bản chính sách. Ca đêm thường vẫn là ca thường nếu được cấu hình như vậy.
- **Phân ca:** gán ca theo nhân viên/đội và ngày hiệu lực; chấm công dựa vào lịch được gán, hỗ trợ ca phát sinh.
- **Chấm công:** hiển thị ca đang mở và nút đúng bước. Mỗi phiên có ID ca, giờ vào/ra, nguồn, địa điểm, ngày công và dự án nếu có. Một người không có hai phiên mở chồng nhau.
- **Đơn OT:** gửi trước/sau, gắn phiên thực tế hoặc khoảng dự kiến; duyệt một phần, trả về sửa, rút đơn theo điều kiện; ngăn khoảng giờ trùng và tự duyệt.
- **Bảng rà soát của HR:** chi tiết nhiều phiên mỗi ngày; bộ lọc thiếu đơn/chờ duyệt/từ chối/chênh lệch; quyết định tính lương từng phiên hoặc khoảng giờ.
- **Bản lương:** lưu chi tiết nguồn và chính sách áp dụng, không chỉ lưu tổng giờ OT. Máy chủ tính lại từ phiên đã rà soát và các điều chỉnh được phép trước khi chốt.

### 7.3. Cách tính đề xuất

Tính bằng phút để tránh cộng sai do làm tròn từng lần. Mỗi phút làm việc chỉ được phân loại vào một nguồn công thường hoặc OT. Loại trừ thời gian nghỉ và các phiên chồng nhau.

- **Phút OT thực tế:** thời gian hợp lệ trong phiên ca OT, sau khi trừ nghỉ.
- **Phút được duyệt:** phần giao giữa thời gian làm thực tế và khoảng được duyệt. Đơn duyệt trước chưa có chấm công không tự sinh lương.
- **Phút OT trả lương:** mặc định phần thực tế đã được duyệt; với ngoại lệ, dùng phần được HR quyết định và ghi lý do. Trường hợp vượt thời gian duyệt chuyển vào danh sách rà soát.
- **Tiền OT:** cộng từng khoảng phút được trả × đơn giá giờ × hệ số của khoảng đó / 60. Tách theo lịch thường/nghỉ/lễ/đêm theo chính sách được cấu hình và xác nhận bởi HR.

Không cộng “OT từ chấm công” với “giờ OT trên đơn”. Đơn là căn cứ phê duyệt cho thời gian thực tế. Không tự sinh 08:00 khi thiếu check-in; tạo yêu cầu giải trình/correction có người duyệt.

Ví dụ với ca thường 08:00–17:00, nghỉ 60 phút, ca OT 17:00–20:00:

| Tình huống | Kết quả đề xuất |
|---|---|
| Check-in thường 08:00, check-out 17:00 | 8 giờ công thường; OT = 0 |
| Phiên thường kéo dài đến 19:00, không mở phiên OT | Không tự tính 2 giờ OT; đưa chênh lệch vào rà soát, muốn sửa phải có lý do và lịch sử |
| Check-out thường 17:00, check-in OT 17:10, check-out 19:10; đơn bao phủ 17:00–19:30 đã duyệt | 2 giờ OT được xét trả, không cộng thêm 2,5 giờ theo đơn |
| Thực làm OT 2 giờ, chỉ được duyệt 1,5 giờ | 1,5 giờ mặc định trả; 0,5 giờ chờ HR quyết định |
| Thực làm OT 2 giờ, đơn chờ duyệt/từ chối | Giữ trạng thái đơn; mặc định chưa trả, HR có quyền chọn trả toàn bộ/một phần hoặc không trả và ghi lý do |
| Đơn đã duyệt 2 giờ nhưng không có phiên làm thực tế | Không tự trả OT; thiếu dữ liệu phải được xác minh |
| OT qua 00:00 hoặc vắt qua cuối tháng | Giữ phiên liên tục, chia khoảng theo ngày/chính sách/kỳ bằng múi giờ doanh nghiệp |
| Đơn được duyệt sau khi lương đã chốt | Bản đã chốt giữ nguyên; tạo điều chỉnh theo quy trình |

Nghiệm thu thêm: nhiều lần check-in/out trong ngày vẫn tổng hợp đủ; ca thường đủ công và ca OT không làm mất công thường; ca ghép/ca qua đêm tính đúng; nghỉ không trở thành OT; HR và nhân viên nhìn thấy đúng phạm vi dữ liệu của mình; hai người chốt đồng thời không tạo hai bản lương hiệu lực.

Hệ số và ngưỡng giờ trong bảng là cấu hình minh họa, không phải kết luận về chính sách lương hoặc quy định pháp luật.

## 8. Gói E — Thanh toán, chứng từ PDF và lịch sử giao dịch

**E01. Phiếu và tệp đính kèm.** Tái sử dụng kết quả gói B. Có xem chi tiết phiếu, chứng từ gốc, người lập/duyệt/ghi sổ và khoản nợ được phân bổ. Tải ảnh/PDF bằng luồng lưu tệp có metadata tên, loại, dung lượng; kiểm tra file tại máy chủ. Hiện dịch vụ chỉ upload khi dữ liệu bắt đầu bằng `data:image/`, cần hoàn thiện lưu PDF. Liên kết tệp theo quyền của phiếu/dự án.

**E02. PDF phiếu thanh toán.** Mẫu thu, chi và đề nghị thanh toán: logo, mã/ngày, người nhận tiền, lý do, số tiền/số tiền bằng chữ, quỹ, dự án, chứng từ và vị trí ký. Nháp/chờ duyệt có nhãn tương ứng. Bản đã ghi sổ dùng dữ liệu tại thời điểm ghi sổ và lưu phiên bản mẫu.

**E03. Tải lịch sử.** Bộ lọc từ ngày–đến ngày, quỹ/tài khoản, loại giao dịch, dự án, đối tác, người lập và trạng thái. Xuất Excel/CSV; PDF bảng kê khi cần in. Dữ liệu gồm số dư đầu kỳ, thu, chi, số dư cuối kỳ, mã phiếu và tham chiếu. Phiếu đảo xuất thành dòng có liên kết gốc; chỉ giao dịch đã ghi sổ tác động số dư.

Xuất toàn bộ kết quả được phép của bộ lọc, không chỉ dữ liệu của trang hiện tại; kiểm tra `payment.export` và phạm vi tại máy chủ. Tệp lớn có thể tạo tác vụ nền ở giai đoạn tối ưu. Nội dung văn bản xuất bảng tính phải được xử lý an toàn, không biến dữ liệu nhập thành công thức ngoài ý muốn.

Nghiệm thu: PDF mở lại được sau đổi người dùng/tải lại; số liệu trên phiếu khớp chi tiết; tổng thu–chi và số dư trong tệp khớp hệ thống theo cùng mốc dữ liệu; tiếng Việt và số tiền đúng; người thiếu quyền không tải được báo cáo hoặc chứng từ.

## 9. Gói F — Báo giá, hợp đồng và đơn hàng dự án

### 9.1. Sửa và tạo báo giá

- Có ba lối vào: tạo trống, tạo từ mẫu nội dung, sao chép báo giá cũ thành bản mới. Mẫu nội dung và mẫu in là hai lựa chọn riêng.
- Cho chỉnh khách hàng, hạng mục, quy cách, số lượng, đơn vị, giá, thuế/chiết khấu, hiệu lực, điều khoản thanh toán/bảo hành và bóc tách chi phí.
- Báo giá nháp được sửa; báo giá đã gửi/đã chấp thuận khi sửa nội dung phải tạo revision mới. Bản khách đã chấp thuận được giữ và SO/hợp đồng tham chiếu đúng revision.
- Công thức subtotal/chiết khấu/thuế/total dùng chung tại máy chủ và giao diện. Giữ thành phần dự toán khi sửa dòng, không xóa dữ liệu phụ thuộc một cách mù quáng.
- Mẫu ban đầu gồm báo giá tổng hợp, báo giá chi tiết hạng mục và bản nội bộ có dự toán. Cho cấu hình logo, thông tin công ty, cột, điều khoản và chữ ký trong phạm vi mẫu; trình kéo thả tự do là mở rộng sau.

### 9.2. Hợp đồng

Trước hết sửa lưu bền vững hồ sơ hợp đồng trong dự án, có API tải lại và quyền truy cập. Sau đó xây dựng màn hình hợp đồng dựa trên bảng hiện có:

- Tạo từ báo giá đã chốt hoặc tạo trực tiếp trong dự án.
- Lưu số/ngày hợp đồng, khách hàng, giá trị, revision báo giá, thời hạn, điều khoản, người phụ trách và file gốc.
- Mốc thanh toán gồm tên, hạn, số tiền/tỷ lệ, điều kiện nghiệm thu, đã thu/còn phải thu và phiếu thanh toán liên quan.
- Quản lý phụ lục/điều chỉnh, trạng thái nháp/chờ duyệt/đã duyệt/đã ký/hoàn tất/hủy; “đã ký” cần thông tin xác nhận thực tế, không suy ra từ phê duyệt nội bộ.
- Mẫu hợp đồng có biến dữ liệu và xuất PDF; nội dung mẫu được người có trách nhiệm của doanh nghiệp xác nhận.

Giá trị hợp đồng hiện trên dashboard dự án đang lấy từ tổng SO. Khi có hợp đồng thật, phải tách **giá trị hợp đồng**, **giá trị đơn hàng**, **công nợ đã ghi nhận** và **tiền thực thu**; thiết lập rõ nguồn tạo công nợ để không ghi nhận hai lần từ hợp đồng và SO.

### 9.3. Đơn hàng dự án

Tại dự án có nút “Tạo đơn hàng”, tự điền khách hàng và dự án; chọn báo giá/hợp đồng nguồn hoặc đơn phát sinh. Kiểm tra phạm vi dự án tại máy chủ, người phụ trách là người thực hiện được xác thực, không lấy membership đầu tiên trong database. Theo dõi hạng mục, số lượng, tổng tiền, đã giao và còn phải giao.

Đơn thông thường bổ sung `projectId`; đơn theo lô sản xuất tiếp tục đi qua luồng chọn đúng lô/hạng mục/kho đã có. Liên kết hợp đồng/báo giá với đơn này phải tránh tạo lại công nợ hoặc xuất kho trùng. Không mặc định chọn SKU bất kỳ khi dòng chưa được gán hàng thật.

Nghiệm thu: sửa báo giá không làm mất BOM/dự toán hoặc bản khách đã chấp thuận; tải lại vẫn thấy hợp đồng và phụ lục; mốc thu khớp giao dịch đã ghi sổ; tạo đơn từ dự án gắn đúng khách hàng; một nghiệp vụ bán không sinh công nợ hai lần.

## 10. Gói G — In dự toán/BOM và xuất Excel dự án theo mẫu CEN/QCNT

### 10.1. Bộ biểu mẫu thống nhất

Tạo thành phần xuất/in dùng chung cho logo, thông tin công ty, số/ngày, bảng nhiều trang, đánh số trang và chữ ký. Mỗi bản xuất gắn nguồn dữ liệu, revision, thời điểm và phiên bản mẫu.

Ba đầu ra đầu tiên:

1. **Dự toán nội bộ:** hạng mục, vật tư, nhân công, chi phí khác, hao hụt, giá vốn, tổng chi phí và giá bán dự kiến theo dữ liệu thực có. Chỉ người có quyền giá vốn được xem/xuất.
2. **Bóc tách/BOM:** dự án, hạng mục, mã/quy cách, đơn vị, khối lượng, hao hụt, nhu cầu sau quy đổi; cho tổng hợp theo vật tư và xem chi tiết từng hạng mục. Có bản cấp kho không hiển thị giá vốn.
3. **Phiếu kho:** giữ mẫu in hiện có, bổ sung người nhận, vị trí, số lượng thực tế, trạng thái và thông tin duyệt.

Không trộn giá bán của báo giá với giá vốn BOM hoặc số thực xuất. BOM đã chốt xuất đúng phiên bản; các thay đổi danh mục về sau không tự thay nội dung đã chốt.

### 10.2. Excel tổng hợp, chi tiết khối lượng và khảo sát theo mẫu đã cung cấp

**Ý định của khách:** chọn kỳ và các công trình cần báo cáo, rồi tải Excel có các nội dung đang dùng trong hai file CEN/QCNT. Bản đầu tập trung vào nội dung, đúng dữ liệu và dễ sử dụng. Không đặt việc xây dựng thêm công cụ quản lý tiến độ phức tạp làm điều kiện cho xuất Excel.

**Mẫu đã đọc:**

- [Mẫu CEN](<C:/Users/nhatb/Downloads/Tuần 4.9 - QCNT - CEN/DS CEN 28-30.T9 .2026 .xlsx>): sheet `DS CHI TIẾT ` gồm thông tin đại lý/địa điểm và hạng mục khối lượng; sheet `DS TỔNG HỢP ` gồm địa điểm, khu vực, ngày hoàn thành và nhân sự.
- [Mẫu QCNT](<C:/Users/nhatb/Downloads/Tuần 4.9 - QCNT - CEN/DS QCNT 28-30.T9 .2026 .xlsx>): có hai bảng tương tự và thêm sheet `DS KHẢO SÁT`. Hai nhóm dùng nhiều cột chung, có địa điểm xuất hiện trong cả hai file nhưng hạng mục thực hiện khác nhau.

**Đầu ra đề xuất:** một file `.xlsx` có hai sheet chính **DS TỔNG HỢP** và **DS CHI TIẾT**. Khi chọn xuất khảo sát hoặc có khảo sát trong kỳ, thêm **DS KHẢO SÁT**. Dùng cùng cấu trúc cho CEN/QCNT; có thể xuất riêng một nhóm hoặc gộp hai nhóm với cột nhận diện nhóm. Không cần làm hai chức năng xuất gần giống nhau.

| Sheet | Nội dung cần xuất | Mức dữ liệu |
|---|---|---|
| DS TỔNG HỢP | STT, tên đại lý/cửa hàng/công trình, tỉnh/khu vực, ngày hoặc khoảng ngày hoàn thành, nhân sự/đội thi công, tuần/kỳ, ghi chú; nhóm CEN/QCNT khi xuất gộp | Một dòng cho một công trình/đợt công việc trong kỳ; nhóm hạng mục có thể liệt kê chung nếu cùng nguồn công trình |
| DS CHI TIẾT | STT, tên cửa hàng/địa điểm, địa chỉ lắp đặt, tỉnh/thành phố, loại hình/hạng mục, mô tả chi tiết/quy cách, chiều rộng, chiều dài/cao theo quy cách, số lượng, đơn vị tính, khối lượng, ghi chú/tuần và nhóm | Mỗi hạng mục hoặc quy cách/kích thước khác nhau là một dòng, được nhóm dưới đúng công trình |
| DS KHẢO SÁT | STT, tên đại lý/công trình, tỉnh/khu vực, ngày hoặc khoảng ngày hoàn thành khảo sát, nhân sự khảo sát, ghi chú và tuần/kỳ | Một dòng cho một đợt khảo sát; độc lập với ngày hoàn thành thi công |

**Cách lấy dữ liệu và thao tác xuất:**

- Nút “Xuất Excel” tại danh sách dự án và trang dự án. Cho chọn tuần/tháng hoặc từ ngày–đến ngày, nhóm CEN/QCNT, tỉnh/khu vực và một/nhiều dự án; có lựa chọn tổng hợp, chi tiết, khảo sát.
- Ghi kỳ báo cáo và ngày cập nhật tại phần đầu file. Bộ lọc ngày phải thể hiện rõ đang chọn ngày kế hoạch, ngày hoàn thành thi công hay ngày khảo sát; giữ cùng phạm vi khi tạo các sheet.
- Tên/địa chỉ lấy từ địa điểm công trình gắn dự án; khu vực lấy từ trường dữ liệu rõ ràng. Không đồng nhất tên khách hàng xuất hóa đơn với tên cửa hàng nếu chúng khác nhau.
- Hạng mục/quy cách/kích thước lấy từ nguồn hạng mục dự án, khảo sát, thiết kế hoặc báo giá đã xác nhận. Khối lượng hạng mục lắp đặt và BOM nguyên vật liệu là hai loại dữ liệu riêng; không xuất các dòng NVL thay cho các hạng mục trong mẫu.
- Ngày hoàn thành và nhân sự lấy từ công việc/báo cáo thi công hoặc khảo sát tương ứng. Nếu mới có lịch dự kiến thì ghi là dự kiến; chưa có ngày thì để trống hoặc ghi “Chưa có”, không tự đổi hạn hoàn thành thành ngày thực tế.
- Rà soát và bổ sung tối thiểu các trường còn thiếu để xuất đủ mẫu, như nhóm công việc CEN/QCNT, khu vực, quy cách, kích thước hoặc ngày hoàn thành thực tế. Dùng dữ liệu nguồn chung cho giao diện và Excel, tránh nhập lại thông tin ở màn hình báo cáo.

**Khối lượng và các dòng dịch vụ:**

- Nhãn “Khối lượng” trong mẫu là lượng theo đơn vị `m²`, cái, bộ, chuyến, gói..., không mặc định là trọng lượng kg.
- Hạng mục tính diện tích: khối lượng = chiều rộng × chiều dài/cao × số lượng, sau khi chuẩn hóa kích thước về mét. Hạng mục tính cái/bộ/chuyến/gói dùng quy tắc theo đơn vị của hạng mục.
- Giữ các hạng mục dịch vụ có trong nguồn như vận chuyển, khảo sát, chuẩn bị/thi công và bảo hành; không bắt mọi dòng phải có kích thước.
- Chữ, cụm chi tiết hoặc hạng mục có nhiều mảnh dùng khối lượng từ các thành phần đã xác nhận hoặc số đo được duyệt; không tự thay bằng diện tích hình chữ nhật nếu không đúng nghiệp vụ.
- Không cộng chung các đơn vị khác nhau. Dòng thi công có khối lượng tính từ diện tích các hạng mục vẫn là dòng dịch vụ riêng, không cộng lần nữa vào tổng diện tích vật liệu.
- Mô tả/quy cách và công thức trong file xuất phải dùng dữ liệu có trong hệ thống/file xuất; không phụ thuộc đường dẫn workbook bên ngoài như một số công thức tra cứu trong mẫu.

**Gộp phần trùng:**

- Tổng hợp và chi tiết dùng một nguồn định danh công trình/địa điểm; dữ liệu tên, khu vực và nhân sự không được nhập độc lập rồi lệch nhau giữa hai sheet.
- Khi cùng một công trình có cả CEN và QCNT trong một đợt, bảng tổng hợp có thể gộp một dòng và thể hiện hai nhóm; bảng chi tiết vẫn giữ toàn bộ hạng mục của mỗi nhóm.
- Chỉ loại dòng trùng khi cùng ID nguồn, cùng công trình/đợt và cùng hạng mục/quy cách. Không xóa chỉ vì giống tên đại lý, loại hàng hoặc kích thước; có thể là công việc khác hoặc hai lần thi công.
- Không ép danh sách khảo sát trùng danh sách thi công: một nơi có thể đã khảo sát nhưng chưa thi công, hoặc có nhiều đợt khảo sát.
- Có thể nhóm thông tin cửa hàng để dễ đọc và dùng tiêu đề như mẫu; ưu tiên bảng lọc/sắp xếp được, nội dung mô tả xuống dòng đủ đọc và không mất dữ liệu vì gộp ô.

**Nghiệm thu Excel dự án:** xuất một nhóm và xuất gộp hai nhóm đều có đủ cột như trên; công trình trùng được tổng hợp đúng nhưng hạng mục khác nhau vẫn đủ; ngày thi công/khảo sát không bị lẫn; khối lượng đúng theo từng đơn vị và không cộng hai lần; file mở độc lập không hỏi liên kết ngoài, tiếng Việt đúng, ngày/số lượng có định dạng phù hợp, có bộ lọc/cố định tiêu đề và không cắt mô tả. Người dùng chỉ xuất được các dự án thuộc phạm vi của mình.

Biểu đồ Gantt, kế hoạch gốc có phiên bản, mẫu tiến độ trống và PDF tiến độ là **phạm vi mở rộng**, chỉ đưa vào khi có yêu cầu riêng. Nội dung Excel theo hai mẫu trên là tiêu chí bàn giao bắt buộc của phần dự án/tiến độ.

Nghiệm thu chung của gói G: báo cáo in nhiều trang không cắt cột hoặc mất chữ Việt; bản cấp vật tư không lộ giá vốn; số lượng sau quy đổi khớp nguồn; Excel dự án đáp ứng nội dung mẫu và các quy tắc gộp phần trùng.

## 11. Lộ trình triển khai và phụ thuộc

Phát hành từng đợt có tiêu chí nghiệm thu, thay vì đưa toàn bộ vào một lần. Thứ tự đề xuất:

| Đợt | Phạm vi | Kết quả bàn giao | Phụ thuộc | Ước lượng ngày công phát triển |
|---|---|---|---|---|
| 0 | Xác nhận dữ liệu thật, migration, tài khoản thử, mẫu và chính sách | Danh sách thiếu sót xác nhận qua thao tác; ma trận quyền/quy trình được chốt | Bản kế hoạch này | 2–3 |
| 1 | Gói A + nền duyệt của B; chặn các đường vượt quyền; sửa lỗi OT tính trùng trước mắt | Quyền theo kho/hạn mức có hiệu lực; phiếu đi đúng trạng thái; sửa lỗi tính lương đã biết bằng dữ liệu thử | Đợt 0 | 8–12 |
| 2 | Gói C + quy trình kho hoàn chỉnh của B | Nhập nhanh vật tư phát sinh, vị trí, người nhận; tạo phiếu từ nguồn; ghi sổ đúng | Đợt 1 | 6–9 |
| 3 | Gói D | Ca thường/OT, xin trước/sau, rà soát HR, lương theo từng phiên và khóa kỳ | Quyền + nền duyệt đợt 1 | 8–12 |
| 4 | Thanh toán của B + gói E | Phiếu thanh toán duyệt trước ghi sổ; PDF/tệp; xuất lịch sử đối soát | Đợt 1 | 4–6 |
| 5 | Gói F | Báo giá có phiên bản/mẫu; hồ sơ và nghiệp vụ hợp đồng; đơn hàng dự án | Nền quyền/duyệt; nguyên tắc công nợ đợt 4 | 6–9 |
| 6 | Gói G + nghiệm thu xuyên suốt | Bộ in dự toán/BOM/phiếu; Excel tổng hợp/chi tiết/khảo sát theo mẫu CEN/QCNT; luồng liên phân hệ được nghiệm thu | Dữ liệu chuẩn các đợt trước | 4–6 |

Tổng tham chiếu **38–57 ngày công phát triển**; thêm khoảng **5–8 ngày làm việc nghiệm thu cuối và sửa lỗi**, với kiểm thử diễn ra trong từng đợt. Nếu một người phát triển làm toàn thời gian và nghiệp vụ được phản hồi kịp thời, lịch tuần tự khoảng **9–13 tuần**. Đây là ước lượng sơ bộ để phân kỳ, chưa phải cam kết tiến độ; phải cập nhật sau đợt 0, nhất là phần phân bổ vị trí kho và dữ liệu HRM cũ.

Sau đợt 1, HRM và tài chính có thể triển khai song song nếu có nhân sự riêng. Thêm nhanh vật tư có thể bàn giao sớm trước quản lý nhiều vị trí, miễn đã có quyền danh mục và luồng ghi sổ đúng. Lưu hồ sơ hợp đồng bền vững có thể sửa sớm trước phần hợp đồng/mốc thanh toán đầy đủ.

Thay đổi cách tính OT cần đưa ra bản so sánh trên một kỳ mẫu trước khi dùng chốt lương thật; không chờ toàn bộ mẫu in hoàn thành mới sửa sai số lương.

## 12. Dữ liệu, chuyển đổi và nghiệm thu tổng thể

### 12.1. Dữ liệu cần bổ sung/tận dụng

| Nhóm | Tận dụng | Bổ sung hoặc mở rộng |
|---|---|---|
| Quyền | Role/grant, bảng kho/dự án chỉ định, warehouse membership, role change request, audit | Giao diện gán đối tượng, kiểm tra từng grant, version/cache và duyệt thay đổi |
| Duyệt | Chính sách, các bước, yêu cầu, quyết định | Dịch vụ duyệt dùng chung; liên kết HRM/đề nghị vật tư khi được chốt; hành động trả về sửa |
| Kho | Items/categories/units, phiếu, lô, balances/movements/reservations | Vị trí và tồn theo vị trí; người nhận; trường nhận diện vật tư phát sinh nếu cần |
| Tài chính | Payments, quỹ, allocations/open items, cash entries | Vòng đời duyệt/ghi sổ/đảo; tệp đính kèm chuẩn và PDF theo phiên bản |
| CRM | Quotation revisions, estimate components, SO, contracts/milestones | Phiên bản/mẫu; hồ sơ hợp đồng lưu thật; liên kết SO/dự án/hợp đồng |
| HRM | Work shifts, attendance entries, HRM requests, payroll snapshots | Loại ca thường/OT, phân ca, phiên chấm công, đối chiếu đơn, quyết định HR, chi tiết phút lương |
| Báo cáo dự án/tiến độ | Dự án, địa điểm, hạng mục, cây công việc, khảo sát và phân công nhân sự | Trường thiếu phục vụ mẫu CEN/QCNT; nguồn dữ liệu chung cho tổng hợp/chi tiết/khảo sát; bộ lọc kỳ/nhóm và xuất Excel |

Migration theo hướng bổ sung và giữ dữ liệu cũ. Không đổi số dư tồn/quỹ hoặc viết lại bản lương đã chốt. Phiếu đã ghi sổ giữ lịch sử; phiếu đang dở cần bảng ánh xạ trạng thái và danh sách xử lý ngoại lệ. Không tạo yêu cầu duyệt mới cho chứng từ lịch sử rồi tự coi đã được duyệt theo chính sách mới.

Dữ liệu chấm công cũ chưa biết ca không được tự đoán là OT hoặc tự tính lại kỳ khóa. Đưa vào danh sách đối chiếu có nguồn/lý do. Vị trí cũ chưa rõ đưa vào vị trí tạm có đối soát. Tệp tài liệu mới phải dùng quyền của nghiệp vụ liên quan; không coi kho tài liệu dùng chung là đủ bảo vệ hợp đồng hoặc phiếu tiền.

### 12.2. Kịch bản nghiệm thu xuyên suốt

1. PM tạo báo giá theo mẫu → sửa revision → khách chấp thuận → lập hợp đồng/mốc thu → tạo đơn hàng gắn dự án. Kiểm tra đúng bản nguồn và không trùng công nợ.
2. Tạo nhu cầu từ BOM → có vật tư phát sinh chưa có danh mục → thủ kho thêm nhanh → nhập đúng vị trí → gửi/duyệt/ghi sổ → xuất đúng dự án và người nhận. Kiểm tra tồn tổng bằng tổng vị trí.
3. Kho A cấp hàng, kho B không được gán: kiểm tra danh sách, chi tiết, lập/duyệt/ghi sổ, xuất dữ liệu và gọi API trực tiếp đều đúng phạm vi.
4. Kế toán lập phiếu thanh toán có PDF → cấp trên duyệt theo hạn mức → xác nhận thực chi → gạch nợ → tải lịch sử. Kiểm tra số dư/quỹ/công nợ trước và sau từng bước.
5. Nhân viên làm ca thường + ca OT, xin trước/sau; có ngày duyệt một phần, chưa duyệt và bị từ chối. HR chọn số phút tính lương → chốt → xem lại từng ngày và quyết định. Kiểm tra không trùng OT, không mất công thường.
6. Hai người cùng thao tác duyệt/ghi sổ/chốt; gửi lại sau lỗi mạng: chỉ có một tác động nghiệp vụ hợp lệ.
7. Đảo/hủy và trả dư đúng nguồn; chứng từ đã ghi sổ hoặc kỳ khóa không bị sửa trực tiếp.
8. In nhiều trang và xuất nhiều dòng: đầy đủ dữ liệu, đúng phiên bản, đúng số liệu/tiếng Việt, không lộ giá vốn/lương cho người thiếu quyền. Riêng Excel CEN/QCNT phải thử một công trình có cả hai nhóm, nhiều quy cách/kích thước và đợt khảo sát khác ngày thi công: tổng hợp không trùng, chi tiết không mất dòng, khối lượng/dịch vụ không cộng hai lần và không cần workbook ngoài.

Mỗi gói chỉ coi hoàn thành khi dữ liệu lưu được sau tải lại, API kiểm tra quyền đúng, số liệu đối soát được và có kiểm thử các trường hợp sai quyền/sai trạng thái. Dùng dữ liệu thử cô lập cho các thao tác làm đổi kho, tiền hoặc lương; không dùng dữ liệu thật để chạy thử ghi sổ.

### 12.3. Các quyết định cần chốt trong đợt 0

- Kho và người phụ trách; loại phiếu nào cần một/nhiều cấp duyệt; hạn mức và người thay thế khi vắng; trường hợp ngoại lệ tự duyệt nếu có.
- “Phiếu vật tư” có cần là phiếu đề nghị cấp riêng hay chỉ hoàn thiện phiếu nhập/xuất; nhóm vật tư phát sinh và thông tin bắt buộc khi thêm nhanh.
- Đơn hàng dự án gồm đơn thi công/bán hàng nào; quan hệ hợp đồng–SO–nguồn công nợ để không trùng doanh thu/công nợ.
- Mẫu báo giá, hợp đồng, phiếu tiền và dự toán/BOM đang dùng; mức tùy chỉnh mẫu tự tạo cần có ở bản đầu. Mẫu Excel dự án/tiến độ CEN/QCNT đã được cung cấp và đọc; khi triển khai chỉ cần chốt các trường còn thiếu, nguồn ngày hoàn thành và quy tắc nhóm công trình/đợt công việc.
- Ca thường/OT, nghỉ giữa ca, lịch ngày nghỉ, hệ số, quy tắc làm tròn, người duyệt OT, HR được quyết định tính lương tới mức nào và xử lý duyệt sau khóa kỳ.
- Nhập/xuất có bắt buộc quản lý nhiều vị trí ngay ở bản đầu; điều chuyển có cần tách xác nhận xuất và nhận.

Các điểm chưa chốt là đầu vào nghiệp vụ cho triển khai. Chúng không ngăn lập kế hoạch, kiểm tra hệ thống và chuẩn bị tiêu chí nghiệm thu.

## 13. Căn cứ mã nguồn để đội triển khai tra cứu

Các vị trí dưới đây thuộc bản mã nguồn đã đọc ngày lập tài liệu; số dòng có thể thay đổi sau các chỉnh sửa tiếp theo.

| Phát hiện | Nguồn |
|---|---|
| Kho chưa gán có nhánh mở mọi kho | `src/lib/inventory-api.ts:39–80` |
| Hợp nhất capability, ưu tiên scope và mở toàn quyền theo tên vai trò | `src/services/authorization.service.ts`, phương thức `getUserCapabilities` và `authorize` |
| Hạn mức 0 đọc thành null; grant áp dụng trực tiếp | `src/services/iam.service.ts:544`, `getRoleGrants` và `updateRoleGrants` |
| Phiếu kho duyệt được từ nháp; kiểm tra hạn mức; ghi sổ | `src/services/inventory.service.ts:1742`, `submitDocument`, `approveDocument`, `completeDocument` |
| Kiểm tra kho/dự án và giữ hàng cho sản xuất đã có | `src/lib/production/context.ts`, `src/lib/production/stock-hooks.ts`, `docs/PRODUCTION_WORKFLOW.md` |
| Tấm dư và nhãn kệ theo kho–vật tư | `src/services/inventory.service.ts:1043`, `listRemnants`; `database/migrations/002_erp_iam.sql`, `warehouse_item_settings` |
| Phiếu nhập chưa có vị trí/người nhận/thêm nhanh | `src/app/(dashboard)/kho/nhap-xuat/CreateStockDocModal.tsx`, `src/services/inventory.service.ts:1532` |
| Người nhận trên bản in để trống | `src/components/inventory/StockDocPrintModal.tsx` |
| Quyền tạo phiếu tiền mở qua quyền mua hàng; tạo xong ghi sổ | `src/app/api/finance/payments/route.ts`, `src/services/finance.service.ts:484` |
| Giao diện nhận PDF nhưng dịch vụ upload theo `data:image/` | `src/components/finance/DebtPaymentModal.tsx:106`, `src/services/finance.service.ts:514` |
| Xuất CSV chung; chưa có xuất sổ quỹ chuyên biệt | `src/components/shared/DataTable.tsx`, `handleDefaultExport`; `src/app/(dashboard)/tai-chinh/page.tsx:913` |
| Sửa trực tiếp revision báo giá; xóa/tạo lại dòng | `src/services/crm.service.ts:929`, `updateQuotation`; FK `estimate_components` trong migration `002` |
| SO thường chưa nhận project; chuyển báo giá tạo SO gắn dự án | `src/services/crm.service.ts:1162`, `convertQuotationToProject`; `src/services/crm.service.ts:1441`, `createSalesOrder` |
| Hồ sơ hợp đồng thêm vào state | `src/app/(dashboard)/du-an/[id]/page.tsx:1352`, `handleSaveCustomDoc` |
| Bảng hợp đồng và nền phê duyệt đã có | `database/migrations/002_erp_iam.sql:779`, `contracts`, `contract_milestones`, `approval_*`, `iam.role_change_requests` |
| Giá trị hợp đồng dự án đang tính từ SO | `src/services/project.service.ts:2991`, `getProjectFinancialSummary` |
| Chấm công chưa theo phiên ca; OT vượt 8; cộng thêm giờ đơn | `src/services/hrm.service.ts:455`, `recordAttendance`; `:595`, `getMonthlyAttendanceMatrix`; `:905`, `calculateMonthlyPayroll` |
| Duyệt HRM/cấu hình ca chưa kiểm tra đủ quyền; chốt lương nhận số tiền phía giao diện | `src/app/api/hrm/requests/[id]/review/route.ts`, `src/app/api/hrm/shifts/route.ts`, `src/app/api/hrm/payroll/approve/route.ts`, `src/services/hrm.service.ts:1137` |

**Đề xuất bắt đầu:** đợt 0 và đợt 1, trong đó chốt phân công kho, cơ chế duyệt và cách ghi nhận OT là điều kiện nền cho các gói còn lại.
