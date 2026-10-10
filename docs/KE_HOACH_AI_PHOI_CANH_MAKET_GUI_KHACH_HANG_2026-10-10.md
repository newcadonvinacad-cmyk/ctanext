# Kế hoạch bổ sung AI phối cảnh maket và bản trình bày gửi khách hàng

Ngày lập: 10/10/2026. Trạng thái: **dự kiến triển khai ở giai đoạn sau**.

Tài liệu này ghi nhận yêu cầu mới, tách riêng khỏi [kế hoạch bổ sung tính năng hiện tại](KE_HOACH_BO_SUNG_TINH_NANG_2026-10-10.md). Chưa triển khai chức năng hoặc gọi dịch vụ tạo ảnh AI trong lần lập kế hoạch này.

## 1. Mục tiêu và cách hiểu yêu cầu

“Market” được hiểu là **maket thiết kế bảng hiệu/sản phẩm**. Người dùng tạo maket trên hệ thống, lưu thêm bản sản phẩm màu đỏ không có đường kích thước, kết hợp với ảnh khảo sát hiện trường để AI tạo ảnh mô phỏng sau khi lắp đặt. Sau đó hệ thống dàn thành bản trình bày để tải về gửi khách hàng, tương tự hình tham khảo.

Tại màn hình tạo phối cảnh, **maket đã tạo trong dự án là nguồn lựa chọn nhanh**. Người dùng còn có thể **tải ảnh thiết kế từ bên ngoài** trực tiếp tại đây, không phải tạo maket bằng công cụ của hệ thống trước. Có thể dùng một trong hai nguồn hoặc kết hợp cả hai trong cùng một lần tạo.

Một lần tạo phối cảnh phải chọn được **nhiều maket/ảnh thiết kế**, ví dụ bảng chính trên cao và bộ trang trí quanh cửa. Mỗi mẫu có ô nhập mô tả vị trí riêng để hướng dẫn cách đặt sản phẩm vào ảnh.

Ảnh mẫu do khách hàng cung cấp: [Mẫu phối cảnh và maket](references/MAU_PHOI_CANH_MAKET_GUI_KHACH_HANG.png). Đây là mẫu tham khảo bố cục và nội dung; tên cửa hàng, số điện thoại, kích thước và vật tư trong hình không phải giá trị mặc định cho các dự án khác.

## 2. Hệ thống hiện đã có gì và còn thiếu gì

| Phần | Hiện trạng qua kiểm tra mã nguồn | Phần cần bổ sung |
| --- | --- | --- |
| API AI | Đã tích hợp Gemini qua `@google/genai`, có cấu hình `GEMINI_API_KEY`; dịch vụ hiện phục vụ nội dung, JSON, trợ lý và đọc ảnh hóa đơn | Luồng tạo/chỉnh sửa ảnh, nhận và lưu ảnh đầu ra. Có cấu hình khóa không đồng nghĩa khóa đã được kiểm tra hoạt động hoặc được cấp quyền dùng model tạo ảnh |
| Lưu maket | Màn hình thiết kế lưu SVG từ chế độ đang hiển thị; có thông số thiết kế, phiên bản, trạng thái và liên kết dự án | Tự lưu thêm bản màu thực tế không dim, độc lập với chế độ xem hiện tại; giữ bản kỹ thuật và thông số nguồn |
| Màu maket | Canvas có chế độ kỹ thuật và màu thực tế; chế độ có tên `clean` hiện vẫn dùng màu xám | Không dùng tên `clean` làm căn cứ cho bản màu đỏ; xuất đúng màu sản phẩm và tắt dim/khung tên |
| Ảnh khảo sát | Dữ liệu khảo sát có `photos`; tạo khảo sát đã nhận danh sách ảnh | Giao diện thêm/xem/sửa/xóa ảnh hiện trường; hàm cập nhật khảo sát hiện chưa cập nhật `photos` |
| Tải tệp | Có API upload chung | Áp dụng giới hạn ảnh, kiểm tra quyền theo dự án và cách lưu/tải phù hợp cho ảnh khách hàng |
| Bản gửi khách | Chưa thấy luồng chọn nhiều maket, đặt vị trí, tạo phối cảnh và dàn trang như mẫu | Xây dựng toàn bộ luồng này, lưu lịch sử và tải bản hoàn chỉnh |

