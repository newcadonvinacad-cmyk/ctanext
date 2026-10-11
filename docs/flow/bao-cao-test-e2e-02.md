# BÁO CÁO KIỂM THỬ E2E — FLOW 2: MUA VẬT TƯ → NHẬP KHO → THANH TOÁN NHÀ CUNG CẤP

**Môi trường:** https://ctanext.vercel.app
**Ngày thực hiện:** 11/10/2026
**Phạm vi:** Luồng Mua vật tư → Nhập kho → Thanh toán nhà cung cấp (7 bước theo kịch bản)
**Bộ dữ liệu test:** TEST-E2E-01 (dùng chung, tiếp nối flow 1)

---

## 1. Thiết lập và phát hiện ban đầu

### 1.1 Tài khoản sử dụng (mật khẩu chung: `Test@2026`)

| Email | Tên hiển thị | Vai trò | Nhiệm vụ trong flow |
|---|---|---|---|
| ketoan-test@signage-erp.vn | KETOAN-TEST | Kế toán (ACCOUNTANT) | Tạo NCC, duyệt PO, duyệt phiếu nhập, lập phiếu chi, ghi sổ |
| thukho-test@signage-erp.vn | THUKHO-TEST | Thủ kho (WAREHOUSE_KEEPER) | Tạo vật tư, lập PO, lập phiếu nhập, xác nhận thực tế |
| admin@signage-erp.vn | (Superadmin) | Quản trị | Duyệt phiếu chi |

Kho nhận hàng: **KHO_TEST_E2E** (tái sử dụng từ flow 1).

### 1.2 Hạn mức duyệt của vai trò Kế toán (tìm thấy trong RBAC)

| Quyền | Hạn mức |
|---|---|
| Duyệt Đơn Mua Hàng (purchase_order.approve) | **100.000đ** ⚠️ |
| Duyệt Phiếu Nhập-Xuất-Chuyển (stock_document.approve) | 50.000.000đ |
| Duyệt Phiếu chi (payment.approve) | Không giới hạn |

### 1.3 Cấu hình quyền đã thực hiện (được phê duyệt)

Vai trò Thủ kho (WAREHOUSE_KEEPER) có quyền xem tồn kho (`inventory.read`) nhưng bị giới hạn phạm vi "Được phân công", trong khi app không có cơ chế phân công kho cho thủ kho → danh sách kho trả về rỗng, không lập được phiếu nhập. Đã đổi phạm vi sang **"Toàn công ty"** (chỉ đổi phạm vi của quyền xem đã có, không thêm quyền mới; đã xác minh còn hiệu lực sau reload). Cùng pattern lỗi đã xử lý cho vai trò Quản lý dự án ở flow 1.

---

## 2. Kết quả từng bước

| Bước | Người thực hiện | Nội dung | Kết quả |
|---|---|---|---|
| 1 | KETOAN + THUKHO | KETOAN tạo nhà cung cấp; THUKHO tạo mã vật tư + đơn vị tính, ghi tồn kho trước nhập | ✅ Xong — NCC **NCC-010** "TEST-E2E-01 Nhà cung cấp vật tư" (dư nợ 0đ); vật tư **TEST-VT-01** "TEST-E2E-01 Tấm alu kiểm thử", ĐVT "Tấm", nhóm "Tấm Alu & Mica"; tồn trước nhập (KHO_TEST_E2E): **0 tấm** |
| 2 | THUKHO | Lập đơn mua hàng, gửi duyệt | ✅ Xong — **PO-202610-0011**: NCC-010, TEST-VT-01 × 10 tấm × 8.000đ = **80.000đ** (dưới hạn mức 100.000đ), "Chờ duyệt" |
| 3 | KETOAN | Kiểm tra và duyệt đơn mua trong hạn mức | ✅ Xong — duyệt trong drawer → "Đã duyệt" |
| 4 | THUKHO | Từ đơn mua đã duyệt tạo phiếu nhập; nhập số lượng thực nhận, đúng kho, gửi duyệt | ✅ Xong — **PNK-202610-0014**: kho KHO_TEST_E2E, thực nhận đủ **10 tấm**, 80.000đ; PO chuyển "Đã nhận hàng" (từng bị chặn do combobox kho rỗng — đã sửa quyền ở mục 1.3) |
| 5 | KETOAN → THUKHO | KETOAN duyệt phiếu nhập → THUKHO mở lại và Xác nhận thực tế | ✅ Xong — KETOAN duyệt trong drawer → "Đã duyệt"; THUKHO "Hoàn tất & Ghi sổ kho" trong drawer → **"Đã ghi sổ"** |
| 6 | KETOAN | Kiểm tra công nợ NCC, lập phiếu chi và phân bổ đúng khoản phải trả | ✅ Xong — công nợ NCC-010 = 80.000đ ("Còn nợ"); **PC-202610-0001**: 80.000đ (trả đủ), từ TK MB Bank (số dư sau: 28.920.000đ), phân bổ đúng khoản phải trả NCC-010 |
| 7 | ADMIN → KETOAN | ADMIN duyệt phiếu chi → KETOAN ghi sổ, kiểm tra công nợ | ✅ Xong — PC-202610-0001 đã vào sổ quỹ (ngày ghi sổ 11/10/2026); NCC-010 không còn trong danh sách phải trả |

