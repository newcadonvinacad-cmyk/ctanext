# BÁO CÁO KIỂM THỬ E2E — TEST-E2E-01

**Môi trường:** https://ctanext.vercel.app
**Ngày thực hiện:** 11/10/2026
**Phạm vi:** Luồng Khách hàng → Báo giá → Dự án → Thi công → Thu tiền (10 bước theo kịch bản)
**Bộ dữ liệu test:** TEST-E2E-01 (dùng chung)

---

## 1. Thiết lập môi trường test

### 1.1 Tài khoản (mật khẩu chung: `Test@2026`)

| Email | Tên hiển thị | Vai trò | Hồ sơ nhân viên |
|---|---|---|---|
| qlda@signage-erp.vn | QLDA | Quản lý dự án (PROJECT_MANAGER) | NV mã "QLDA" |
| ketoan-test@signage-erp.vn | KETOAN-TEST | Kế toán (ACCOUNTANT) | NV mã "NV-KETOAN-TEST" |
| thukho-test@signage-erp.vn | THUKHO-TEST | Thủ kho (WAREHOUSE_KEEPER) | NV mã "NV-THUKHO-TEST" |
| thoxuong@signage-erp.vn | THOXUONG | Thợ (FIELD_WORKER) | NV mã "THOXUONG" |
| thothicong@signage-erp.vn | THOTHICONG | Thợ (FIELD_WORKER) | NV mã "THOTHICONG" |

Tài khoản seed có sẵn (Trần Thị Mai, Lê Hoàng Long) không bị sửa/xóa.

### 1.2 Dữ liệu test đã tạo

| Loại | Mã | Tên |
|---|---|---|
| Kho | KHO_TEST_E2E | Kho thử nghiệm E2E — TEST-E2E-01 |
| Khách hàng | KH-TEST-E2E-01 | TEST-E2E-01 Công ty kiểm thử E2E |
| Dự án (setup) | DA-202610-0003 | TEST-E2E-01 Dự án kiểm thử E2E |

### 1.3 Cấu hình quyền cho QLDA (đã xác minh)

Vai trò PROJECT_MANAGER ban đầu có **0/9 quyền phiếu kho** — đúng như cảnh báo của kế hoạch test. Đã cấp:
- Phiếu Nhập - Xuất - Chuyển (stock_document): **Xem + Tạo**, phạm vi "Được phân công"
- Tồn Kho Đa Điểm (inventory): **Xem**, phạm vi "Toàn công ty" (phạm vi "Được phân công" không có tác dụng — dropdown kho đích vẫn trống; app không có quyền warehouse.read riêng và không có phạm vi theo từng kho)

Tổng: 70/172 quyền. Đã kiểm chứng bằng cách đăng nhập QLDA lập thành công phiếu **PNK-202610-0013** (nhập kho KHO_TEST_E2E, giá trị 0đ, trạng thái "Chờ duyệt" — chưa duyệt, chưa ghi sổ).

---

## 2. Kết quả từng bước

| Bước | Người thực hiện | Nội dung | Kết quả |
|---|---|---|---|
| 1 | QLDA | Tạo báo giá cho KH-TEST-E2E-01 (2 dòng: Sắt hộp 2.970.000đ + Bản mã 1.200.000đ), gửi duyệt | ✅ Xong — **BG-202610-0021**, tổng 8.250.000đ, "Chờ phản hồi" |
| 2 | ADMIN | Kiểm tra tổng tiền, duyệt báo giá | ✅ Xong — "Khách đã chốt" (duyệt trong drawer) |
| 3 | QLDA | Khởi tạo Dự án & WBS từ báo giá | ✅ Xong — **DA-202610-0004** "Thi công biển hiệu TEST-E2E-01…", WBS tự sinh 28 việc / 7 giai đoạn, đơn bán hàng tự tạo (QLDA không xem được mã SO do thiếu quyền) |
| 4 | QLDA → THOTHICONG | Giao việc "Hàn khung sắt hộp mạ kẽm" (WBS-DA-202610-0004-3-1) cho THOTHICONG; checkpoint: thợ mở "Hiện trường 1 chạm" | ⚠️ Một phần — giao việc thành công trong WBS (trạng thái "Đang làm" 50%), nhưng **thợ thấy 0 việc** → checkpoint thất bại |
| 5 | QLDA | Tạo khảo sát + duyệt thiết kế | ⚠️ Một phần — **KS-202610-0015** đã tạo (kích thước bảng alu 3m×1,5m, chữ nổi LED 2m×0,8m + yêu cầu); không đính kèm được ảnh, không tạo được market/thiết kế |
| 6 | QLDA và các bên | Hoàn thiện BOM → mua hàng → sản xuất → giao hàng | ❌ Bị chặn — không tạo được BOM (yêu cầu market đã duyệt) |
| 7 | THOTHICONG | Nhận việc, chuyển "Đang làm", gửi báo cáo tiến độ + ảnh + vật tư | ❌ Bị chặn — phụ thuộc lỗi bước 4 |
| 8 | THOTHICONG → QLDA | Hoàn thành, gửi nghiệm thu; QLDA duyệt nghiệm thu | ❌ Bị chặn — phụ thuộc bước 7 |
| 9 | KETOAN → ADMIN → KETOAN | Lập phiếu thu → duyệt → ghi sổ | ✅ Xong — **PT-202610-0001** 8.250.000đ, vào TK MB Bank, đã gạch nợ. Lưu ý: app **không có bước ADMIN duyệt riêng** — phiếu vào sổ trực tiếp |
| 10 | QLDA | Kiểm tra công việc/nghiệm thu/thanh toán, hoàn thành dự án | ✅ Xong — DA-202610-0004 → "Hoàn tất" qua Stage Gate |

