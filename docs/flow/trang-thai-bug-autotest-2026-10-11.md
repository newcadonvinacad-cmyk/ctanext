# Trạng thái 51 lỗi autotest

Đối chiếu code local ngày 11/10/2026, khoảng 17:29: commit `c0745c6` và các thay đổi chưa commit. Chưa xác nhận bản đang chạy trên Vercel. Code có thay đổi thêm trong lúc rà soát.

**13 mục đã sửa trong code · 23 mục mới sửa một phần · 6 mục còn lỗi · 9 mục chưa đủ bằng chứng.**

“Đã sửa trong code” áp dụng đúng phạm vi mô tả trong bảng, chưa đồng nghĩa đã PASS trên web.

| Mã | Trạng thái | Kết quả ngắn gọn |
|---|---|---|
| BUG-003 | Một phần | Đã có Phân công nhân sự vào kho; chưa có trường người phụ trách riêng trong form kho. |
| BUG-004 | Chưa xác minh | Lưu RBAC có xử lý kết thúc chờ; chưa tái hiện lỗi lần bấm đầu, chưa có bằng chứng sửa riêng. |
| BUG-006 | Đã sửa trong code | Maket trong dự án có chọn ảnh/PDF từ máy, đọc tệp và gửi khi lưu. |
| BUG-009 | Đã sửa trong code | Khảo sát trong chi tiết dự án có chọn nhiều ảnh và gửi kèm hồ sơ; không áp dụng kết luận này cho trang Khảo sát riêng. |
| BUG-012 | Còn lỗi | API vẫn tự ghi sổ nếu người lập có payment.post và không gửi trạng thái. |
| BUG-017 | Còn lỗi | Thanh toán NCC vẫn dùng cùng đường ghi sổ trực tiếp như BUG-012. |
| BUG-023 | Một phần | Ma trận đã sửa phiên ngắn thành 0 công; app cá nhân vẫn đếm phiên: tái hiện ma trận 0, app 1/26. |
| BUG-024 | Đã sửa trong code | Đã kiểm chứng: phiên cần giải trình nhưng vào đúng giờ không bị ma trận tính muộn. Chưa kết luận mọi màn hình/ca đã đồng nhất. |
| BUG-026 | Một phần | Đã định dạng hạn việc, nhưng bản sửa gọi formatVnDate ngoài phạm vi ở 4 chỗ, gây lỗi TypeScript. |
| BUG-027 | Một phần | Đổi nhãn tiến độ tổng thể và tỷ lệ việc xong; vẫn dùng nguồn/cách đếm khác nhau, chưa thống nhất toàn bộ WBS. |
| BUG-028 | Một phần | Tab Đội ngũ đã làm rõ nhãn phân công/hoàn tất; chưa có bằng chứng các số vô lý được sửa tận gốc. |
| BUG-029 | Một phần | Đã tránh hiện 0 khi đang tải; request lỗi vẫn có thể để danh sách rỗng. Chưa đối chiếu được chênh lệch 0/14. |
| BUG-030 | Một phần | Có thêm số tiền đã phân cách bên dưới; ô nhập giá vẫn là số thô. |
| BUG-031 | Một phần | Đơn giá có thêm dòng định dạng; chưa định dạng ngay trong ô nhập. |
| BUG-032 | Đã sửa trong code | Nút Tạo báo giá đã kiểm tra canCreate trước khi hiển thị. |
| BUG-033 | Một phần | Một số ngày đã đổi DD/MM/YYYY; phần ngày trong chi tiết dự án đang vướng lỗi formatVnDate. |
| BUG-034 | Đã sửa trong code | Đã bỏ mã null/undefined khi ghép tên NCC trong modal thanh toán. |
| BUG-035 | Một phần | Một số chỗ có thêm số 0; nhiều nơi vẫn dùng toLocaleDateString không cố định hai chữ số. |
| BUG-036 | Một phần | Số giai đoạn lấy từ tên thay vì chỉ số dòng; chưa sửa thứ tự sắp xếp giai đoạn. |
| BUG-037 | Chưa xác minh | Chưa xác định hồ sơ dữ liệu rác; nhãn Vẽ Maket vẫn còn. Cần đúng bản ghi/nhãn mong muốn. |
| BUG-038 | Còn lỗi | Dialog chỉ đổi tiêu đề; vẫn chưa có chọn loại khách hàng. |
| BUG-039 | Một phần | Đã giải thích nút Lập BOM và Lưu lệnh sản xuất khi thiếu dữ liệu; chưa bao phủ mọi nút disabled. |
| BUG-040 | Một phần | Bảng đã thêm khoảng đệm đáy; cần kiểm tra cuộn thực tế để xác nhận dòng cuối không bị che. |
| BUG-041 | Đã sửa trong code | Nhãn checkbox đổi từ UUID sang số thứ tự dòng. |
| BUG-042 | Chưa xác minh | Mô tả chưa chỉ rõ placeholder và màn hình; chưa đủ căn cứ xác nhận đã sửa. |
| BUG-043 | Còn lỗi | Vẫn có kích thước BOM dạng số sát đơn vị, ví dụ widthMeters + m. |
| BUG-044 | Một phần | Đã đổi nhiều màn hình sang đ; bảng lương/nhân sự vẫn có định dạng tiền trả ký hiệu ₫. |
| BUG-045 | Một phần | Đã Việt hóa Vào ca/Tan ca/Ngày vào làm; vẫn còn Net, HRM SUITE và một số check-in. |
| BUG-046 | Đã sửa trong code | Nhãn đã đổi thành Đã lên đơn bán hàng. |
| BUG-047 | Đã sửa trong code | TopBar không còn tự đưa screenCode vào breadcrumb. |
| BUG-048 | Một phần | Đã thống nhất tên Cài đặt & Phân quyền ở một số nơi; chưa thống nhất toàn bộ tên chức năng. |
| BUG-049 | Một phần | Thẻ xe đã rút ngắn tên và thêm tooltip; vẫn dùng truncate, cần kiểm tra chiều rộng thực tế. |
| BUG-050 | Một phần | Hạn mức có dòng tiền đã phân cách; ô nhập vẫn là số thô. |
| BUG-051 | Đã sửa trong code | Khóa/mở khóa tài khoản có dialog xác nhận; Hủy không gửi yêu cầu đổi trạng thái. |
| BUG-052 | Chưa xác minh | Toolbar có thay đổi bố cục; chưa kiểm tra điểm bấm/lớp che nút Thêm vật tư trên trình duyệt. |
| BUG-053 | Một phần | Toolbar đã cho xuống dòng; cần kiểm tra các kích thước màn hình để xác nhận hết chồng lấn. |
| BUG-054 | Đã sửa trong code | Đã loại giá trị object khỏi mô tả vật tư, không ghép thành [object Object]. |
| BUG-055 | Đã sửa trong code | Toast có cơ chế tự tắt tại từng thẻ và giới hạn tối đa 3 thông báo. |
| BUG-056 | Đã sửa trong code | Đã bỏ (null) ở mô tả/tên đối tác trên bảng tài chính và nội dung thanh toán mới. |
| BUG-057 | Đã sửa trong code | Đã thêm ESC cho chuông, Select và FacetFilter; chưa khẳng định mọi popover khác. |
| BUG-058 | Chưa xác minh | Chưa chỉ rõ nút và nhãn gây nhầm; không đủ căn cứ chốt đã sửa. |
| BUG-059 | Một phần | Select/FacetFilter có giới hạn chiều cao; tìm kiếm ở Select vẫn cần bật riêng, còn nhiều select thường. |
| R1 | Chưa xác minh | Chưa thấy thay đổi xử lý riêng việc lưu ma trận bị kẹt; cần phản hồi API và thời gian request. |
| R2 | Một phần | Danh sách hiện trường có khung chờ tải, nhưng bộ đếm vẫn tính từ mảng rỗng lúc đầu. |
| R3 | Một phần | Maket/ảnh khảo sát có chọn file; Tài liệu dự án vẫn ghi Tải lên nhưng form chỉ nhận URL. |
| R4 | Chưa xác minh | Ô ngày WBS có onChange, không đặt readOnly; cần tái hiện bằng trình duyệt trước khi kết luận lỗi. |
| P1 | Chưa xác minh | Tab điểm danh vẫn dùng tải dữ liệu bất đồng bộ; chưa tái hiện được lỗi chập chờn. |
| P2 | Một phần | Phiên đã đóng có giờ vào/ra; phiên đang làm vẫn bị gắn Q (quên về), chưa phản ánh đúng trạng thái đang làm. |
| P4 | Còn lỗi | Ma trận vẫn vẽ danh sách rỗng khi chưa có dữ liệu, không có trạng thái chờ riêng trong bảng. |
| P5 | Còn lỗi | Đã tái hiện: lương thời gian 0, OT 450.000đ; đọc bản đã chốt lại hiện lương thời gian 450.000đ. |
| P6 | Chưa xác minh | Chưa đo khóa sổ trên môi trường web; tốc độ test database tạm không chứng minh đã hết chậm. |

**Kiểm chứng:** bộ test sửa lỗi có sẵn đạt 8/8. Kiểm thử riêng bằng database tạm tái hiện BUG-023 (ma trận 0 / app 1), P2 (phiên đang làm hiện Q) và P5 (lương thời gian 0 bị đọc thành 450.000đ khi OT là 450.000đ). Không thay đổi database đang dùng.

**Kiểm tra TypeScript & Unit Test:** Đã chuyển `formatVnDate` ra module scope trong `du-an/[id]/page.tsx`, `npx tsc --noEmit` đạt 0 lỗi, toàn bộ 216/216 test passed (`npm test`). Các dropdown vật tư dài đã được thay bằng Searchable Select có giới hạn chiều cao và bộ lọc tìm kiếm.


