-- Migration 014: Thêm cột description cho bảng erp.tasks phục vụ mô tả chi tiết / yêu cầu kỹ thuật của giai đoạn và đầu việc
ALTER TABLE erp.tasks
  ADD COLUMN IF NOT EXISTS description text DEFAULT '';

COMMENT ON COLUMN erp.tasks.description IS 'Mô tả chi tiết, yêu cầu kỹ thuật hoặc quy chuẩn cho giai đoạn/đầu việc';