Có thể mở rộng tích hợp Gemini hiện có: tài liệu chính thức mô tả khả năng tạo và chỉnh sửa ảnh từ văn bản cùng ảnh đầu vào. Khi triển khai phải chọn model hỗ trợ ảnh, kiểm tra quyền truy cập và thử chất lượng với ảnh thực tế; model đang dùng cho trợ lý/OCR không tự trở thành model tạo ảnh. Nguồn: [Gemini API — Image generation](https://ai.google.dev/gemini-api/docs/image-generation).

## 3. Phạm vi chức năng cần làm

### 3.1. Lưu thêm bản sản phẩm màu đỏ không dim khi tạo maket

Mỗi lần lưu một phiên bản maket cần lưu đồng bộ:

- Thông số nguồn để mở lại và chỉnh sửa thiết kế.
- Bản kỹ thuật có kích thước, chú thích và khung tên theo lựa chọn của người dùng.
- **Bản màu sản phẩm không dim**: với mẫu Nippon là màu đỏ đúng thiết kế, giữ nguyên logo, tên cửa hàng, số điện thoại và nội dung. Bỏ đường kích thước, mũi tên, chú thích đo và khung tên; không chụp lại màn hình đang xem.
- Ảnh thu nhỏ phục vụ danh sách chọn maket.

Bản không dim được xuất từ dữ liệu thiết kế với chế độ màu thực tế, tắt kích thước/khung tên và cắt sát phạm vi sản phẩm. Với sản phẩm dạng khung cửa, phần ngoài sản phẩm và khoảng rỗng giữa khung cần giữ trong suốt để ghép vào ảnh; phần vật liệu đỏ vẫn giữ nguyên. Nên giữ SVG nguồn và PNG dùng làm đầu vào AI.

Đầu ra gắn với đúng phiên bản maket. Nếu xuất một biến thể thất bại, hiển thị trạng thái thiếu ảnh và cho tạo lại; không gửi biến thể cũ của phiên bản trước cho AI. Maket cũ có đủ thông số được tạo bổ sung biến thể khi sử dụng lần đầu; trường hợp thiếu thông số thì yêu cầu tải bản sản phẩm hoặc mở lại để lưu.

### 3.2. Bổ sung ảnh hiện trường vào khảo sát

- Thêm nhiều ảnh khi tạo và sửa khảo sát, có xem trước và ảnh đại diện.
- Nhập chú thích từng ảnh: mặt tiền, cửa ra vào, vị trí bảng chính, góc chụp khác…
- Chọn một ảnh chính cho mỗi phối cảnh; các ảnh khác làm tham chiếu. Nếu cần đầu ra ở nhiều góc thì tạo riêng từng góc để tránh trộn cảnh.
- Lưu ảnh gốc, ảnh xem trước, thứ tự và chú thích cùng khảo sát; mở lại vẫn xem/sửa được.
- Liên kết khảo sát với dự án để chọn ảnh trực tiếp khi tạo phối cảnh, không phải tải lại ảnh đã có.

### 3.3. Chọn nhanh maket trong dự án, tải ảnh thiết kế ngoài và mô tả vị trí

Màn hình “Tạo phối cảnh” có ảnh hiện trường và hai cách thêm thiết kế:

- **Chọn maket trong dự án:** danh sách ảnh thu nhỏ, tên và phiên bản để chọn nhanh một hoặc nhiều mẫu; dùng bản sản phẩm không dim đã lưu.
- **Tải ảnh thiết kế:** tải trực tiếp một hoặc nhiều ảnh từ máy, ví dụ PNG/JPG/WebP; xem trước, đặt tên và nhập mô tả vị trí cho từng ảnh. Ảnh không cần được tạo bằng công cụ maket của hệ thống hoặc có mã maket trước đó.

Các mẫu từ cả hai nguồn được đưa vào cùng danh sách để thêm/bỏ, sắp xếp và gán vị trí. Có thể dùng hoàn toàn ảnh tải ngoài, hoàn toàn maket trong dự án hoặc trộn hai nguồn. Lưu ảnh tải ngoài cùng cấu hình phối cảnh của dự án để mở lại hoặc tạo lại không phải tải lên lần nữa.

Ảnh thiết kế tải ngoài là đầu vào sản phẩm, được phân biệt với ảnh hiện trường. Giữ màu, chữ và logo trong ảnh gốc; hỗ trợ PNG có nền trong suốt. Bản không dim được tự sinh cho maket tạo trong hệ thống; ảnh tải ngoài ưu tiên bản sản phẩm không dim do người dùng cung cấp, có thể dùng vùng cắt đã chọn nếu ảnh có phần thừa. Không mặc định đổi mọi ảnh tải ngoài thành màu đỏ hoặc tự suy ra kích thước/BOM từ ảnh.

Danh sách vị trí hiển thị như sau:

| Nội dung | Ví dụ |
| --- | --- |
| Nguồn thiết kế | Maket trong dự án hoặc ảnh tải lên |
| Maket và phiên bản | Bảng chính — phiên bản 2 |
| Ảnh thiết kế tải ngoài | `khung-cua.png` — tên hiển thị “Bộ trang trí cửa” |
| Ảnh hiện trường áp dụng | Ảnh mặt tiền chính |
| Mô tả vị trí của maket | “Đặt trên phần tường cao nhất, ngay trên cửa sổ tầng trên; căn giữa theo mặt tiền” |
| Maket khác trong cùng cảnh | Bộ trang trí cửa — phiên bản 1 |
| Mô tả vị trí của maket khác | “Thanh ngang ở mép trên cửa tầng trệt, hai trụ đỏ hai bên cửa; giữ cây phía trước” |
| Mô tả chung | “Giữ nguyên nhà, dây điện, cửa và cây; phối cảnh ban ngày” |

Cho phép thêm/bỏ nhiều maket/ảnh tải ngoài và sửa mô tả riêng từng mẫu trước khi tạo. Đầu vào AI gồm ảnh hiện trường, ảnh sản phẩm của từng mẫu đã chọn và mô tả tương ứng, được gắn nhãn rõ để tránh đặt nhầm sản phẩm. Mỗi mẫu có định danh riêng dù không có mã maket trong hệ thống.

Mặc định các maket được chọn là **các hạng mục cùng lắp trên một công trình**, như bảng chính và khung cửa trong hình mẫu. Nếu muốn so sánh nhiều phương án thay thế, dùng chế độ “Tạo các phương án riêng”; không ghép các mẫu thay thế chồng vào một vị trí.

Bổ sung khả năng khoanh vùng hoặc đặt các điểm góc trên ảnh để xác định vị trí chính xác, đồng thời vẫn giữ ô nhập mô tả. Đây cũng là cách sửa khi chỉ dẫn bằng chữ chưa đủ rõ hoặc AI đặt sai vị trí.

### 3.4. Gọi AI tại màn hình tạo phối cảnh

Luồng chính bắt đầu từ màn hình **“Tạo phối cảnh”** trong dự án: chọn ảnh hiện trường → chọn nhanh maket có sẵn và/hoặc tải ảnh thiết kế ngoài → nhập vị trí → bấm “Tạo phối cảnh”. Dự án chưa có maket tạo trong hệ thống vẫn dùng được luồng này với ảnh tải ngoài.

Sau khi lưu maket mới, vẫn có lối tắt sang màn hình phối cảnh với maket đó được chọn sẵn. Thao tác **“Lưu và tạo phối cảnh”** thực hiện lần lượt: lưu phiên bản và các biến thể ảnh thành công → lưu cấu hình phối cảnh → gửi tác vụ AI khi đã đủ đầu vào.

Nếu chưa có ảnh hiện trường hoặc chưa chọn vị trí, vẫn lưu được maket; người dùng bổ sung tại màn hình phối cảnh rồi bấm “Tạo phối cảnh”. Việc lưu tự động hoặc mở lại maket không tự phát sinh thêm một lượt AI.

AI xử lý phối cảnh, ánh sáng và sự hòa hợp với hiện trường. Các thông tin cần chính xác như logo, chữ, số điện thoại, kích thước và vật tư phải giữ từ nguồn thiết kế/dữ liệu dự án. Không giao cho AI vẽ lại toàn bộ bản trình bày.

### 3.5. Tạo bản trình bày giống nội dung mẫu để gửi khách

| Khu vực | Nội dung và nguồn |
| --- | --- |
| Phần đầu trang | Logo/thương hiệu, tên cửa hàng, liên hệ, địa chỉ, loại sản phẩm; lấy từ dữ liệu dự án và cho chỉnh trước khi xuất |
| Hàng phối cảnh | Ảnh hiện trường trước lắp đặt và ảnh đã ghép sản phẩm sau lắp đặt, đặt cạnh nhau |
| Khu vực maket | Các maket/ảnh thiết kế đã chọn từ cả hai nguồn; bản màu và kích thước từ dữ liệu thiết kế hoặc thông tin người dùng nhập cho ảnh tải ngoài |
| Khu vực kỹ thuật | Sơ đồ khung/kết cấu nếu dự án có dữ liệu; không tự dựng sơ đồ bằng cách đoán từ ảnh |
| Vật tư và ghi chú | Vật tư/quy cách/khối lượng từ BOM hoặc dữ liệu đã được người dùng xác nhận; cho chọn có hiển thị hay không |

Hệ thống dàn trang bằng mẫu cố định để chữ và bố cục rõ ràng. Chọn nhiều maket thì tự thêm ô hoặc trang phù hợp; không ép nhỏ đến mức khó đọc. Cho xem trước, sửa phần đầu trang/ghi chú và chọn kết quả phối cảnh trước khi tải.

Định dạng chính: **PNG/JPG chất lượng cao** để gửi khách như hình mẫu. Bổ sung PDF từ cùng bản trình bày để thuận tiện in và lưu hồ sơ. Xuất được cả ảnh phối cảnh riêng và bản trình bày đầy đủ; người dùng chủ động gửi khách sau khi tải.

Kích thước và vật tư trong bản xuất là dữ liệu đã lưu, không suy ra từ AI hoặc sao chép số liệu trong ảnh mẫu. Nếu chưa có dữ liệu thì ẩn khối tương ứng hoặc hiển thị phần chờ bổ sung khi xem trước.

Với ảnh thiết kế tải ngoài, vẫn xuất được ảnh trước/sau và ảnh thiết kế gốc dù không có thông số kỹ thuật. Người dùng có thể bổ sung kích thước, ghi chú hoặc vật tư để hiển thị; việc thiếu các thông tin này không chặn tạo phối cảnh.

## 4. Luồng sử dụng đề xuất

1. Nhân viên khảo sát thêm ảnh hiện trường, chú thích và thông số đo vào dự án.
2. Nếu tạo maket bằng hệ thống, lưu thêm bản màu không dim và bản kỹ thuật. Thiết kế làm bên ngoài có thể tải trực tiếp ở bước tiếp theo.
3. Mở “Tạo phối cảnh” trong dự án hoặc đi từ lối tắt sau khi lưu maket; chọn ảnh chính, chọn nhanh một hoặc nhiều maket trong dự án và/hoặc tải nhiều ảnh thiết kế ngoài.
4. Nhập mô tả vị trí cho từng maket/ảnh thiết kế, mô tả chung; khoanh vùng nếu cần.
5. Hệ thống gửi ảnh và mô tả tới AI, hiển thị trạng thái đang xử lý và lưu kết quả.
6. Người dùng xem trước/sau; nếu chưa đúng thì chỉnh vị trí hoặc mô tả rồi tạo lại thành một lượt mới.
7. Chọn kết quả phù hợp, xem bản trình bày, điều chỉnh thông tin hiển thị và tải ảnh/PDF.
8. Mở lại dự án để xem lịch sử, tải lại hoặc tạo phiên bản mới từ cấu hình đã lưu.

Giao diện sử dụng các tên “Ảnh hiện trường”, “Chọn maket trong dự án”, “Tải ảnh thiết kế”, “Vị trí lắp đặt”, “Mô tả thêm”, “Tạo phối cảnh”, “Tải bản gửi khách”. Cấu hình model và thông số dịch vụ nằm ở phía quản trị.

## 5. Cách xử lý hình ảnh để giữ đúng thiết kế

Phối cảnh thử nghiệm cần đánh giá cả vị trí, tỷ lệ, góc nhìn và độ chính xác của chữ/logo. AI có thể thay đổi chi tiết ảnh; kết quả đẹp chưa đủ để coi là đúng maket.

Hướng ưu tiên là dùng ảnh sản phẩm đã xuất làm nguồn chính xác, biến đổi phối cảnh theo vị trí/điểm góc rồi dùng AI hỗ trợ hòa ánh sáng, bóng đổ và vùng tiếp giáp. Giới hạn vùng chỉnh sửa nếu dịch vụ hỗ trợ; giữ ảnh gốc ngoài vùng lắp đặt bằng bước ghép ảnh của hệ thống. Cây, dây điện hoặc vật thể nằm trước bảng phải che bảng đúng thứ tự trong cảnh.

Nếu chữ/logo bị AI biến dạng, dùng lại lớp sản phẩm gốc đã biến đổi theo mặt phẳng lắp đặt hoặc cho người dùng chỉnh vùng đặt; không coi việc yêu cầu AI viết lại chữ là bảo đảm độ chính xác. Phần đầu trang, thông tin liên hệ, bản kỹ thuật và vật tư luôn được dựng bằng dữ liệu và mẫu dàn trang của hệ thống.

Trước khi triển khai rộng, làm thử với bảng chính, khung cửa, nhiều maket trong cùng cảnh, góc chụp xiên và vật cản. Kết quả thử quyết định mức tự động hóa và thao tác chỉnh vị trí cần thiết.

## 6. Dữ liệu, API và vận hành cần bổ sung

Phần này là thiết kế đề xuất, chưa phải API/chức năng hiện có.

| Nhóm dữ liệu | Nội dung cần lưu |
| --- | --- |
| Ảnh khảo sát | Mã ảnh, liên kết khảo sát/dự án, tệp gốc, ảnh xem trước, chú thích, thứ tự |
| Biến thể maket | Mã maket và phiên bản, thông số nguồn, SVG/PNG không dim, bản kỹ thuật, trạng thái tạo ảnh |
| Ảnh thiết kế tải ngoài | Mã tệp, dự án, người tải, tệp gốc/ảnh xem trước, tên hiển thị, vùng cắt nếu có, kích thước/ghi chú do người dùng bổ sung; không bắt buộc có mã maket |
| Cấu hình phối cảnh | Ảnh chính/tham chiếu, danh sách thiết kế và nguồn từng mẫu (maket dự án hoặc ảnh tải ngoài), liên kết phiên bản/tệp, mô tả/vùng đặt từng mẫu, mô tả chung, chế độ cùng cảnh hay phương án riêng |
| Lượt tạo AI | Người tạo, thời gian, trạng thái, ảnh và thông số đầu vào tại thời điểm tạo, cấu hình xử lý, lỗi và thông tin chi phí nếu dịch vụ cung cấp |
| Kết quả và bản gửi khách | Ảnh phối cảnh, kết quả được chọn, thông tin đầu trang, dữ liệu kỹ thuật/vật tư tại thời điểm xuất, tệp xuất và phiên bản mẫu dàn trang |

Lưu bản chụp dữ liệu đầu vào cho từng lượt tạo: sửa maket, khảo sát hoặc BOM sau đó không làm thay đổi bản đã gửi khách. Phiên bản maket mới không tự ghi đè các ảnh phối cảnh cũ.

Ảnh tải ngoài cũng cần giữ đúng tệp đã dùng ở từng lượt tạo; thay ảnh trong cấu hình hiện tại không làm mất đầu vào của lịch sử. Không tự tạo một bản ghi maket có thông số giả chỉ để đáp ứng liên kết dữ liệu.

Các điểm tích hợp dự kiến:

- Hoàn thiện cập nhật ảnh trên API khảo sát; bổ sung lưu biến thể trên luồng maket hiện có.
- Bổ sung tải/lưu ảnh thiết kế ngoài theo dự án; API tạo phối cảnh nhận danh sách đầu vào từ cả hai nguồn và kiểm tra từng tệp trước khi gửi AI.
- Nhóm API phối cảnh theo dự án, ví dụ `/api/projects/[id]/mockups`: tạo tác vụ, xem trạng thái/kết quả, tạo lại và chọn kết quả.
- API xuất bản trình bày từ kết quả đã lưu; xuất lại không phải gọi AI thêm lần nữa.
- Dùng cấu hình model ảnh riêng, ví dụ `GEMINI_IMAGE_MODEL`; kiểm tra SDK và API chính thức khi bắt đầu thực hiện. Khóa API chỉ ở máy chủ.

Tạo ảnh cần chạy dạng tác vụ nền vì có thể xử lý lâu. Có trạng thái chờ/đang xử lý/thành công/thất bại, giới hạn thời gian và thao tác thử lại. Chặn gửi trùng khi bấm nhiều lần; trường hợp không rõ lượt trước đã hoàn thành hay chưa phải kiểm tra trước khi gửi lại để hạn chế tính phí lặp.

Áp dụng quyền xem dự án và quyền tạo/tải phối cảnh trên máy chủ; kiểm tra các ảnh và maket thuộc phạm vi được phép. Giới hạn định dạng, kích thước tệp, số ảnh/maket và số lượt tạo theo cấu hình. Lưu ảnh khách hàng bằng cơ chế kiểm soát truy cập, không tạo URL công khai lâu dài nếu không cần thiết. Chỉ gửi những ảnh và mô tả đã chọn cho dịch vụ AI.

## 7. Tiêu chí nghiệm thu

| Mã | Tình huống | Kết quả cần đạt |
| --- | --- | --- |
| AI-01 | Lưu maket khi màn hình đang ở chế độ kỹ thuật có dim | Vẫn tạo thêm đúng bản sản phẩm màu đỏ không dim; bản kỹ thuật và thông số nguồn còn đầy đủ |
| AI-02 | Sửa maket và lưu phiên bản mới | Ảnh đầu vào thuộc đúng phiên bản mới; bản trình bày cũ giữ nguyên |
| AI-03 | Thêm/sửa/xóa nhiều ảnh khảo sát rồi mở lại | Ảnh, thứ tự và chú thích được lưu đúng; chọn làm đầu vào phối cảnh được |
| AI-04 | Chọn bảng chính và khung cửa cùng lúc, nhập vị trí riêng | Hai sản phẩm xuất hiện ở đúng vị trí trên cùng ảnh, theo mô tả hoặc vùng đã xác định |
| AI-05 | Chọn nhiều mẫu thay thế | Chế độ phương án riêng tạo từng phương án, không chồng tất cả vào một bảng |
| AI-06 | Có logo, tên cửa hàng, số điện thoại và cây/dây điện phía trước | Chữ/logo giữ đúng thiết kế; hiện trường ngoài vùng đặt giữ nguyên; vật cản có thứ tự che khuất hợp lý |
| AI-07 | Xuất bản gửi khách theo mẫu | Có ảnh trước/sau, nhiều maket, phần đầu trang đúng dữ liệu; kích thước/vật tư lấy đúng nguồn và đọc được ở kích thước xuất |
| AI-08 | Thiếu sơ đồ kỹ thuật hoặc BOM | Không có sơ đồ/khối lượng do AI tự bịa; người dùng có thể bổ sung hoặc bỏ khối đó |
| AI-09 | Lượt AI lỗi, bấm tạo trùng hoặc mở lại trang | Có trạng thái và cách thử lại; không tạo trùng tác vụ; tải lại kết quả cũ không gọi AI |
| AI-10 | Người dùng không có quyền với dự án/ảnh/maket | Không xem, gửi AI hoặc tải được dữ liệu ngoài phạm vi được phép |
| AI-11 | Dự án chưa có maket; tải một hoặc nhiều ảnh thiết kế ngoài | Tạo phối cảnh được, có mô tả vị trí riêng từng ảnh; không bắt buộc tạo maket trong hệ thống trước |
| AI-12 | Chọn một maket trong dự án và tải thêm ảnh thiết kế ngoài | Hai nguồn dùng được trong cùng lượt tạo; mỗi mẫu được đặt theo mô tả/vùng riêng |
| AI-13 | Mở lại hoặc tạo lại phối cảnh có ảnh tải ngoài | Còn ảnh, tên và mô tả đã lưu; tải bản gửi khách được dù không có kích thước/BOM |

Chất lượng phối cảnh cần nghiệm thu bằng bộ ảnh thực tế đã thống nhất. Nếu thử nghiệm chưa đạt vị trí hoặc độ chính xác chữ/logo thì bổ sung bước đặt góc/ghép lớp trước khi phát hành.

## 8. Thứ tự triển khai ở giai đoạn sau

| Bước | Công việc | Ước lượng sơ bộ |
| --- | --- | --- |
| 1 | Thử API ảnh với dữ liệu thực, chọn cách ghép và kiểm tra nhiều maket/chữ/logo | 2–3 ngày |
| 2 | Lưu biến thể maket không dim, hoàn thiện ảnh khảo sát và liên kết đầu vào | 3–4 ngày |
| 3 | Chọn nhanh nhiều maket, tải ảnh thiết kế ngoài và kết hợp hai nguồn, mô tả/vùng đặt, tác vụ AI, lưu kết quả và lịch sử | 4–6 ngày |
| 4 | Mẫu bản gửi khách, xem trước và xuất ảnh/PDF | 3–4 ngày |
| 5 | Nghiệm thu chất lượng, quyền truy cập, lỗi và triển khai | 2–3 ngày |

Tổng dự kiến **14–20 ngày công cho một lập trình viên**, cần điều chỉnh sau bước thử nghiệm. Phát triển thêm kiểu sản phẩm mới chưa được bộ tạo maket hỗ trợ, công cụ ghép ảnh chuyên sâu hoặc nhiều mẫu trình bày riêng sẽ cần ước lượng bổ sung. Chi phí dịch vụ AI tính riêng theo model và số lượt sử dụng.

Ưu tiên hoàn thiện quyền theo dự án, luồng lưu phiên bản maket và dữ liệu khảo sát trước. Tính năng này nằm ở giai đoạn sau; ước lượng trên chưa cộng vào lịch của kế hoạch bổ sung hiện tại.

## 9. Các vị trí mã nguồn liên quan

| Vị trí | Nội dung đối chiếu |
| --- | --- |
| `src/lib/ai/gemini.ts` | Tích hợp Gemini, cấu hình khóa/model, xử lý nội dung và OCR |
| `src/app/api/ai/report-parser/route.ts` | Một luồng API AI hiện có dùng để đọc báo cáo |
| `src/app/(dashboard)/du-an/[id]/thiet-ke-quy-chuan/page.tsx` | Xuất ảnh và lưu maket theo chế độ đang hiển thị |
| `src/components/design/NipponShopCanvas.tsx` | Màu bản thiết kế, nhóm dim, khung tên và nguồn xuất bản không dim |
| `src/app/(dashboard)/khao-sat/page.tsx` | Giao diện khảo sát cần thêm ảnh hiện trường |
| `src/services/signage-phase2.service.ts` | Dữ liệu ảnh khảo sát; tạo/cập nhật khảo sát; lưu maket |
| `src/app/api/surveys/route.ts`, `src/app/api/design-proofs/route.ts` | API khảo sát và maket hiện có |
| `src/app/api/upload/route.ts` | Luồng tải tệp chung có thể dùng làm nền |

Tài liệu được lập từ yêu cầu và mã nguồn hiện tại; khả năng gọi model tạo ảnh, chất lượng ghép thực tế và chi phí sẽ được xác minh ở bước thử nghiệm.
