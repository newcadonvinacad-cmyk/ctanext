-- Migration 023: Chốt vai trò và quyền phân hệ xe (Fleet Suite RBAC)
-- Căn cứ: docs/Phân hệ xe/CHOT_VAI_TRO_VA_QUYEN_PHAN_HE_XE.md

-- 1. Bổ sung 12 quyền mới vào danh mục iam.permissions
INSERT INTO iam.permissions (key, resource, action, description, supported_scopes, supports_amount_limit, is_sensitive, is_active)
VALUES
  ('trip.cancel', 'trip', 'cancel', 'Hủy lệnh điều xe, lưu lý do', ARRAY['ORG', 'ASSIGNED', 'SELECTED']::text[], false, true, true),
  ('trip.attach', 'trip', 'attach', 'Gắn hoặc thay đổi tài liệu tuyến của phần lệnh được phép', ARRAY['ORG', 'ASSIGNED', 'SELECTED']::text[], false, false, true),
  ('fleet.read', 'fleet', 'read', 'Xem vận hành đội xe: GPS, lịch sử nhập, nhật ký, OT đề nghị/đã duyệt, chi phí, hồ sơ/lịch, vấn đề, chính sách và báo cáo tạm tính', ARRAY['ORG']::text[], false, false, true),
  ('fleet.update', 'fleet', 'update', 'Cập nhật nghiệp vụ vận hành đội xe: phân loại/giải trình nhật ký, đề nghị OT, chi phí, hồ sơ, sự cố', ARRAY['ORG']::text[], false, false, true),
  ('fleet.import', 'fleet', 'import', 'Tải Excel lên, xem trước, xác nhận nhập, thay thế hoặc thu hồi đợt nhập GPS', ARRAY['ORG']::text[], false, true, true),
  ('fleet.export', 'fleet', 'export', 'Xuất báo cáo đội xe hoặc tải file GPS gốc trong phạm vi được phép', ARRAY['ORG', 'ASSIGNED', 'SELECTED']::text[], false, false, true),
  ('fleet_ot.approve', 'fleet_ot', 'approve', 'Phê duyệt, từ chối hoặc duyệt lại giờ tăng ca (OT) đội xe', ARRAY['ORG']::text[], false, true, true),
  ('fleet_issue.close', 'fleet_issue', 'close', 'Quyết định xử lý, đóng hoặc mở lại vấn đề/sự cố đội xe', ARRAY['ORG']::text[], false, true, true),
  ('fleet_setting.update', 'fleet_setting', 'update', 'Sửa định mức, đơn giá OT, mốc ngày công và chính sách xe có ngày hiệu lực', ARRAY['ORG']::text[], false, true, true),
  ('fleet_period.close', 'fleet_period', 'close', 'Chốt kỳ đội xe và xác nhận chuyển số liệu sang HRM/Kế toán', ARRAY['ORG']::text[], false, true, true),
  ('fleet_period.reopen', 'fleet_period', 'reopen', 'Mở điều chỉnh kỳ đội xe (bắt buộc lý do)', ARRAY['ORG']::text[], false, true, true),
  ('fleet_report.read', 'fleet_report', 'read', 'Xem kết quả báo cáo đội xe đã duyệt/chốt hoặc công bố cho bên nhận', ARRAY['ORG', 'ASSIGNED', 'SELECTED']::text[], false, false, true)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  supported_scopes = EXCLUDED.supported_scopes,
  supports_amount_limit = EXCLUDED.supports_amount_limit,
  is_sensitive = EXCLUDED.is_sensitive,
  is_active = true;

-- 2. Tạo 2 vai trò chuẩn cho phân hệ xe trên tất cả tổ chức & gán quyền ma trận
DO $$
DECLARE
  v_org RECORD;
  v_role RECORD;
  v_perm RECORD;
  v_op_role_id uuid;
  v_mgr_role_id uuid;
