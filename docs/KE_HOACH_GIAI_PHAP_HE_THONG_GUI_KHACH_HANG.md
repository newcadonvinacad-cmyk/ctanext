# ĐẶC TẢ GIẢI PHÁP TỔNG THỂ HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP
## HỆ THỐNG ERP CHUYÊN NGÀNH SẢN XUẤT - THI CÔNG & TRỢ LÝ TRÍ TUỆ NHÂN TẠO (AI)

> **Ghi chú tài liệu:** Văn bản này chuẩn hóa phạm vi nghiệp vụ và đặc tả giải pháp chức năng cho toàn bộ hệ thống. Các thông số chi tiết về danh mục vật tư, ma trận phân quyền và biểu mẫu in ấn sẽ được cập nhật chính xác theo dữ liệu khảo sát từ Quý doanh nghiệp.

---

## PHÂN HỆ 1: QUẢN TRỊ KHO, VẬT TƯ & MUA - BÁN HÀNG
*(Inventory, Materials & Procurement Management)*

### 1.1. Phạm vi & Mục tiêu Nghiệp vụ
*   Quản lý tập trung hệ thống đa kho với các tính chất vận hành khác nhau: Kho sản xuất, Kho phân phối, Kho vật tư kim khí/điện tử, Kho lưu động trên phương tiện vận chuyển...
*   Liên kết khép kín giữa quy trình Mua hàng từ Nhà cung cấp, Xuất kho phục vụ Sản xuất/Thi công và Điều chuyển nội bộ giữa các điểm kho.
*   Thiết lập quy trình kiểm soát và phê duyệt chứng từ chặt chẽ trước khi phát sinh biến động tồn kho thực tế.
*   Tự động hóa kết xuất các chứng từ kho và báo cáo Nhập - Xuất - Tồn theo các định dạng tiêu chuẩn (PDF in ấn, Excel đối soát).

### 1.2. Đặc tả Giải pháp & Chức năng Chi tiết
*   **Quản lý Danh mục Vật tư & Quy cách Quy đổi:**
    *   Chuẩn hóa danh mục vật tư, quy cách đóng gói và hệ thống mã định danh (Mã vật tư/SKU).
    *   Hỗ trợ hệ số quy đổi đơn vị tính linh hoạt (Ví dụ: Mua theo cây 6m / cuộn / thùng $\rightarrow$ Xuất kho theo mét / tấm / tuýp / chiếc).
*   **Quản trị Hệ thống Đa kho Độc lập:**
    *   Theo dõi tồn kho thực tế và tồn kho khả dụng tức thời tại từng vị trí kho: Kho xưởng sản xuất, Kho phân phối, Kho vật liệu thô, Kho phương tiện vận chuyển.
    *   Quản lý vị trí lưu trữ và cảnh báo hạn mức tồn kho tối thiểu.
*   **Nghiệp vụ Mua hàng & Nhập kho (Procurement & Inward):**
    *   Lập và quản lý Đơn mua hàng (Purchase Order - PO) gửi Nhà cung cấp.
    *   Khởi tạo Phiếu nhập kho khi hàng về xưởng; hỗ trợ đối soát sai lệch giữa số lượng trên đơn đặt hàng và số lượng thực nhận tại kho.
*   **Nghiệp vụ Xuất kho (Outward Operations):**
    *   Xuất kho vật tư theo Lệnh sản xuất của từng dự án.
    *   Xuất kho thiết bị, vật tư phụ phục vụ công tác lắp đặt tại công trình.
    *   Xuất kho điều chuyển nội bộ giữa các điểm kho (Kho phân phối $\leftrightarrow$ Kho xưởng $\leftrightarrow$ Kho xe tải).
*   **Cơ chế Phê duyệt Chứng từ Kho (Approval Flow):**
    *   Thiết lập luồng duyệt đa tầng: Người lập phiếu đề xuất $\rightarrow$ Cấp thẩm quyền phê duyệt $\rightarrow$ Thủ kho xác nhận xuất/nhập thực tế $\rightarrow$ Hệ thống tự động ghi nhận biến động tồn kho.