### Kiểm tra cuối luồng
- Dự án DA-202610-0004: trạng thái "Hoàn tất" ✅
- Phiếu thu PT-202610-0001: đã ghi sổ 8.250.000đ ✅
- Công nợ dự án: **0đ** ✅

---

## 3. Danh sách lỗi

### 🔴 Nghiêm trọng (chặn luồng)

**Lỗi 1 — Việc WBS không đồng bộ sang "Hiện trường 1 chạm"** (Bước 4)
Việc đã giao cho THOTHICONG (xác nhận trong WBS, đã thử đổi trạng thái sang "Đang làm") không xuất hiện ở bất kỳ danh sách nào thợ thấy được ("Hiện trường 1 chạm", "Bàn Điều Khiển 1 Chạm", "Ca Làm Hôm Nay" đều 0 việc). Đã thử workaround, kết luận lỗi hệ thống. → Chặn toàn bộ bước 7, 8.

**Lỗi 2 — Không tạo được Market/thiết kế** (Bước 5)
Dialog "Tải Market mới" chỉ có ô nhập URL (không có file input); bấm "Lưu phiên bản Market" không phản hồi. → Không tạo/duyệt được thiết kế, kéo theo nút "Lập BOM từ maket đã duyệt" bị disabled → chặn bước 6.

### 🟡 Trung bình

**Lỗi 3 — Thêm thành viên dự án bỏ qua lựa chọn vai trò** (Bước 4)
Chọn "Thợ thi công" cho THOTHICONG nhưng app tự gán "Kỹ thuật & Thiết kế"; control "Đổi vai trò trong dự án" không phản hồi.

**Lỗi 4 — Form khảo sát không có trường đính kèm ảnh** (Bước 5)
Hồ sơ khảo sát thiếu ảnh hiện trường.

**Lỗi 5 — Không có đường tạo BOM thủ công** (Bước 5→6)
"Lập BOM từ maket đã duyệt" là đường duy nhất; khi chưa có market duyệt thì không thể tiếp tục.

**Lỗi 6 — Stage Gate không chặn cứng** (Bước 10, mới phát hiện)
Cho phép chuyển dự án sang "Hoàn tất" dù còn 26/28 việc chưa xong và chưa có biên bản nghiệm thu nào — chỉ cảnh báo, không chặn.

**Lỗi 7 — QLDA thiếu quyền project_finance.read** (Bước 3)
Tab "Sổ quỹ & Thu chi" của dự án báo không có quyền; không xác nhận được đơn bán hàng tự sinh.

### 🟢 Thấp

**Lỗi 8 — Mã báo giá hiển thị trong form khác mã khi lưu** (Bước 1)
Form hiện BG-2026-599 nhưng khi lưu app sinh BG-202610-0021 — dễ nhầm khi đối chiếu.

### Ghi nhận thêm trong quá trình chuẩn bị
- PROJECT_MANAGER mặc định 0/9 quyền phiếu kho (đã cấu hình bổ sung — xem mục 1.3).
- Kho không có field "người phụ trách" — không gán được thủ kho phụ trách tường minh.
- Nút "Lưu Ma Trận Quyền" lần bấm đầu không lưu (qua automation); phải bấm trực tiếp và chờ "Đang lưu..." hoàn tất.
- Kịch bản test dự kiến bước ADMIN duyệt phiếu thu, nhưng app không có bước này — phiếu thu vào sổ trực tiếp.

---

## 4. Workaround đã thử (theo yêu cầu)

| Vấn đề | Đã thử | Kết quả |
|---|---|---|
| Việc không hiện cho thợ | Đổi trạng thái việc sang "Đang làm" 50% | Thất bại |
| Việc không hiện cho thợ | Kiểm tra "Bàn Điều Khiển 1 Chạm", "Ca Làm Hôm Nay" | Thất bại — 0 việc ở mọi nơi ("3 TÁC VỤ" là 3 bước điểm danh/ảnh GPS/ký số, không phải việc được giao) |
| Tạo market/thiết kế | Thử lại dialog, tìm chỗ upload file trong tài liệu dự án | Thất bại — dialog URL-only, không tìm thấy chỗ upload |
| BOM | Tìm đường tạo BOM thủ công | Thất bại — chỉ có "Lập BOM từ maket đã duyệt" |

---

## 5. Kết luận

Luồng E2E chạy được **6/10 bước** (1, 2, 3, 9, 10 xong; 4, 5 một phần). Hai lỗi nghiêm trọng (#1 đồng bộ hiện trường, #2 market/thiết kế) chặn các bước 6–8 và cần dev sửa mới kiểm thử tiếp được. Dữ liệu test còn nguyên vẹn, không ảnh hưởng dữ liệu thật.