BEGIN
  FOR v_org IN SELECT id FROM erp.organizations LOOP
    -- Tạo vai trò Điều phối xe (FLEET_OPERATOR)
    INSERT INTO iam.roles (organization_id, code, name, description, is_system, is_active, version)
    VALUES (
      v_org.id,
      'FLEET_OPERATOR',
      'Điều phối xe',
      'Vận hành toàn đội: lập/phát hành lệnh, nhập Excel, xử lý nhật ký, lập đề nghị OT, ghi nhiên liệu/chi phí, hồ sơ/lịch và theo dõi vấn đề.',
      true,
      true,
      1
    )
    ON CONFLICT (organization_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active = true
    RETURNING id INTO v_op_role_id;

    IF v_op_role_id IS NULL THEN
      SELECT id INTO v_op_role_id FROM iam.roles WHERE organization_id = v_org.id AND code = 'FLEET_OPERATOR';
    END IF;

    -- Tạo vai trò Quản lý đội xe (FLEET_MANAGER)
    INSERT INTO iam.roles (organization_id, code, name, description, is_system, is_active, version)
    VALUES (
      v_org.id,
      'FLEET_MANAGER',
      'Quản lý đội xe',
      'Toàn bộ quyền Điều phối; thêm duyệt OT, quyết định xử lý vấn đề, sửa chính sách, chốt/mở điều chỉnh kỳ.',
      true,
      true,
      1
    )
    ON CONFLICT (organization_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active = true
    RETURNING id INTO v_mgr_role_id;

    IF v_mgr_role_id IS NULL THEN
      SELECT id INTO v_mgr_role_id FROM iam.roles WHERE organization_id = v_org.id AND code = 'FLEET_MANAGER';
    END IF;

    -- Gán quyền cho FLEET_OPERATOR (13 quyền)
    FOR v_perm IN SELECT id, key FROM iam.permissions WHERE key IN (
      'trip.read', 'trip.create', 'trip.update', 'trip.assign', 'trip.dispatch', 'trip.complete', 'trip.cancel', 'trip.attach',
      'fleet.read', 'fleet.update', 'fleet.import', 'fleet.export', 'fleet_report.read'
    ) LOOP
      INSERT INTO iam.role_grants (organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled)
      VALUES (v_org.id, v_op_role_id, v_perm.id, 'ORG', NULL, NULL, true)
      ON CONFLICT (organization_id, role_id, permission_id, scope_kind) DO UPDATE SET is_enabled = true;
    END LOOP;

    -- Gán quyền cho FLEET_MANAGER (18 quyền)
    FOR v_perm IN SELECT id, key FROM iam.permissions WHERE key IN (
      'trip.read', 'trip.create', 'trip.update', 'trip.assign', 'trip.dispatch', 'trip.complete', 'trip.cancel', 'trip.attach',
      'fleet.read', 'fleet.update', 'fleet.import', 'fleet.export', 'fleet_report.read',
      'fleet_ot.approve', 'fleet_issue.close', 'fleet_setting.update', 'fleet_period.close', 'fleet_period.reopen'
    ) LOOP
      INSERT INTO iam.role_grants (organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled)
      VALUES (v_org.id, v_mgr_role_id, v_perm.id, 'ORG', NULL, NULL, true)
      ON CONFLICT (organization_id, role_id, permission_id, scope_kind) DO UPDATE SET is_enabled = true;
    END LOOP;

    -- Gán toàn bộ cho SUPER_ADMIN và ADMIN
    FOR v_role IN SELECT id, code FROM iam.roles WHERE organization_id = v_org.id AND code IN ('SUPER_ADMIN', 'ADMIN') LOOP
      FOR v_perm IN SELECT id, key FROM iam.permissions WHERE key LIKE 'fleet%' OR key LIKE 'trip%' LOOP
        INSERT INTO iam.role_grants (organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled)
        VALUES (v_org.id, v_role.id, v_perm.id, 'ORG', NULL, NULL, true)
        ON CONFLICT (organization_id, role_id, permission_id, scope_kind) DO UPDATE SET is_enabled = true;
      END LOOP;
    END LOOP;

    -- Cập nhật ACCOUNTANT: trip.read (ORG), fleet_report.read (ORG), fleet.export (ORG)
    FOR v_role IN SELECT id, code FROM iam.roles WHERE organization_id = v_org.id AND code = 'ACCOUNTANT' LOOP
      FOR v_perm IN SELECT id, key FROM iam.permissions WHERE key IN ('trip.read', 'fleet_report.read', 'fleet.export') LOOP
        INSERT INTO iam.role_grants (organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled)
        VALUES (v_org.id, v_role.id, v_perm.id, 'ORG', NULL, NULL, true)
        ON CONFLICT (organization_id, role_id, permission_id, scope_kind) DO UPDATE SET is_enabled = true;
      END LOOP;
    END LOOP;

    -- Cập nhật PROJECT_MANAGER:
    -- Xóa các quyền trip.* không thuộc phạm vi mẫu mới (trip.create, trip.update, trip.assign, trip.dispatch)
    FOR v_role IN SELECT id, code FROM iam.roles WHERE organization_id = v_org.id AND code = 'PROJECT_MANAGER' LOOP
      DELETE FROM iam.role_grants
      WHERE organization_id = v_org.id
        AND role_id = v_role.id
        AND permission_id IN (
          SELECT id FROM iam.permissions WHERE key IN ('trip.create', 'trip.update', 'trip.assign', 'trip.dispatch')
        );

      -- Gán trip.read, trip.attach, fleet_report.read, fleet.export phạm vi ASSIGNED
      FOR v_perm IN SELECT id, key FROM iam.permissions WHERE key IN ('trip.read', 'trip.attach', 'fleet_report.read', 'fleet.export') LOOP
        INSERT INTO iam.role_grants (organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled)
        VALUES (v_org.id, v_role.id, v_perm.id, 'ASSIGNED', NULL, NULL, true)
        ON CONFLICT (organization_id, role_id, permission_id, scope_kind) DO UPDATE SET is_enabled = true;
      END LOOP;
    END LOOP;

    -- Cập nhật FIELD_WORKER: trip.read (ASSIGNED), trip.complete (ASSIGNED)
    FOR v_role IN SELECT id, code FROM iam.roles WHERE organization_id = v_org.id AND code = 'FIELD_WORKER' LOOP
      FOR v_perm IN SELECT id, key FROM iam.permissions WHERE key IN ('trip.read', 'trip.complete') LOOP
        INSERT INTO iam.role_grants (organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled)
        VALUES (v_org.id, v_role.id, v_perm.id, 'ASSIGNED', NULL, NULL, true)
        ON CONFLICT (organization_id, role_id, permission_id, scope_kind) DO UPDATE SET is_enabled = true;
      END LOOP;
    END LOOP;

  END LOOP;
END $$;
