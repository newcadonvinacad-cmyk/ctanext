-- Migration 021: Bổ sung 4 quyền hạn hạt nhân & củng cố catalog phân quyền
-- Căn cứ: docs/BAO_CAO_RA_SOAT_PHAN_QUYEN_UI_BE_2026-10-10.md (Mục 1, Mục 6, Phụ lục A)

-- 1. Bổ sung các giá trị mới vào ENUM hoặc bảng iam.permissions
INSERT INTO iam.permissions (key, resource, action, description, supported_scopes, supports_amount_limit, is_sensitive, is_active)
VALUES
  ('document.read', 'document', 'read', 'Xem tài liệu và thư mục nội bộ', ARRAY['ORG', 'OWN', 'ASSIGNED']::text[], false, false, true),
  ('document.manage', 'document', 'manage', 'Quản lý, tải lên, chỉnh sửa và xóa tài liệu nội bộ', ARRAY['ORG', 'OWN']::text[], false, true, true),
  ('warehouse.manage', 'warehouse', 'manage', 'Quản trị thiết lập kho, vị trí kệ/ô và phân công thủ kho', ARRAY['ORG', 'ASSIGNED']::text[], false, true, true),
  ('cash_account.manage', 'cash_account', 'manage', 'Quản trị thiết lập danh mục sổ quỹ, tài khoản và số dư đầu kỳ', ARRAY['ORG']::text[], false, true, true)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  supported_scopes = EXCLUDED.supported_scopes,
  supports_amount_limit = EXCLUDED.supports_amount_limit,
  is_sensitive = EXCLUDED.is_sensitive,
  is_active = true;

-- 2. Tự động gán quyền mới cho các vai trò quản trị (SUPER_ADMIN, ADMIN) trên các tổ chức hiện có
DO $$
DECLARE
  v_org RECORD;
  v_role RECORD;
  v_perm RECORD;
BEGIN
  FOR v_org IN SELECT id FROM erp.organizations LOOP
    -- Gán toàn quyền cho SUPER_ADMIN và ADMIN
    FOR v_role IN SELECT id, code FROM iam.roles WHERE organization_id = v_org.id AND code IN ('SUPER_ADMIN', 'ADMIN') LOOP
      FOR v_perm IN SELECT id, key, supported_scopes FROM iam.permissions WHERE key IN ('document.read', 'document.manage', 'warehouse.manage', 'cash_account.manage') LOOP
        INSERT INTO iam.role_grants (
          organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled
        )
        VALUES (
          v_org.id, v_role.id, v_perm.id, 'ORG', NULL, 'VND', true
        )
        ON CONFLICT (organization_id, role_id, permission_id, scope_kind)
        DO UPDATE SET is_enabled = true;
      END LOOP;
    END LOOP;

    -- Gán warehouse.manage cho WAREHOUSE_KEEPER nếu có
    FOR v_role IN SELECT id, code FROM iam.roles WHERE organization_id = v_org.id AND code IN ('WAREHOUSE_KEEPER') LOOP
      FOR v_perm IN SELECT id, key FROM iam.permissions WHERE key = 'warehouse.manage' LOOP
        INSERT INTO iam.role_grants (
          organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled
        )
        VALUES (
          v_org.id, v_role.id, v_perm.id, 'ASSIGNED', NULL, 'VND', true
        )
        ON CONFLICT (organization_id, role_id, permission_id, scope_kind)
        DO UPDATE SET is_enabled = true;
      END LOOP;
    END LOOP;

    -- Gán cash_account.manage cho ACCOUNTANT nếu có
    FOR v_role IN SELECT id, code FROM iam.roles WHERE organization_id = v_org.id AND code IN ('ACCOUNTANT') LOOP
      FOR v_perm IN SELECT id, key FROM iam.permissions WHERE key = 'cash_account.manage' LOOP
        INSERT INTO iam.role_grants (
          organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled
        )
        VALUES (
          v_org.id, v_role.id, v_perm.id, 'ORG', NULL, 'VND', true
        )
        ON CONFLICT (organization_id, role_id, permission_id, scope_kind)
        DO UPDATE SET is_enabled = true;
      END LOOP;
    END LOOP;

    -- Gán document.read cho tất cả vai trò hoạt động
    FOR v_role IN SELECT id, code FROM iam.roles WHERE organization_id = v_org.id AND is_active = true LOOP
      FOR v_perm IN SELECT id, key FROM iam.permissions WHERE key = 'document.read' LOOP
        INSERT INTO iam.role_grants (
          organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled
        )
        VALUES (
          v_org.id, v_role.id, v_perm.id, 'ORG', NULL, 'VND', true
        )
        ON CONFLICT (organization_id, role_id, permission_id, scope_kind)
        DO UPDATE SET is_enabled = true;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