*   **Kết xuất Chứng từ & Báo cáo Đa định dạng:**
    *   Hệ thống sinh tự động các mẫu in PDF tiêu chuẩn (tích hợp logo, mã chứng từ, bảng chi tiết hàng hóa, các trường ký duyệt: Người lập, Thủ kho, Kế toán, Người nhận).
    *   Kết xuất báo cáo Excel toàn diện: Báo cáo Nhập - Xuất - Tồn, Báo cáo Thẻ kho, Bảng kê chi tiết xuất/nhập theo khoảng thời gian tùy chọn.

---

## PHÂN HỆ 2: QUẢN TRỊ DỰ ÁN & ĐIỀU ĐỘ CÔNG VIỆC
*(Project & Work Breakdown Management)*

### 2.1. Phạm vi & Mục tiêu Nghiệp vụ
*   Quản trị tiến độ sản xuất và thi công theo mô hình Dự án độc lập.
*   Chuẩn hóa cấu trúc công việc theo các Giai đoạn (Công đoạn) và Đầu mục công việc.
*   Phân bổ nhân sự đa nhiệm: Một nhân viên có thể tham gia vào nhiều đầu mục và nhiều giai đoạn khác nhau trong một hoặc nhiều dự án.
*   **Cơ chế quan hệ Cha - Con linh hoạt (Parent - Child Tasks):** Hỗ trợ báo cáo tiến độ trực tiếp trên Đầu mục công việc (Task cha), đồng thời cho phép tạo các Công việc con (Sub-tasks) và lập báo cáo độc lập trên từng task con.
*   **Biểu mẫu báo cáo tùy chỉnh động (Dynamic Role & Task-based Forms):** Tùy biến cấu trúc và các trường nhập liệu báo cáo theo đúng Vai trò (Role) của người thực hiện và tính chất chuyên môn của từng Đầu việc (đã xác nhận từ phía khách hàng).
*   Thu thập báo cáo tiến độ hàng ngày (Daily Reports) gắn liền với từng đầu việc để đo lường hiệu suất.

### 2.2. Đặc tả Giải pháp & Chức năng Chi tiết
*   **Cấu trúc Phân rã Công việc & Quan hệ Cha - Con (Hierarchical Task Breakdown):**
    $$\text{Dự án} \longrightarrow \text{Giai đoạn} \longrightarrow \text{Đầu mục công việc (Task cha)} \underset{\text{Tùy chọn}}{\overset{\text{Phân rã}}{\rightleftarrows}} \text{Công việc con (Sub-tasks)}$$
    *   *Tính năng báo cáo kép linh hoạt (Xác nhận từ khách hàng):*
        1. **Báo cáo trực tiếp tại Task cha:** Đối với các công việc gọn nhẹ hoặc do 1 người/1 nhóm chịu trách nhiệm trọn gói, nhân sự có thể nộp báo cáo tiến độ, tải ảnh minh chứng và ghi nhận vật tư trực tiếp trên Task cha mà không bắt buộc phải tạo việc con.
        2. **Phân rã Task con & Báo cáo độc lập:** Đối với các đầu việc lớn hoặc phức tạp cần chia nhỏ cho nhiều thợ/khâu (ví dụ: Đầu việc *Gia công mặt tiền* chia thành các việc con: *Hàn khung sắt*, *Đi dây nguồn LED*, *Ốp alu*), người phụ trách có thể tạo các Task con, gán cho từng thợ riêng biệt. Từng thợ vào nhận việc và gửi báo cáo độc lập theo task con của mình. Tiến độ của Task cha được tự động tổng hợp hoặc phản ánh theo các task con.
    *   *Thư viện Mẫu Dự án (Project Templates):* Hỗ trợ tạo sẵn các bộ quy trình mẫu theo từng dòng sản phẩm chuẩn. Khi có dự án mới, hệ thống tự động nhân bản toàn bộ quy trình giai đoạn và đầu mục từ mẫu có sẵn.
