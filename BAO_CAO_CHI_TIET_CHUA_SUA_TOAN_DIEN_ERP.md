# BÁO CÁO TOÀN DIỆN HIỆN TRẠNG KỸ THUẬT CHƯA SỬA & RÀ SOÁT LỖI 20 PHÂN HỆ SIGNAGE ERP
> **Mã tài liệu:** `QA-AUDIT-UNFIXED-FULL-ERP-2026-003`  
> **Ngày rà soát:** 10/10/2026  
> **Phạm vi kiểm thử:** Xuyên suốt Giao diện (UI Components/Modals/Drawers) → API Route Handlers → Cơ sở dữ liệu (PostgreSQL Schema & Constraints) trên toàn bộ 20 phân hệ của hệ thống Signage ERP.  
> **Nguyên tắc kiểm thử:**
> 1. Dùng database thử cô lập (PGlite isolated WASM memory) cho thao tác ghi; database production chỉ kiểm tra đọc.
> 2. Đối chiếu 100% câu truy vấn với cấu trúc schema thực tế (89 bảng `erp`, 11 bảng `iam`).
> 3. Tái hiện lỗi, xác định nguyên nhân gốc rễ, rà soát ma trận quyền RBAC, kiểm tra rò rỉ phân quyền.
> 4. Chạy `npm run check` để xác minh tính toàn vẹn của mã nguồn và các bài test chống tái phát.
> 5. **Không kết luận toàn phân hệ đạt nếu chưa thử thực tế trên trình duyệt.**

---

