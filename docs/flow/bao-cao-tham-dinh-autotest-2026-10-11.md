# Lỗi autotest và hướng xử lý

Ưu tiên: tính công, khóa lương, tạo BOM và tổng thu dự án.

| Mã | Vấn đề / kết luận | Hướng sửa |
|---|---|---|
| BUG-005 | **Thiếu điều kiện test:** việc được giao chưa đánh dấu Hiện trường và chưa có hạn hoàn thành nên không hiện cho thợ. | Gán đúng loại việc, lịch và người thực hiện. WBS tự sinh cần phân loại việc hiện trường rõ ràng. |
| BUG-006 | **Thiếu chức năng:** maket chỉ nhận URL; hướng dẫn cho phép để trống lại không đúng. | Bổ sung tải file nếu cần; sửa hướng dẫn và kiểm tra đầu vào cho thống nhất. |
| BUG-007 | **AI kết luận sai:** đã có tạo BOM thủ công tại Định mức BOM và Khảo sát. | Sửa hướng dẫn test; phân biệt lưu BOM bóc tách với BOM đủ điều kiện sản xuất. |
| BUG-008 | **Lỗi hiển thị:** vai trò Thợ được lưu đúng nhưng bị nhận diện thành Thiết kế do trùng chữ “kỹ thuật”. | Nhận diện bằng mã vai trò, không dò từ khóa trong tên. |
| BUG-009 | **Thiếu chức năng:** form khảo sát chưa có ảnh dù backend hỗ trợ. | Thêm tải ảnh, lưu và mở lại ảnh theo đúng phiếu khảo sát. |
| BUG-010 | **Cấu hình quyền:** QLDA chưa có quyền xem tài chính dự án; quyền xem đơn bán vẫn có. | Chỉ cấp thêm quyền tài chính khi nghiệp vụ yêu cầu; kiểm tra đơn bán tại màn hình Bán hàng. |
| BUG-011 | **Thiếu kiểm soát:** cho hoàn tất dự án chưa nghiệm thu; server không kiểm tra điều kiện đóng. | Kiểm tra điều kiện hoàn tất ở server; ngoại lệ phải có quyền và lý do. |
| BUG-012 / BUG-017 | **Không khớp quy trình:** modal Gạch nợ cho người có quyền ghi sổ thu/chi trực tiếp, bỏ bước duyệt riêng. | Nếu áp dụng lập → duyệt → ghi sổ, bắt buộc kiểm tra đã duyệt trước khi ghi sổ; quy định rõ quyền ghi sổ trực tiếp. |
| BUG-013 | **Lỗi hiển thị:** mã báo giá trên form khác mã khi lưu. | Hiện “Cấp khi lưu”, sau đó dùng mã backend trả về. |
| BUG-014 | **Thiếu phân công kho:** nới quyền xem chỉ giúp đi tiếp, chưa sửa gốc. | Bổ sung UI gán nhân viên vào kho; kiểm tra lại phạm vi Được phân công. |
| BUG-015 | **Cấu hình:** hạn mức duyệt PO 100.000đ không phải lỗi code. | Thiết lập hạn mức theo người có thẩm quyền; test theo hạn mức đã chốt. |
| BUG-016 | **Đúng phân quyền:** Thủ kho không có quyền xem giá nên thấy “Bảo mật”. | Giữ nguyên hoặc cấp quyền xem giá nếu nghiệp vụ cần. |
| BUG-018 | **Lỗi nối luồng:** maket chỉ có URL thiếu khảo sát/thông số để tạo BOM. Chưa tái hiện riêng hiện tượng không gọi mạng, không báo lỗi. | Bổ sung đầu vào còn thiếu; hiển thị lỗi rõ. Kiểm tra Console/Network cho phần nút im lặng. |
| BUG-019 | **Lỗi dấu vết duyệt:** maket tự thành đã duyệt và ghi người duyệt mặc định là Admin. | Ghi đúng người duyệt; tách tải lên và duyệt hoặc chỉ cho người có quyền tạo bản đã duyệt. |
| BUG-020 | **Sai điều kiện test:** bản lương đã duyệt trước khi tạo nhân viên/OT test. Trạng thái kỳ vẫn chưa khóa thật. | Test bằng kỳ chưa có bản duyệt; xử lý lỗi khóa riêng ở dòng bổ sung dưới. |
| BUG-021 | **Lỗi trạng thái tải:** lúc chưa có dữ liệu lại hiện Nháp / 0 nhân sự. Chưa rõ vì sao phải Làm mới mới tải được. | Hiện trạng thái đang tải/lỗi tải; chưa cho duyệt khi dữ liệu chưa sẵn sàng. Kiểm tra request đầu nếu lỗi còn lặp lại. |
| BUG-022 | **Lỗi múi giờ:** giờ chấm công phụ thuộc múi giờ máy chủ, hiển thị UTC thay vì giờ Việt Nam. | Thống nhất múi giờ Việt Nam cho hiển thị, ngày công và so giờ vào ca. |
| BUG-023 | **Lỗi tính công:** phiên khoảng 7,5 giây bị cộng 0,5 công và đưa vào tính lương, trong khi ô ngày hiện “-”. | Sửa quy đổi công theo thời lượng/ca; dùng cùng kết quả cho ô ngày, tổng tháng và tính lương. |
| BUG-024 | **Lỗi cách đếm muộn:** ma trận coi cần giải trình là muộn; màn hình hôm nay dùng mốc giờ khác. | Tính muộn theo ca và múi giờ; tách giải trình khỏi muộn. Đối chiếu cùng ngày vì tổng tháng khác số hôm nay. |
| BUG-025 | **Khác nguồn OT:** ma trận lấy chấm công; tính lương mới có nhận 3 giờ từ đơn đã duyệt. Bản lương cũ không tự cập nhật. | Phân biệt OT thực tế, OT duyệt và OT đã vào lương; sửa thông báo “đã áp dụng”, tránh tính trùng. |
| Bổ sung — Tổng thu dự án | **Lỗi tổng hợp:** phiếu thu đã gạch nợ 8.250.000đ nhưng tổng thu dự án bằng 0 vì phiếu thiếu liên kết dự án. | Tổng hợp theo phân bổ thanh toán vào đơn/dự án; xử lý phiếu trả nhiều dự án, không tính trùng. |
| Bổ sung — Khóa lương | **Lỗi quy trình:** nút “Phê duyệt & Khóa sổ” chỉ duyệt; vẫn có thể duyệt lại dù UI báo đã khóa. | Thực hiện khóa thật phía server hoặc tách rõ hai thao tác; kỳ đã khóa phải từ chối duyệt lại. |
| Bổ sung — Quyền duyệt lương | **Điều kiện UI/API không khớp:** UI cho Kế toán thấy thao tác duyệt, API yêu cầu quyền duyệt riêng mà vai trò hiện chưa có. | UI kiểm tra đúng quyền `payroll.approve`; cấp quyền theo vai trò được phép duyệt. |