*   **Biểu Mẫu Báo Cáo Tùy Biến Theo Role & Đầu Việc (Dynamic Report Forms):**
    *   *Khắc phục nhược điểm form cứng:* Hệ thống loại bỏ hoàn toàn biểu mẫu báo cáo cứng nhắc, thiết lập cơ chế tùy chỉnh linh hoạt dựa trên 2 yếu tố then chốt:
        1. **Tùy biến theo Vai trò (Role-based):**
           - *Thợ hiện trường:* Form báo cáo ưu tiên chụp ảnh đóng dấu GPS, mốc giờ check-in/out, chữ ký nghiệm thu của khách hàng, vật tư mua ngoài phát sinh.
           - *Thợ xưởng sản xuất:* Form tập trung vào số lượng sản phẩm hoàn thành, chỉ số hao hụt vật tư (tấm alu, thanh nhôm, cuộn bạt), tình trạng máy gia công.
           - *Lái xe vận chuyển:* Form bao gồm tình trạng giao nhận hàng hóa, chi phí cầu đường, vé bến bãi, nhiên liệu.
           - *Quản lý / Điều phối:* Form đánh giá tiến độ tổng thể, rủi ro công trình và đề xuất bổ sung nhân lực.
        2. **Tùy biến theo Tính chất Đầu việc (Task-based):**
           - *Khảo sát hiện trạng:* Bắt buộc có các trường kích thước đo đạc, góc chụp hiện trạng toàn cảnh/cận cảnh, độ cao thi công, chất liệu bề mặt tường/kết cấu.
           - *Gia công cơ khí - hàn khung:* Trường số mét sắt tiêu hao, loại que hàn/khí, độ dày kết cấu.
           - *Đấu nối điện - LED:* Trường công suất bộ nguồn (W/A), số lượng bóng LED, giải pháp chống nước, chống chập cháy.
*   **Điều phối Nhân sự & Ma trận Phân công:**
    *   Phân công một hoặc nhiều nhân sự vào từng đầu mục công việc cụ thể.
    *   Hệ thống kiểm soát tải công việc (Workload): Hiển thị trạng thái phân bổ nhân sự, hỗ trợ cấp điều phối bố trí nguồn lực hợp lý.
*   **Cơ chế Tạo việc & Tự quản lý Công việc:**
    *   *Cấp điều phối:* Tạo các đầu mục lớn, chỉ định người phụ trách chính, đặt thời hạn hoàn thành (Deadline) và tiêu chuẩn kỹ thuật.
    *   *Nhân sự thực hiện:* Chủ động tạo các việc con (Sub-tasks) nằm trong đầu mục được giao để phân chia nhiệm vụ và cập nhật tiến độ thực tế theo ngày.
    *   *Công việc phát sinh:* Hỗ trợ nhân sự khởi tạo các đầu việc phát sinh ngoài kế hoạch (kèm mô tả và ảnh minh chứng) để người điều phối kiểm duyệt.
*   **Bảng Điều khiển (Dashboard) Giám sát Tiến độ:**
    *   Giao diện trực quan cập nhật trạng thái các dự án theo thời gian thực (Đúng tiến độ, Cảnh báo trễ, Chậm tiến độ).
    *   Bộ lọc đa tiêu chí: Lọc theo nhân sự, theo khoảng thời gian, theo phòng ban/tổ nhóm.
    *   Thống kê định lượng: Tỷ lệ hoàn thành công việc, số lượng việc đúng hạn/trễ hạn làm cơ sở đánh giá năng suất.

---

## PHÂN HỆ 3: TÁC NGHIỆP HIỆN TRƯỜNG & VẬN CHUYỂN
*(Field Operations & Logistics)*

### 3.1. Phạm vi & Mục tiêu Nghiệp vụ
*   Quản lý toàn diện các hoạt động bên ngoài xưởng: Khảo sát hiện trạng mặt bằng, Vận chuyển hàng hóa (đội ngũ lái xe), Thi công lắp đặt hoàn thiện.
*   Thu thập dữ liệu xác thực thực tế: Tọa độ địa lý (GPS), thời gian có mặt thực tế, album ảnh bằng chứng thi công và chữ ký xác nhận của khách hàng.
*   Lưu trữ dữ liệu nhật ký (Metadata) phục vụ công tác chấm công, nghiệm thu công trình và đánh giá hiệu suất.

### 3.2. Đặc tả Giải pháp & Chức năng Chi tiết
*   **Giao diện Tác nghiệp Di động (Mobile-optimized):**
    *   Giao diện tối ưu hóa cho trình duyệt di động, giúp nhân sự thao tác trực tiếp tại công trình nhanh chóng, thuận tiện.