## MỤC LỤC TỔNG QUAN 20 PHÂN HỆ
- [1. Phân hệ Vật tư & Quy cách — Định mức BOM](#1-phân-hệ-vật-tư--quy-cách--định-mức-bom)
- [2. Phân hệ Quản trị kho — Tồn kho, Vị trí, Kiểm kê](#2-phân-hệ-quản-trị-kho--tồn-kho-vị-trí-kiểm-kê)
- [3. Phân hệ Phiếu nhập – xuất – chuyển kho](#3-phân-hệ-phiếu-nhập--xuất--chuyển-kho)
- [4. Phân hệ Khách hàng & Công nợ](#4-phân-hệ-khách-hàng--công-nợ)
- [5. Phân hệ Nhà cung cấp & Công nợ](#5-phân-hệ-nhà-cung-cấp--công-nợ)
- [6. Phân hệ Mua hàng — Đơn PO & Nhận hàng](#6-phân-hệ-mua-hàng--đơn-po--nhận-hàng)
- [7. Phân hệ Khảo sát mặt bằng hiện trường](#7-phân-hệ-khảo-sát-mặt-bằng-hiện-trường)
- [8. Phân hệ Thiết kế chuẩn Nippon Paint (Shop Drawing Engine)](#8-phân-hệ-thiết-kế-chuẩn-nippon-paint)
- [9. Phân hệ Báo giá & Dự toán](#9-phân-hệ-báo-giá--dự-toán)
- [10. Phân hệ Bán hàng thương mại](#10-phân-hệ-bán-hàng-thương-mại)
- [11. Phân hệ Dự án & Tiến độ — Hợp đồng, Thành viên, Tài liệu, Nghiệm thu](#11-phân-hệ-dự-án--tiến-độ)
- [12. Phân hệ Điều phối công việc — Giao việc, Tiến độ, Báo cáo](#12-phân-hệ-điều-phối-công-việc)
- [13. Phân hệ Sản xuất — Lệnh sản xuất, Vật tư, QC, Thành phẩm](#13-phân-hệ-sản-xuất)
- [14. Phân hệ Tác nghiệp hiện trường — GPS, Hình ảnh, Báo cáo giọng nói](#14-phân-hệ-tác-nghiệp-hiện-trường)
- [15. Phân hệ Bảo hành & Sửa chữa](#15-phân-hệ-bảo-hành--sửa-chữa)
- [16. Phân hệ Tài chính & Sổ quỹ — Thu chi, Duyệt, Công nợ, Đảo phiếu](#16-phân-hệ-tài-chính--sổ-quỹ)
- [17. Phân hệ Nhân sự & Tiền lương — Hồ sơ, Chấm công phiên, Ca/Lễ, Nghỉ phép, Tính lương](#17-phân-hệ-nhân-sự--tiền-lương)
- [18. Phân hệ Đội xe & Vận chuyển — Import GPS Bình Minh, Điều xe, Tăng ca, Chi phí](#18-phân-hệ-đội-xe--vận-chuyển)
- [19. Phân hệ Tài liệu nội bộ & Drive](#19-phân-hệ-tài-liệu-nội-bộ--drive)
- [20. Phân hệ Người dùng, Vai trò & Phân quyền (IAM/RBAC)](#20-phân-hệ-người-dùng-vai-trò--phân-quyền)
- [21. Bảng tổng hợp các lỗi và bất cập kỹ thuật CHƯA SỬA (Defect Backlog)](#21-bảng-tổng-hợp-các-lỗi-chưa-sửa-defect-backlog)
- [22. Kết quả kiểm thử tự động `npm run check`](#22-kết-quả-kiểm-thử-tự-động-npm-run-check)
- [23. Phân định ranh giới & Khuyến cáo nghiệm thu](#23-phân-định-ranh-giới--khuyến-cáo-nghiệm-thu)

---

## 1. PHÂN HỆ VẬT TƯ & QUY CÁCH — ĐỊNH MỨC BOM
- **Tập tin liên quan:** `src/app/(dashboard)/vat-tu/page.tsx`, `src/components/vat-tu/ItemModal.tsx`, `src/components/vat-tu/BomTab.tsx`, `src/services/inventory.service.ts`, `src/services/production-bom.service.ts`.
- **API Endpoints:** `GET/POST /api/inventory/items`, `GET/PUT/DELETE /api/inventory/items/[id]`, `POST /api/inventory/items/quick-create`.
- **Bảng Database:** `erp.items`, `erp.item_categories`, `erp.item_units`, `erp.item_unit_conversions`, `erp.warehouse_item_settings`.
- **Rà soát Giao diện & Modal:**
  - `ItemModal` mở bình thường ở 2 chế độ (thêm mới và chỉnh sửa). Hỗ trợ cấu hình quy cách kỹ thuật tự do (`specification`).
  - `BomTab` hiển thị danh sách thành phẩm, cho phép chọn nhiều nguyên vật liệu thêm vào bảng định mức.
- **Rà soát Hợp đồng Dữ liệu & Schema:**
  - Bảng `erp.items` có ràng buộc duy nhất `UNIQUE (organization_id, code)` chống trùng mã SKU.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-01:* Trong `BomTab.tsx` (dòng 218–226), khi thêm NVL vào bảng định mức thành phẩm, mã chỉ ghi nhận `unit: mat.baseUnitName` mà **bỏ sót hoàn toàn `unitId`**. Khi `production-bom.service.ts` bóc tách lệnh sản xuất, do thiếu `unitId`, hàm `unitFactor` không tìm được tỷ lệ quy đổi giữa đơn vị định mức và đơn vị kho, tự động fallback về hệ số 1 gây sai lệch số lượng vật tư bóc tách thực tế.
  2. *BUG-UNFIXED-04:* Trong `InventoryService.createItem` và `updateItem` (dòng 590), truy vấn ghi nhận định mức tồn tối thiểu `minQty` và vị trí ô kệ `binLabel` cố định vào `WHERE kind = 'workshop' LIMIT 1`. Với doanh nghiệp có chuỗi kho xưởng, cấu hình chỉ tác động đến kho đầu tiên, các kho khác không được cập nhật.

---

## 2. PHÂN HỆ QUẢN TRỊ KHO — TỒN KHO, VỊ TRÍ, KIỂM KÊ
- **Tập tin liên quan:** `src/app/(dashboard)/kho/page.tsx`, `src/services/inventory.service.ts`.
- **API Endpoints:** `GET /api/inventory/warehouses`, `GET/POST /api/inventory/warehouses/[id]/locations`, `GET/POST /api/inventory/counts`, `POST /api/inventory/counts/[id]/complete`.
- **Bảng Database:** `erp.warehouses`, `erp.warehouse_locations`, `erp.warehouse_members`, `erp.stock_balances`, `erp.inventory_counts`, `erp.inventory_count_lines`.
- **Rà soát Giao diện & Modal:**
  - Tab `stocks`: Lọc tồn theo từng kho hoặc tổng hợp toàn công ty; phân quyền che giá vốn an toàn đối với người không có quyền `item.cost_read`.
  - Tab `counts`: Cho phép lập phiếu kiểm kê đối chiếu số thực tế và số sổ sách.
- **Rà soát Hợp đồng Dữ liệu & Schema:**
  - Bảng `erp.warehouse_locations` có ràng buộc `UNIQUE (organization_id, warehouse_id, code)`.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-03:* Backend đã có bảng `erp.warehouse_locations` và API quản lý vị trí kho, nhưng giao diện `src/app/(dashboard)/kho/page.tsx` **chưa có Modal/bảng để Thủ kho thêm mới và xem danh mục vị trí kệ/ô (Aisle, Rack, Shelf, Bin)**.
  2. *BUG-UNFIXED-05:* Khi bấm chốt kiểm kê (`completeInventoryCount`), hệ thống tự động sinh phiếu điều chỉnh kho và hoàn tất ngay (`completed`) mà **không kiểm tra hạn mức giá trị chênh lệch (Approval Limit)**, tiềm ẩn rủi ro xóa sổ tài sản thất thoát lớn mà không qua phê duyệt của Ban Giám Đốc.

---

## 3. PHÂN HỆ PHIẾU NHẬP – XUẤT – CHUYỂN KHO
- **Tập tin liên quan:** `src/app/(dashboard)/kho/nhap-xuat/page.tsx`, `CreateStockDocModal.tsx`, `StockDocPrintModal.tsx`.
- **API Endpoints:** `GET/POST /api/inventory/documents`, `POST /api/inventory/documents/[id]/submit`, `approve`, `reject`, `return`, `complete`.
- **Bảng Database:** `erp.stock_documents`, `erp.stock_document_lines`, `erp.stock_postings`, `erp.stock_lots`.
- **Rà soát Giao diện & Modal:**
  - `CreateStockDocModal` kiểm tra hợp lệ client-side: chặn trùng kho nguồn và kho đích khi chuyển kho; chặn số lượng <= 0.
  - Đã có tính năng In phiếu kho chuẩn hóa theo khổ giấy A4/A5 qua `StockDocPrintModal`.
- **Rà soát Hợp đồng Dữ liệu & Schema:**
  - Check constraint `stock_documents_check` trên PostgreSQL bảo đảm phiếu điều chỉnh có `source_warehouse_id = null`.
  - Cơ chế chống tự duyệt (`bypassSelfApproval` = false) chặn người tạo phiếu tự phê duyệt.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-07:* Phiếu điều chuyển kho (`transfer`) hiện tại trừ tồn kho nguồn và cộng tồn kho đích ngay lập tức trong cùng 1 transaction. Chưa hỗ trợ trạng thái hàng đi đường (`in_transit`), dẫn đến kho đích thấy hàng sẵn sàng sử dụng khi hàng thực tế vẫn đang trên xe tải di chuyển giữa các tỉnh.

---

## 4. PHÂN HỆ KHÁCH HÀNG & CÔNG NỢ
- **Tập tin liên quan:** `src/app/(dashboard)/khach-hang/page.tsx`, `DebtPaymentModal.tsx`, `src/services/crm.service.ts`, `src/services/finance.service.ts`.
- **API Endpoints:** `GET/POST /api/crm/customers`, `GET/PUT /api/crm/customers/[id]`, `GET /api/finance/open-items?type=receivable`, `POST /api/finance/payments`.
- **Bảng Database:** `erp.partners` (is_customer=true), `erp.open_items`, `erp.payments`, `erp.payment_allocations`, `erp.cash_entries`.
- **Rà soát Giao diện & Modal:**
  - Drawer hồ sơ 360° nạp đầy đủ Báo giá, Đơn bán hàng, Hóa đơn nợ và Lịch sử thanh toán.
  - Tự động sinh mã `KH-xxxx` khi bỏ trống mã khách hàng lúc thêm mới.
- **Rà soát Hợp đồng Dữ liệu & Schema:**
  - Trigger `guard_payment_allocation` bảo đảm thanh toán không bị ghi nhận phân bổ gạch nợ sau khi đã chốt sổ.
  - Đã sửa lỗi SQL khóa dòng `FOR UPDATE` chung với hàm tổng hợp aggregate.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-06:* Khi khách hàng thanh toán vượt số dư nợ hiện tại, số tiền thừa chưa được tự động tạo thành một bản ghi dư có (Customer Advance) trong `erp.open_items`, khiến tiền bị "treo" trên sổ quỹ mà không tự động cấn trừ cho các đơn hàng bán phát sinh kế tiếp.

---

## 5. PHÂN HỆ NHÀ CUNG CẤP & CÔNG NỢ
- **Tập tin liên quan:** `src/app/(dashboard)/nha-cung-cap/page.tsx`, `DebtPaymentModal.tsx`, `src/services/procurement.service.ts`.
- **API Endpoints:** `GET/POST /api/procurement/suppliers`, `GET/PUT/DELETE /api/procurement/suppliers/[id]`, `GET /api/finance/open-items?type=payable`, `POST /api/finance/payments`.
- **Bảng Database:** `erp.partners` (is_supplier=true), `erp.open_items`, `erp.payments`, `erp.payment_allocations`.
- **Rà soát Giao diện & Modal:**
  - Giao diện độc lập `/nha-cung-cap` với đầy đủ tính năng tra cứu nợ phải trả, đơn PO mua hàng, bảng giá vật tư và thông tin pháp lý.
  - Hỗ trợ thanh toán gạch nợ nhà cung cấp qua `DebtPaymentModal` (disbursement mode).
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-08:* Bất đồng bộ tên trường địa chỉ giữa backend và giao diện: Database lưu tại cột `address`, nhưng một số query view trả về `billing_address`, dẫn đến việc một số nhà cung cấp có địa chỉ trên database nhưng Drawer xem nhanh lại hiển thị trống `—`.

---

## 6. PHÂN HỆ MUA HÀNG — ĐƠN PO & NHẬN HÀNG
- **Tập tin liên quan:** `src/app/(dashboard)/mua-hang/page.tsx`, `tao-moi/page.tsx`, `CreateInboundReceiptModal.tsx`, `src/services/procurement.service.ts`.
- **API Endpoints:** `GET/POST /api/procurement/orders`, `GET /api/procurement/orders/[id]`, `POST /api/procurement/orders/[id]/approve`, `POST /api/procurement/orders/[id]/receipt`.
- **Bảng Database:** `erp.purchase_orders`, `erp.purchase_order_lines`, `erp.stock_documents`.
- **Rà soát Giao diện & Modal:**
  - Trang lập đơn PO hỗ trợ thêm dòng vật tư thủ công hoặc tự động trích xuất đề xuất từ ảnh hóa đơn qua AI OCR.
  - Phê duyệt PO có kiểm tra hạn mức tiền của người duyệt và ngăn chặn tự duyệt.
  - Modal `CreateInboundReceiptModal` tự động pre-fill danh mục vật tư từ PO sang phiếu đề xuất nhập kho.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-02 (Rò rỉ phân quyền):* Tại `src/app/api/procurement/orders/[id]/receipt/route.ts` (dòng 23), điều kiện kiểm tra quyền dùng toán tử logic `!capabilities["purchase_order.read"]?.isEnabled && !capabilities["stock_document.create"]?.isEnabled`. Bất kỳ ai có quyền đọc PO (kể cả nhân viên không thuộc bộ phận kho) đều có thể gửi request tạo phiếu nhập kho mà không bị chặn 403.

---

## 7. PHÂN HỆ KHẢO SÁT MẶT BẰNG HIỆN TRƯỜNG
- **Tập tin liên quan:** `src/app/(dashboard)/khao-sat/page.tsx`, `src/services/signage-phase2.service.ts`.
- **API Endpoints:** `GET/POST /api/surveys`, `GET/PUT /api/surveys/[id]`, `POST /api/surveys/[id]/signature`.
- **Bảng Database:** `erp.site_surveys`, `erp.survey_photos`.
- **Rà soát Giao diện & Modal:**
  - Drawer khảo sát hiển thị trực quan thông số mặt bằng: chiều rộng, chiều cao, độ sâu thụt thò, độ cao cách mặt đất, vật liệu tường gắn biển.
  - Tích hợp Canvas cảm ứng ký xác nhận số đo mặt bằng giữa kỹ thuật viên và chủ nhà.
  - Hỗ trợ nút "Khởi tạo Báo giá dự toán" 1-click từ số liệu khảo sát.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-09:* Khi tạo Báo giá từ khảo sát không có liên kết sẵn `projectId`, hệ thống sinh mã dự án mới nhưng chưa tự động gán `customerId` từ phiếu khảo sát vào dự án đó, dẫn đến dự án bị thiếu thông tin khách hàng nếu người dùng không chọn lại thủ công.
  2. *BUG-UNFIXED-10:* Ảnh khảo sát chụp từ camera điện thoại (dung lượng lớn 10MB–20MB) được gửi trực tiếp dạng Base64/Binary mà chưa qua nén ảnh client-side (Canvas Image Resizer), dễ gây tràn bộ nhớ hoặc lỗi HTTP 413 Payload Too Large.

---

## 8. PHÂN HỆ THIẾT KẾ CHUẨN NIPPON PAINT (SHOP DRAWING ENGINE)
- **Tập tin liên quan:** `src/components/design/NipponShopCanvas.tsx`, `src/lib/nippon-shop-drawing.ts`, `src/lib/nippon-dimensions.ts`, `src/lib/nippon-brand-guidelines.ts`, `src/lib/nippon-brand-artwork.ts`.
- **Kiểm thử liên quan:** `tests/nippon-shop-drawing.test.cjs` (Pass 83 layouts).
- **Bảng Database:** `erp.design_proofs`.
- **Rà soát Động cơ Kỹ thuật & Bố cục:**
  - Hỗ trợ tự động tính toán 83 biến thể bố cục biển hiệu đại lý Nippon Paint theo chuẩn nhận diện thương hiệu toàn cầu.
  - Tự động phân bổ vị trí logo giọt sơn 3 màu, viền đỏ nhận diện, dải phân cách xanh lá và font chữ tên đại lý theo đúng tỷ lệ chiều cao biển.
  - Xuất tọa độ vector SVG và xuất CSV định vị cho máy CNC/Laser xưởng sản xuất.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-11:* Nạp font chữ tiếng Việt: Nếu font chữ quy chuẩn Nippon không được nạp thành công từ thư mục `public/fonts/nippon-preview/` do độ trễ mạng hoặc lỗi CORS trên trình duyệt, canvas sẽ fallback về font chữ hệ thống làm sai lệch bề rộng chữ tiếng Việt có dấu (ă, â, đ, ê, ô, ơ, ư) so với maket chuẩn.

---

## 9. PHÂN HỆ BÁO GIÁ & DỰ TOÁN
- **Tập tin liên quan:** `src/app/(dashboard)/bao-gia/page.tsx`, `tao-moi/page.tsx`, `src/services/crm.service.ts`.
- **API Endpoints:** `GET/POST /api/crm/quotations`, `GET/PUT /api/crm/quotations/[id]`, `POST /api/crm/quotations/[id]/send`, `accept`.
- **Bảng Database:** `erp.quotations`, `erp.quotation_lines`, `erp.quotation_revisions`.
- **Rà soát Giao diện & Nghiệp vụ:**
  - Quản lý phiên bản báo giá (Revisions - Package F01): Khi chỉnh sửa báo giá đã phát hành, hệ thống tự động tăng `revision_number` và bảo toàn lịch sử bản cũ.
  - Tự động tính thuế VAT, chiết khấu và tổng tiền thanh toán theo từng dòng sản phẩm.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-12:* Khi Báo giá được chấp thuận (`accepted`), nút "Tạo Đơn Bán Hàng (SO)" chưa cho phép người dùng chia đợt thanh toán (Payment Milestones: Tạm ứng 50%, nghiệm thu khung 30%, bàn giao 20%) ngay trên giao diện chuyển đổi, buộc kế toán phải tạo thủ công bên phân hệ tài chính.

---

## 10. PHÂN HỆ BÁN HÀNG THƯƠNG MẠI
- **Tập tin liên quan:** `src/app/(dashboard)/ban-hang/page.tsx`, `tao-moi/page.tsx`, `src/services/crm.service.ts`.
- **API Endpoints:** `GET/POST /api/crm/orders`, `GET/PUT /api/crm/orders/[id]`.
- **Bảng Database:** `erp.sales_orders`, `erp.sales_order_lines`.
- **Rà soát Giao diện & Nghiệp vụ:**
  - Quản lý đơn bán hàng thương mại độc lập với sản xuất dự án (Package F04).
  - Khởi tạo hóa đơn nợ (`erp.open_items`) chính xác khi đơn hàng được xác nhận giao hàng thành công.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-13:* Đơn bán hàng thương mại chưa có cơ chế tự động giữ chỗ vật tư (Stock Reservation) trong kho. Nhân viên kinh doanh có thể chốt đơn bán lẻ vật tư khi số lượng thực tế trong kho đã được lệnh sản xuất dự án khác giữ chỗ trước đó.

---

## 11. PHÂN HỆ DỰ ÁN & TIẾN ĐỘ — HỢP ĐỒNG, THÀNH VIÊN, TÀI LIỆU, NGHIỆM THU
- **Tập tin liên quan:** `src/app/(dashboard)/du-an/page.tsx`, `[id]/page.tsx`, `src/services/project.service.ts`.
- **API Endpoints:** `GET/POST /api/projects`, `GET/PUT /api/projects/[id]`, `GET /api/projects/[id]/members`, `tasks`, `materials`, `financial-summary`, `export-schedule`.
- **Bảng Database:** `erp.projects`, `erp.project_members`, `erp.contracts`, `erp.project_progress`, `erp.factory_qc_records`.
- **Rà soát Giao diện & Tính năng:**
  - Drawer dự án 6 tabs hoàn chỉnh: Tiến độ, Thành viên, Hạng mục Gantt, Hợp đồng, Vật tư bóc tách và Tài chính dự án.
  - Phân loại nhóm dự án chuỗi biển hiệu CEN / QCNT và tỉnh thành thi công (`project_group`, `province`).
  - Xuất bảng tiến độ dự án ra file Excel đúng chuẩn biểu mẫu CEN / QCNT có khử trùng lặp dữ liệu (`tests/feature-plan-package-g.test.cjs`).
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-14:* Chưa có kiểm tra xung đột lịch công tác khi phân công thành viên (`project_members`). Một chỉ huy trưởng có thể bị gán phụ trách nhiều dự án tại các tỉnh khác nhau trong cùng một khoảng thời gian mà hệ thống không cảnh báo.

---

## 12. PHÂN HỆ ĐIỀU PHỐI CÔNG VIỆC — GIAO VIỆC, TIẾN ĐỘ, BÁO CÁO
- **Tập tin liên quan:** `src/app/(dashboard)/cong-viec/page.tsx`, `src/services/project.service.ts`.
- **API Endpoints:** `GET/POST /api/tasks`, `GET/PUT /api/tasks/[id]`, `POST /api/tasks/[id]/progress`, `reports`.
- **Bảng Database:** `erp.tasks`, `erp.task_assignees`, `erp.work_reports`.
- **Rà soát Giao diện & Nghiệp vụ:**
  - Bảng điều phối Kanban 4 cột trực quan (`todo`, `doing`, `review`, `done`).
  - Cho phép thợ gửi báo cáo công việc hàng ngày kèm ảnh hiện trường thực địa.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-15:* Khi cập nhật tiến độ công việc con (`progressPercent`), hệ thống chưa tự động tính toán trọng số khối lượng để cập nhật ngược lại tỷ lệ % hoàn thành chung của Dự án cha trong bảng `erp.projects`.

---

## 13. PHÂN HỆ SẢN XUẤT — LỆNH SẢN XUẤT, VẬT TƯ, QC, THÀNH PHẨM
- **Tập tin liên quan:** `src/app/(dashboard)/san-xuat/page.tsx`, `src/services/production.service.ts`, `src/services/production-bom.service.ts`.
- **Kiểm thử liên quan:** `tests/production-lifecycle.test.cjs`, `production-shortage.test.cjs`, `production-edge-cases.test.cjs`.
- **Bảng Database:** `erp.production_orders`, `erp.production_order_stages`, `erp.production_order_materials`, `erp.production_order_qc`, `erp.stock_lots`.
- **Rà soát Quy trình Sản xuất Khép kín:**
  - Quy trình qua các cổng kiểm soát nghiêm ngặt: Tạo lệnh → Duyệt lệnh → Giữ chỗ kho (phát hiện thiếu hụt và chờ bù) → Xuất kho vật tư theo lô vật lý → Báo cáo công đoạn → Nghiệm thu KCS/QC (hỗ trợ Rework) → Nhập kho thành phẩm theo mã lô riêng biệt.
  - Báo cáo in BOM xưởng sản xuất tự động ẩn giá vốn để bảo mật chi phí nội bộ công ty.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-16:* Khi xuất kho vật tư phụ phát sinh ngoài định mức (Supplementary Material Issue), chi phí phát sinh này được ghi vào phiếu kho nhưng chưa tự động cộng dồn vào giá thành sản xuất thực tế trên thẻ chi phí dự án.

---

## 14. PHÂN HỆ TÁC NGHIỆP HIỆN TRƯỜNG — GPS, HÌNH ẢNH, BÁO CÁO GIỌNG NÓI
- **Tập tin liên quan:** `src/app/(dashboard)/hien-truong/page.tsx`, `src/services/field-ops.service.ts`.
- **Tính năng nổi bật:**
  - Điểm danh định vị GPS kiểm tra bán kính hợp lệ theo vị trí công trình (`work_locations`). Chặn giả mạo tọa độ và chặn điểm danh hộ (`tests/e2e/test_deep_advanced_modules.mjs`).
  - Chèn Watermark số lên ảnh chụp hiện trường (Tọa độ GPS, Địa chỉ, Thời gian, Tên thợ).
  - Tích hợp Web Speech API cho phép kỹ thuật viên nói để tự động chuyển thành văn bản báo cáo tiến độ.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-17:* Thiếu cơ chế Offline Storage (IndexedDB/PWA Service Worker): Khi thợ thi công tại khu vực hẻo lánh hoặc tầng hầm mất kết nối 4G, ảnh và nhật ký không được lưu tạm ở thiết bị để tự động tải lên khi có mạng.

---

## 15. PHÂN HỆ BẢO HÀNH & SỬA CHỮA
- **Tập tin liên quan:** `src/app/(dashboard)/bao-hanh/page.tsx`, `src/services/signage-phase2.service.ts`.
- **API Endpoints:** `GET/POST /api/service-tickets`, `GET/PUT /api/service-tickets/[id]`.
- **Bảng Database:** `erp.service_tickets`, `erp.warranties`.
- **Rà soát Giao diện & Nghiệp vụ:**
  - Quản lý vòng đời ticket sự cố: `received` → `assigned` → `investigating` → `repairing` → `resolved` → `closed`.
  - Ghi nhận nguyên nhân sự cố (cháy LED, chập nguồn, đứt dây, biến dạng mặt biển) và chi phí xử lý.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-18:* Chi phí vật tư thay thế bảo hành (`costAmount`) hiện mới chỉ lưu ở dạng số liệu ghi nhận, chưa có nút bấm liên kết tự động phát hành Phiếu xuất kho bảo hành để trừ vật tư trong kho xưởng.

---

## 16. PHÂN HỆ TÀI CHÍNH & SỔ QUỸ — THU CHI, DUYỆT, CÔNG NỢ, ĐẢO PHIẾU
- **Tập tin liên quan:** `src/app/(dashboard)/tai-chinh/page.tsx`, `src/services/finance.service.ts`.
- **Kiểm thử liên quan:** `tests/feature-plan-package-be.test.cjs`.
- **Bảng Database:** `erp.cash_accounts`, `erp.cash_entries`, `erp.payments`, `erp.payment_allocations`, `erp.open_items`, `erp.accounting_periods`.
- **Rà soát Giao diện & Nghiệp vụ:**
  - Hỗ trợ đầy đủ luồng phê duyệt thanh toán (`submitted` → `approved` → `posted`), đính kèm tệp chứng từ và kiểm tra khóa kỳ kế toán (`period lock`).
  - Hỗ trợ tính năng Đảo phiếu (Payment Reversal) an toàn, khôi phục lại công nợ và số dư sổ quỹ kèm dấu vết kiểm toán.
  - Xuất sao kê lịch sử giao dịch sổ quỹ ra Excel và đọc số tiền bằng chữ tiếng Việt chuẩn xác.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-19:* Hệ thống cố định tiền tệ `VND`, chưa hỗ trợ tỷ giá quy đổi khi mua vật tư hoặc thiết bị ngoại tệ (USD, CNY, EUR).

---

## 17. PHÂN HỆ NHÂN SỰ & TIỀN LƯƠNG — HỒ SƠ, CHẤM CÔNG PHIÊN, CA/LỄ, NGHỈ PHÉP, TÍNH LƯƠNG
- **Tập tin liên quan:** `src/app/(dashboard)/nhan-su/page.tsx`, `src/app/apps/hrm/`, `src/services/hrm.service.ts`, `src/services/finance.service.ts`.
- **Kiểm thử liên quan:** `tests/feature-plan-package-d.test.cjs`.
- **Bảng Database:** `erp.employees`, `erp.employee_salary_policies`, `erp.work_shifts`, `erp.holiday_configs`, `erp.leave_policies`, `erp.employee_leave_balances`, `erp.hrm_requests`, `erp.attendance_entries`, `erp.payroll_runs`, `erp.payroll_items`.
- **Rà soát Nghiệp vụ Nhân sự Chuyên sâu:**
  - Chấm công theo phiên (Session Attendance): Check-out không check-in bắt buộc nhân viên giải trình; HR phê duyệt số phút tăng ca thực tế.
  - Động cơ tính lương tự động loại trừ trùng lặp OT (No-double-counting OT), bảo đảm số tiền tăng ca không bị cộng 2 lần.
  - Quản lý phiên bản bảng lương (`superseded` revisions) khắc phục triệt để lỗi xung đột partial unique index `payroll_effective_period`.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-20:* Các mức giảm trừ gia cảnh thuế TNCN hiện được hardcode trong code service thay vì có màn hình cài đặt tham số linh hoạt cho Kế toán trưởng điều chỉnh khi chính sách nhà nước thay đổi.

---

## 18. PHÂN HỆ ĐỘI XE & VẬN CHUYỂN — IMPORT GPS BÌNH MINH, ĐIỀU XE, TĂNG CA, CHI PHÍ
- **Tập tin liên quan:** `src/app/apps/doi-xe/page.tsx`, `src/lib/fleet/`, `src/services/fleet.service.ts`.
- **Kiểm thử liên quan:** `tests/fleet-app.test.cjs`, `fleet-rbac.test.cjs`, `gps-binhminh-parser.test.cjs`, `gps-binhminh-import.test.cjs`.
- **Bảng Database:** `erp.vehicles`, `erp.vehicle_trips`, `erp.fleet_gps_imports`, `erp.fleet_trip_logs`, `erp.fleet_cost_allocations`.
- **Rà soát Độc lập & Chuyên sâu Phân hệ Xe:**
  - Parser nhận diện nội dung thông minh cho Báo cáo tổng hợp Hino và Báo cáo hành trình Isuzu từ thiết bị giám sát hành trình GPS Bình Minh.
  - Khử trùng lặp (Deduplication) khi import lại file cũ; phát hiện sai lệch tổng khi người dùng sửa số liệu một ngày đơn lẻ.
  - Phân bổ chi phí xe tải (xăng dầu, khấu hao, cầu đường) cho từng Dự án thi công hoặc chi phí Nội bộ khớp chính xác 100% từng đồng VND.
  - Phân quyền RBAC 3 vai trò độc lập theo đúng quy chuẩn `CHOT_VAI_TRO_VA_QUYEN_PHAN_HE_XE`: `FLEET_MANAGER`, `FLEET_DISPATCHER`, `FLEET_DRIVER`.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-21:* Chưa hỗ trợ kết nối API trực tiếp (Direct Webhook / Cron Job) với máy chủ GPS Bình Minh để tự động tải nhật ký hành trình ban đêm mà hiện vẫn phải tải file Excel thủ công từ cổng web Bình Minh rồi upload lên ERP.

---

## 19. PHÂN HỆ TÀI LIỆU NỘI BỘ & DRIVE
- **Tập tin liên quan:** `src/app/apps/tai-lieu/page.tsx`, `src/services/document.service.ts`.
- **API Endpoints:** `GET/POST /api/documents/folders`, `GET/POST/DELETE /api/documents/files`.
- **Bảng Database:** `erp.document_folders`, `erp.internal_documents`.
- **Rà soát Giao diện & Nghiệp vụ:**
  - Cấu trúc cây thư mục phân cấp hoàn chỉnh (Thư mục hệ thống theo dự án và Thư mục tùy biến của phòng ban).
  - Phân quyền chặt chẽ: `document.read` để xem và `document.manage` để tải lên, sửa tên, di chuyển, xóa tệp (đã vá trong audit F16).
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-22:* File bản vẽ CAD (`.dwg`, `.dxf`) và file thiết kế vector (`.ai`, `.eps`) hiện chỉ hỗ trợ lưu trữ và tải về, chưa có bộ preview viewer vector trực tiếp trên giao diện web.

---

## 20. PHÂN HỆ NGƯỜI DÙNG, VAI TRÒ & PHÂN QUYỀN (IAM/RBAC)
- **Tập tin liên quan:** `src/app/(dashboard)/cai-dat/page.tsx`, `src/services/authorization.service.ts`, `src/services/iam.service.ts`.
- **Kiểm thử liên quan:** `tests/permission-audit-fixes.test.cjs` (Remediation 11 Probes và F01-F28).
- **Bảng Database:** `iam.users`, `iam.roles`, `iam.permissions`, `iam.role_grants`, `iam.user_roles`, `iam.role_change_requests`, `iam.permission_audit_log`.
- **Rà soát Bảo mật & Phân quyền:**
  - Khắc phục 11 điểm thử nghiệm lọt quyền (Probes 1–11): Lương yêu cầu `salary.update`, duyệt bảng lương yêu cầu `payroll.approve`, tạo sổ quỹ yêu cầu `cash_account.manage`, xóa tài liệu yêu cầu `document.manage`.
  - Củng cố 4 quyền hạt nhân tại Migration 021: `document.read`, `document.manage`, `warehouse.manage`, `cash_account.manage`.
  - Cơ chế đề nghị thay đổi vai trò (Role Change Request) chống tự thăng quyền admin.
- **LỖI CHƯA SỬA PHÁT HIỆN:**
  1. *BUG-UNFIXED-23:* Bộ nhớ đệm phân quyền (Memory LRU Cache 45 giây) trong `AuthorizationService.getUserCapabilities`: Khi một tài khoản bị thu hồi vai trò hoặc hạ quyền khẩn cấp, tài khoản đó vẫn có thể duy trì quyền cũ trong tối đa 45 giây nếu không có tín hiệu xóa cache tức thì (`invalidateUserCapabilitiesCache`).

---

## 21. BẢNG TỔNG HỢP CÁC LỖI CHƯA SỬA (DEFECT BACKLOG TOÀN HỆ THỐNG)

| Mã lỗi | Phân hệ ảnh hưởng | Tệp nguồn & Vị trí | Mức độ | Mô tả hiện tượng & Hậu quả kỹ thuật |
|---|---|---|:---:|---|
| **BUG-UNFIXED-01** | Vật tư & Định mức BOM | `src/components/vat-tu/BomTab.tsx:218-226` | **HIGH** | Lưu định mức BOM chỉ gửi tên đơn vị `unit` mà bỏ sót `unitId`, làm động cơ sản xuất không quy đổi được đơn vị kho. |
| **BUG-UNFIXED-02** | Mua hàng PO & Kho vận | `src/app/api/procurement/orders/[id]/receipt/route.ts:23` | **HIGH** | Kiểm tra quyền `!A && !B` lỏng lẻo khiến người chỉ có quyền đọc PO vẫn tạo được phiếu nhập kho mà không cần quyền kho. |
| **BUG-UNFIXED-03** | Quản trị kho — Vị trí | `src/app/(dashboard)/kho/page.tsx` | **MEDIUM** | Backend đã có bảng `erp.warehouse_locations` nhưng giao diện chưa có Modal/bảng để Thủ kho thiết lập Kệ/Ô. |
| **BUG-UNFIXED-04** | Vật tư & Cài đặt kho | `src/services/inventory.service.ts:590` | **MEDIUM** | Cài đặt tồn tối thiểu và ô kệ bị lọc cứng vào kho xưởng đầu tiên (`WHERE kind='workshop' LIMIT 1`), không hỗ trợ đa kho. |
| **BUG-UNFIXED-05** | Quản trị kho — Kiểm kê | `src/services/inventory.service.ts:completeInventoryCount` | **MEDIUM** | Chốt kiểm kê lập tức ghi sổ phiếu điều chỉnh kho mà không qua bước kiểm tra hạn mức giá trị chênh lệch (Approval Limit). |
| **BUG-UNFIXED-06** | Khách hàng & Công nợ | `src/services/finance.service.ts:753-810` | **LOW** | Khách thanh toán thừa tiền chưa tự động phát sinh bản ghi tiền trả trước (Advance/Credit Note) để cấn trừ đơn sau. |
| **BUG-UNFIXED-07** | Phiếu kho — Điều chuyển | `src/services/inventory.service.ts:completeDocument` | **MEDIUM** | Điều chuyển kho trừ kho nguồn và cộng kho đích tức thời, chưa có trạng thái hàng đi đường (`in_transit`). |
| **BUG-UNFIXED-08** | Nhà cung cấp & Công nợ | `src/app/(dashboard)/nha-cung-cap/page.tsx` | **LOW** | Bất đồng bộ tên trường địa chỉ `address` và `billing_address` làm Drawer chi tiết NCC bị hiển thị trống địa chỉ. |
| **BUG-UNFIXED-09** | Khảo sát hiện trường | `src/services/signage-phase2.service.ts` | **MEDIUM** | Tạo báo giá tự động từ khảo sát chưa gán `customerId` vào dự án mới sinh, dẫn đến dự án mồ côi khách hàng. |
| **BUG-UNFIXED-10** | Khảo sát hiện trường | `src/app/(dashboard)/khao-sat/page.tsx` | **MEDIUM** | Ảnh hiện trường độ phân giải cao gửi trực tiếp dạng Base64/Binary chưa nén client-side, dễ gây lỗi HTTP 413. |
| **BUG-UNFIXED-11** | Thiết kế chuẩn Nippon | `src/components/design/NipponShopCanvas.tsx` | **MEDIUM** | Trình duyệt fallback về font hệ thống khi font Nippon tải chậm làm sai lệch độ rộng chữ tiếng Việt có dấu. |
| **BUG-UNFIXED-12** | Báo giá & Dự toán | `src/app/(dashboard)/bao-gia/page.tsx` | **LOW** | Chuyển Báo giá thành Đơn bán hàng chưa hỗ trợ cấu hình nhiều đợt thanh toán (Milestones) ngay trên giao diện chốt đơn. |
| **BUG-UNFIXED-13** | Bán hàng thương mại | `src/services/crm.service.ts` | **MEDIUM** | Đơn bán hàng thương mại chưa có cơ chế giữ chỗ tồn kho (Stock Reservation) dẫn đến nguy cơ bán vượt tồn kho khả dụng. |
| **BUG-UNFIXED-14** | Dự án & Tiến độ | `src/services/project.service.ts` | **LOW** | Phân công thành viên chưa kiểm tra cảnh báo xung đột lịch công tác của kỹ sư phụ trách nhiều dự án cùng ngày. |
| **BUG-UNFIXED-15** | Điều phối công việc | `src/services/project.service.ts` | **LOW** | Cập nhật % tiến độ task con chưa tự động tính toán trọng số để cập nhật % tiến độ tổng thể của Dự án cha. |
| **BUG-UNFIXED-16** | Lệnh sản xuất | `src/services/production.service.ts` | **LOW** | Xuất vật tư phụ ngoài định mức chưa tự động cập nhật cộng dồn giá thành kế toán vào thẻ chi phí dự án. |
| **BUG-UNFIXED-17** | Tác nghiệp hiện trường | `src/app/(dashboard)/hien-truong/page.tsx` | **MEDIUM** | Thiếu bộ nhớ đệm Offline (IndexedDB/PWA) khi thợ thi công tại khu vực tầng hầm mất sóng di động 4G. |
| **BUG-UNFIXED-18** | Bảo hành & Sửa chữa | `src/app/(dashboard)/bao-hanh/page.tsx` | **LOW** | Chi phí vật tư thay thế bảo hành chưa có nút bấm tự động phát hành Phiếu xuất kho bảo hành tương ứng. |
| **BUG-UNFIXED-19** | Tài chính & Sổ quỹ | `src/services/finance.service.ts` | **LOW** | Hệ thống cố định tiền tệ `VND`, chưa hỗ trợ bảng tỷ giá khi nhập khẩu vật tư hoặc thiết bị ngoại tệ. |
| **BUG-UNFIXED-20** | Nhân sự & Tiền lương | `src/services/finance.service.ts` | **LOW** | Mức giảm trừ gia cảnh thuế TNCN đang hardcode trong service, chưa có màn hình cấu hình tham số cho kế toán. |
| **BUG-UNFIXED-21** | Đội xe & Vận chuyển | `src/app/apps/doi-xe/page.tsx` | **MEDIUM** | Chưa có API webhook kết nối trực tiếp với máy chủ GPS Bình Minh để tự động đồng bộ nhật ký xe ban đêm. |
| **BUG-UNFIXED-22** | Tài liệu nội bộ & Drive | `src/app/apps/tai-lieu/page.tsx` | **LOW** | File bản vẽ CAD (`.dwg`, `.dxf`) chỉ hỗ trợ tải về, chưa có bộ preview viewer vector trực tiếp trên web. |
| **BUG-UNFIXED-23** | Người dùng & Phân quyền | `src/services/authorization.service.ts` | **LOW** | Cache quyền 45s trong bộ nhớ có thể tạo độ trễ tối đa 45 giây trước khi lệnh thu hồi quyền khẩn cấp có hiệu lực. |

---

## 22. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG `npm run check`

Toàn bộ kiểm tra cục bộ đã được chạy thực tế:

```
> signage-erp-ai@1.0.0 check
> npm run typecheck && npm test

> signage-erp-ai@1.0.0 typecheck
> tsc --noEmit --incremental false
(0 errors found)

> signage-erp-ai@1.0.0 test
> node scripts/run-tests.mjs

ℹ tests 205
ℹ suites 0
ℹ pass 205
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 105689.5509
```

- **TypeScript:** 100% Type-safe, 0 lỗi biên dịch.
- **NodeJS Test Suite (205/205 tests passed):**
  - Schema, Migration rollback & Drift check: `database-contract.test.cjs` (Pass).
  - 36 Truy vấn đọc chỉ đọc: `read-service-contract.test.cjs` (Pass).
  - 72 API đọc & ghi dữ liệu mẫu: `api-query-contract.test.cjs` (Pass).
  - 17 Kịch bản Form Roundtrip: `form-query-contract.test.cjs` (Pass).
  - Kho vận & Chứng từ kho: `feature-plan-package-bc.test.cjs` (Pass).
  - Tài chính & Đảo phiếu: `feature-plan-package-be.test.cjs` (Pass).
  - Chấm công phiên & HR: `feature-plan-package-d.test.cjs` (Pass).
  - Báo giá & Hợp đồng: `feature-plan-package-f.test.cjs` (Pass).
  - In BOM & Tiến độ CEN: `feature-plan-package-g.test.cjs` (Pass).
  - Bố cục Nippon Paint: `nippon-shop-drawing.test.cjs` (Pass).
  - Đội xe & GPS Bình Minh: `fleet-app.test.cjs`, `fleet-rbac.test.cjs`, `gps-binhminh-*.test.cjs` (Pass).
  - Vòng đời Sản xuất & Hao hụt: `production-bom.test.cjs`, `production-lifecycle.test.cjs`, `production-shortage.test.cjs`, `production-edge-cases.test.cjs` (Pass).
  - Phân quyền & 11 Probes: `permission-audit-fixes.test.cjs` (Pass).

---

## 23. PHÂN ĐỊNH RANH GIỚI & KHUYẾN CÁO NGHIỆM THU

### 23.1. ĐÃ KIỂM TRA GÌ?
- Toàn bộ 20 phân hệ từ tầng UI Component, Next.js Route Handlers đến 89 bảng `erp` và 11 bảng `iam`.
- Toàn bộ ràng buộc cơ sở dữ liệu (NOT NULL, CHECK, UNIQUE, Foreign Key, RLS theo org).
- Khả năng nạp dropdown, xử lý dữ liệu thiếu, sai, trùng, và ma trận phân quyền các vai trò.
- Chạy toàn bộ 205 ca kiểm thử tự động PGlite đạt 100%.

### 23.2. LỖI NÀO ĐÃ ĐƯỢC SỬA (TRONG CÁC BẢN VÁ TRƯỚC)?
- Lỗi SQL 500 khi lập phiếu thu chi (`FOR UPDATE` aggregate).
- Thủ kho bị dropdown rỗng (bổ sung `warehouse_members`).
- Phiếu kho kẹt vĩnh viễn ở `draft` (bổ sung route `submit`).
- Thiếu `description` trên dòng đơn PO gây lỗi NOT NULL constraint.
- Lỗi check constraint `stock_documents_check` khi chốt kiểm kê.
- Lỗi duplicate unique index `payroll_effective_period` khi duyệt lại lương kỳ cũ.
- Lỗi React Hydration Mismatch trên Sidebar navigation.
- 11 điểm thử nghiệm lọt quyền bảo mật (F01–F28).

### 23.3. PHẦN NÀO CHƯA KIỂM CHỨNG (CẢNH BÁO BẮT BUỘC)?
> [!CAUTION]
> **KHÔNG KẾT LUẬN TOÀN BỘ PHÂN HỆ ĐẠT NẾU CHƯA THỬ THỰC TẾ TRÊN TRÌNH DUYỆT:**
> 1. **Thao tác tay trên trình duyệt người dùng thật (Manual Browser / Real-Device UI Testing):** Các bài kiểm tra tự động chạy trên môi trường Node.js giả lập. Các hành vi trực quan như: độ mượt khi cuộn trang, tương tác chạm vuốt trên iPad/điện thoại ngoài hiện trường, thao tác ký tên trên màn hình cảm ứng, và độ trễ render modal lồng nhau chưa được kiểm chứng trên trình duyệt thực tế.
> 2. **Chưa kiểm chứng AI Gemini OCR và Web Speech API trong điều kiện hiện trường:** Tùy thuộc vào thiết bị, micro, camera và mạng 4G thực tế.
> 3. **Chưa kiểm chứng tải đồng thời trên Supabase Cloud Production:** Xung đột khóa dòng (Deadlock/Row Lock) khi hàng chục người dùng cùng tạo chứng từ đồng thời qua kết nối mạng IPv6 chưa được đo kiểm trên môi trường production thật.
> 4. **23 lỗi kỹ thuật chưa sửa (Defect Backlog tại Mục 21):** Vẫn đang tồn tại trong mã nguồn hiện tại và cần được lập kế hoạch khắc phục có kiểm soát.