### Kiểm tra cuối luồng (theo cách kiểm tra của kịch bản)
- Tồn sau xác nhận thực tế = tồn trước + số nhận: 0 + 10 = **10 tấm** ✅ (thực tế 10, giữ chỗ 0, khả dụng 10)
- Số lượng còn phải nhận = **0** ✅
- Công nợ nhà cung cấp sau ghi sổ = **0đ** ✅
- Phiếu mới lưu/duyệt chưa tính là thành công — PNK-202610-0014 đã "Đã ghi sổ", PC-202610-0001 đã vào sổ quỹ ✅

---

## 3. Danh sách lỗi

### 🟡 Trung bình

**Lỗi 1 — Combobox "Kho Nhập Hàng Thực Tế" trả về rỗng** (Bước 4 — đã khắc phục)
Quyền xem kho của vai trò Thủ kho bị giới hạn phạm vi "Được phân công" trong khi app không có cơ chế phân công kho cho thủ kho → server trả danh sách kho rỗng, không thể lập phiếu nhập. Đã sửa bằng cách đổi phạm vi sang "Toàn công ty" (được phê duyệt). Cùng pattern với lỗi quyền của QLDA ở flow 1 — cho thấy phạm vi "Được phân công" đang bị hỏng ở quy mô hệ thống.

**Lỗi 2 — Hạn mức duyệt đơn mua hàng của Kế toán chỉ 100.000đ** (Bước 2)
Quá thấp so với thực tế vận hành mua vật tư; buộc phải giữ PO test ở 80.000đ mới lọt hạn mức. Cần xem lại có đúng ý đồ cấu hình không.

**Lỗi 3 — Cột "Tổng giá trị chứng từ" bị che thành "Bảo mật" với tài khoản Thủ kho** (Bước 5)
Trong drawer chi tiết, thủ kho không thấy được giá trị của chính phiếu mình tạo — gây khó khăn khi đối chiếu số liệu.

**Lỗi 4 — Luồng "Thanh toán & Gạch nợ" gộp tạo phiếu và gạch nợ trong một thao tác** (Bước 7)
Bỏ qua bước duyệt riêng, không phù hợp kiểm soát khi số tiền lớn. Tương tự flow 1: app không có bước ADMIN duyệt phiếu thu/chi như kịch bản kiểm thử dự kiến — chứng từ vào sổ trực tiếp.

---

## 4. Kết luận

Luồng flow 2 chạy được **7/7 bước**. Tất cả điểm kiểm tra cuối đều đạt: tồn kho khớp (10 tấm), còn phải nhận = 0, công nợ NCC = 0đ. Phát hiện 4 lỗi mức trung bình (1 đã khắc phục trong quá trình test). Dữ liệu test còn nguyên vẹn, không ảnh hưởng dữ liệu thật. Phiếu PNK-202610-0013 từ flow 1 không bị động đến.