*   **Xác thực Điểm danh Định vị Vệ tinh (GPS Check-in / Check-out):**
    *   Ghi nhận chính xác mốc thời gian bắt đầu (Check-in) và kết thúc (Check-out) ca làm việc tại địa chỉ công trình.
    *   Đối soát tọa độ vị trí thực tế của thiết bị với tọa độ công trình đã đăng ký; yêu cầu chụp ảnh xác thực có đóng dấu chìm (Watermark): Thời gian thực, địa chỉ và tọa độ GPS.
*   **Quản trị Bằng chứng Nghiệm thu Đa giai đoạn:**
    *   Lưu trữ album hình ảnh công trình theo tiến trình chuẩn: Hiện trạng mặt bằng khảo sát $\rightarrow$ Kết cấu gia cố bên trong $\rightarrow$ Hoàn thiện thẩm mỹ ban ngày $\rightarrow$ Vận hành chiếu sáng ban đêm.
    *   Dữ liệu ảnh được gắn trực tiếp vào hồ sơ lưu trữ của dự án tương ứng.
*   **Số hóa Nghiệm thu với Chữ ký Điện tử (Digital Signature):**
    *   Khách hàng tại công trình thực hiện ký xác nhận trực tiếp trên màn hình cảm ứng của nhân viên sau khi hoàn tất kiểm tra.
    *   Hệ thống lập tức khởi tạo **Biên bản Bàn giao & Nghiệm thu điện tử (PDF)** đầy đủ chữ ký số và hình ảnh hoàn thiện, làm căn cứ bàn giao và kích hoạt thanh toán.
*   **Điều phối Phương tiện & Lịch trình Vận chuyển:**
    *   Phát hành Lệnh điều xe: Gán thông tin tài xế, phương tiện, danh mục hàng hóa và lộ trình giao hàng từ xưởng ra công trình.
    *   Ghi nhận trạng thái giao nhận và các khoản chi phí phát sinh thực tế (vé cầu đường, nhiên liệu, chi phí cẩu nâng...).

---

## PHÂN HỆ 4: QUẢN TRỊ NHÂN SỰ & CHẤM CÔNG CƠ BẢN
*(Human Resource Management - HRM)*

### 4.1. Phạm vi & Mục tiêu Nghiệp vụ
*   Quản lý tập trung hồ sơ nhân sự theo các khối chuyên môn: Khối Văn phòng, Khối Sản xuất tại xưởng, Khối Thi công hiện trường, Đội ngũ Lái xe.
*   Thiết lập cơ chế chấm công tích hợp đa nguồn, ghi nhận trung thực thời gian làm việc của nhân sự cố định và nhân sự lưu động.
*   Cung cấp cơ sở dữ liệu định lượng phục vụ công tác tính lương và đánh giá hiệu suất.

### 4.2. Đặc tả Giải pháp & Chức năng Chi tiết
*   **Hồ sơ Nhân sự & Tổ chức Bộ máy:**
    *   Quản lý thông tin định danh, chức danh chuyên môn, phòng ban, thông tin hợp đồng và liên hệ.
*   **Chấm công Tích hợp Đa nguồn:**
    *   Tổng hợp dữ liệu chấm công tại xưởng kết hợp với dữ liệu Check-in/out định vị GPS ngoài hiện trường theo từng nhiệm vụ được giao.
    *   Theo dõi và tổng hợp số giờ làm việc thực tế, thời gian tăng ca (Overtime), số ngày công chuẩn trong kỳ tính lương.
*   **Dữ liệu Nền tảng Tính lương & Đãi ngộ:**
    *   Tổng hợp các thông số cấu thành thu nhập: Ngày công thực tế, phụ cấp công tác công trình, phụ cấp chuyến xe của tài xế... sẵn sàng kết nối sang bảng lương.

---

## PHÂN HỆ 5: TRÍ TUỆ NHÂN TẠO TRONG TỰ ĐỘNG HÓA VẬN HÀNH
*(Artificial Intelligence - AI Engines)*

