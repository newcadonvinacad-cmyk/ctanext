# Tích hợp chọn lọc từ Signage-ERP/developer

Mã trên máy là bản chính. Chỉ tích hợp cải tiến AI phù hợp và lỗi còn tồn tại. Không lấy thay đổi giao diện hoặc dịch vụ dự án từ nhánh từ xa.

| Commit từ xa | Nội dung | Xử lý |
| --- | --- | --- |
| `5eb085d` | Xác nhận vật tư báo thành công dù lưu thất bại | Áp dụng; thêm kiểm tra chưa chọn công việc |
| `b52e9e9` | Thiếu cột bắt buộc khi ghi sổ quỹ, nhật ký AI, cấu hình lương | Giữ sửa sổ quỹ đã có; bổ sung `requested_by` và `valid_from` |
| `27b4b04` | So khớp AI, phần trăm tiến độ, đề xuất sửa lỗi; cập nhật tiến độ dự án | Giữ cơ chế đề xuất, không tự lưu lại; loại bỏ cập nhật tiến độ cả dự án |
| `31bf712` | Commit hợp nhất lịch sử | Giữ lịch sử, không dùng để thay mã trên máy |
| `fe1eb50` | Ép kiểu tham số SQL, hydration, mở rộng AI | Áp dụng SQL còn thiếu và AI làm rõ thông tin; giữ hydration trên máy; không lấy `project_progress` |

Giữ các cải tiến AI: câu hỏi làm rõ, đối chiếu dữ liệu và quyền truy cập, sửa mô tả schema, phản hồi dự phòng có căn cứ. Khi lỗi lưu xảy ra, AI chỉ đề xuất dữ liệu sửa để người dùng xem lại. Không báo đã tự sửa thành công khi chưa lưu.

Sửa bổ sung những lỗi vẫn còn trong luồng AI: không chọn công việc hoặc dự án đầu danh sách khi không xác định được; so khớp mã theo ranh giới để tránh `TK-1` khớp `TK-10`; không gán mặc định 80%; giữ đúng 0% và phần trăm thập phân; từ chối giá trị ngoài 0–100%, nhiều mức khác nhau hoặc báo cáo chưa rõ tiến độ. Nhật ký lấy membership đang hoạt động của đúng người dùng và tổ chức.

Phiếu thu/chi sử dụng bộ cấp mã nguyên tử hiện có thay cho đếm số bản ghi, đồng thời giữ nguyên các xử lý tài chính trên máy.

## Kiểm tra đã chạy

- `npx tsc --noEmit --incremental false`
- `node tests/ai-selected-fixes.test.cjs`: tiến độ, so khớp, nhập mơ hồ, membership, không tự ghi lại sau remediation; xác nhận vật tư khi thành công/lỗi HTTP/lỗi mạng/chưa chọn công việc.
- `node tests/nippon-shop-drawing.test.cjs`: 83 bố cục, hình chữ, tỷ lệ và dim.
- `node tests/e2e/test_maquette_measured_outlines.mjs`: giao diện, dim theo hình chữ, SVG/PNG/in và lưu hình học.
- `node tests/e2e/test_maquette_project_surveys.mjs`: khảo sát đúng dự án, trường dữ liệu thực, lưu liên kết và từ chối khảo sát khác dự án.
- `node tests/e2e/test_maquette_auto_dimensions.mjs`: tự chọn mẫu theo kích thước, đầu mút dim và không cắt SVG.

Các kiểm thử AI dùng dữ liệu giả lập, không ghi nghiệp vụ vào cơ sở dữ liệu thật. Các kiểm thử biển dùng fixture khảo sát và chặn yêu cầu lưu. Chưa chạy kiểm thử ghi nghiệp vụ tài chính/lương trên cơ sở dữ liệu thật hoặc bản dựng production.

Giữ cookie, phiên đăng nhập, ảnh kết quả và tệp tạm ở máy; không đưa các tệp này vào commit mới. Hai tiện ích đăng nhập kiểm thử lấy mật khẩu qua `E2E_ADMIN_PASSWORD`, `E2E_KETOAN_PASSWORD`, `E2E_THUKHO_PASSWORD`, `E2E_DUAN_PASSWORD`, `E2E_THO_PASSWORD`.
