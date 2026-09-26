-- Thêm trường lưu trữ ảnh hóa đơn/chứng từ kèm đơn mua hàng (M06)
-- Đơn mua không cần duyệt: mặc định approved khi tạo
ALTER TABLE erp.purchase_orders ADD COLUMN IF NOT EXISTS invoice_image text;

-- Chuyển toàn bộ đơn mua hàng đang ở trạng thái draft/submitted sang approved
UPDATE erp.purchase_orders SET status = 'approved' WHERE status IN ('draft', 'submitted');