### 5.1. Kiến trúc Tích hợp AI (Architecture & Data Protocol)
*   **Phương thức giao tiếp:** Toàn bộ các mô-đun AI được thiết lập dưới dạng các **Dịch vụ AI Độc lập (AI Microservices)**, giao tiếp với hệ thống chính qua **REST API** và trao đổi dữ liệu hoàn toàn bằng cấu trúc **JSON chuẩn hóa**.
*   **Nguyên tắc vận hành:** Đảm bảo tính toàn vẹn dữ liệu phần mềm, loại bỏ sai số thông qua cơ chế kiểm soát và xác nhận của người dùng (Human-in-the-loop).

---

### 5.2. Trợ lý AI Xử lý Báo cáo Công việc Hàng ngày (Daily Report Assistant)
*   **Mục tiêu:** Đơn giản hóa việc lập báo cáo cuối ngày của nhân sự sản xuất và hiện trường, giảm thiểu thời gian nhập liệu thủ công.
*   **Khả năng thích ứng Form động & Quan hệ Cha - Con (Xác nhận từ khách hàng):**
    *   AI tự động nhận biết **Vai trò (Role)** của nhân sự đang báo cáo và **Vị trí công việc (Task cha hay Task con)** trong cây dự án.
    *   Tự động map dữ liệu bóc tách được từ văn bản/giọng nói vào đúng các trường của **Biểu mẫu tùy chỉnh tương ứng** (ví dụ: bóc tách chi phí cầu đường/xăng nếu là lái xe; bóc tách ảnh GPS, chữ ký nghiệm thu và vật tư mua ngoài nếu là thợ hiện trường; bóc tách số lượng sản phẩm và hao phí alu/sắt nếu là thợ xưởng).
*   **Cơ chế vận hành:** Cung cấp 2 phương thức nhập liệu song song:
    1. *Phương thức Form chuẩn:* Nhân sự lựa chọn đầu việc (hoặc task con) cụ thể và điền thông tin vào các trường theo form tùy biến định sẵn.
    2. *Phương thức Xử lý Văn bản Tự nhiên (Natural Language Processing):* Nhân sự nhập text hoặc nói một câu bằng ngôn ngữ giao tiếp hàng ngày.
       * *Ví dụ (Thợ hiện trường):* `"Hôm nay hoàn thành ốp alu mặt tiền showroom, phát sinh 2 tuýp keo và 50 con vít tự khoan, mai cần thuê xe cẩu để gác khung."`
       * *Ví dụ (Thợ xưởng báo cáo Task con):* `"Task hàn khung sắt đã xong 100%, tiêu hao 4 cây sắt hộp 3x6 mạ kẽm, chuyển giao cho tổ sơn."`
*   **Luồng xử lý của AI:**
    *   Tiếp nhận câu nói $\rightarrow$ Phân tích ngữ nghĩa $\rightarrow$ Bóc tách thành dữ liệu JSON cấu trúc chuẩn theo đúng biểu mẫu của role và đầu việc:
        *   *Hạng mục thực hiện:* Ốp alu mặt tiền (Tiến độ: 100%).
        *   *Vật tư phát sinh:* 2 tuýp keo, 50 con vít tự khoan.
        *   *Đề xuất & Kế hoạch:* Thuê xe cẩu gác khung vào ngày mai.
*   **Cơ chế Tương tác Làm rõ (Clarification Loop):** Khi thông tin đầu vào thiếu các trường dữ liệu quan trọng hoặc chưa rõ nghĩa, AI tự động phản hồi yêu cầu bổ sung bằng các câu hỏi gợi ý hoặc lựa chọn trắc nghiệm trên giao diện trước khi ghi nhận báo cáo vào hệ thống.

---

### 5.3. Trợ lý AI Số hóa Hóa đơn & Tạo Đơn Mua Hàng Tự động (Invoice OCR Agent)
*   **Mục tiêu:** Tự động hóa quá trình nhập liệu các hóa đơn, phiếu mua vật tư phát sinh ngoài thị trường.
*   **Quy trình xử lý:**
    1. Nhân sự chụp ảnh hóa đơn bán lẻ hoặc phiếu xuất xưởng (bao gồm cả hóa đơn viết tay bằng giấy than từ các đại lý cung ứng).
    2. Ảnh chụp được truyền qua API đến AI Agent xử lý thị giác đa phương thức (Multimodal Vision Engine).
    3. AI tự động trích xuất các trường dữ liệu: Tên đơn vị cung cấp, ngày mua, bảng chi tiết mặt hàng, số lượng, đơn giá và tổng giá trị thanh toán.
    4. Hệ thống thực hiện thuật toán so khớp tên mặt hàng với Danh mục Vật tư chuẩn trong kho để khởi tạo **Phiếu Mua Hàng Nháp (Draft PO)**.
    5. **Xác nhận Kiểm soát (Verification Step):** Hệ thống hiển thị ảnh chụp gốc song song với bảng dữ liệu do AI bóc tách để người phụ trách kiểm tra, hiệu chỉnh (nếu có sai lệch) và bấm nút xác nhận nhập kho chính thức.

---

### 5.4. Trợ lý AI Phân tích Hiệu suất & Hỗ trợ Quyết định Lương (Performance Analytics)
*   **Mục tiêu:** Cung cấp báo cáo phân tích khách quan, đa chiều về năng suất lao động làm cơ sở cho Ban Lãnh đạo đánh giá nhân sự và quyết định lương thưởng.
*   **Quy trình phân tích dữ liệu định kỳ:**
    *   Hệ thống tổng hợp kho dữ liệu vận hành trong tháng:
        *   Toàn bộ báo cáo công việc hàng ngày (Daily reports).
        *   Nhật ký dữ liệu hệ thống (Metadata): Thời gian làm việc thực tế từ GPS, tỷ lệ hoàn thành công việc đúng hạn, tỷ lệ công việc phải sửa chữa lại.
        *   Bằng chứng thi công và đánh giá nghiệm thu từ phía khách hàng.
    *   Dữ liệu được gửi qua API đến AI Agent để thực hiện mô hình chấm điểm và phân tích năng lực:
        *   Tính toán điểm số định lượng về khối lượng và chất lượng công việc.
        *   Tổng hợp các điểm mạnh nổi bật và các tồn tại cần khắc phục của từng nhân sự.
        *   Đề xuất phân loại hiệu suất công việc (KPI).
*   **Nguyên tắc Phê duyệt:** Kết quả phân tích của AI đóng vai trò là tài liệu tham mưu khách quan; **Cấp quản lý và Ban Giám Đốc luôn là người xem xét, hiệu chỉnh và ký duyệt quyết định lương thưởng cuối cùng**.

---

## TỔNG KẾT MA TRẬN PHÂN HỆ CHỨC NĂNG

| Phân hệ | Thành phần Nghiệp vụ Chính | Công nghệ / Ứng dụng Hỗ trợ |
| :--- | :--- | :--- |
| **1. Quản trị Kho & Vật tư** | Đa kho, Đơn vị quy đổi, Nhập/Xuất/Chuyển kho, Xét duyệt phiếu, Mẫu in PDF/Excel. | Tự động sinh chứng từ PDF/Excel chuẩn in. |
| **2. Quản trị Dự án** | Mẫu dự án, Cấu trúc WBS quan hệ Cha - Con, Báo cáo linh hoạt tại Task cha hoặc Task con, Form tùy biến theo Role & Đầu việc, Phân công nhân sự, Dashboard lọc tiến độ. | Cây công việc phân cấp đa tầng, Biểu mẫu báo cáo động theo vai trò. |
| **3. Tác nghiệp Hiện trường** | Khảo sát, Thi công lắp đặt, Lái xe, Check-in GPS, Ảnh bằng chứng, Ký số nghiệm thu. | Định vị vệ tinh (GPS), Chữ ký số trên thiết bị di động. |
| **4. Nhân sự & Chấm công** | Hồ sơ nhân sự phân nhóm, Chấm công tích hợp xưởng + hiện trường, Dữ liệu tính lương. | Cơ chế tổng hợp ngày công đa nguồn. |
| **5. Trí tuệ Nhân tạo (AI)** | Giao tiếp qua chuẩn API và định dạng JSON. | Xử lý ngôn ngữ tự nhiên (Báo cáo thích ứng form động theo Role & Đầu việc), Thị giác máy tính (OCR Hóa đơn), Phân tích dữ liệu lớn (Đánh giá hiệu suất). |
