
-- Row-level tenant isolation is defense in depth. This is NOT the application action/scope authorizer.
-- No browser/Supabase anon/authenticated role receives ERP/IAM privileges.
CREATE FUNCTION erp.touch_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.reject_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Append-only table: %', TG_TABLE_NAME USING ERRCODE='23514';
END $$;

CREATE FUNCTION erp.guard_published_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Published version is immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.guard_tree() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cyclic boolean; parent_project uuid;
BEGIN
  PERFORM 1 FROM erp.organizations WHERE id=NEW.organization_id FOR UPDATE;
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  EXECUTE format(
    'WITH RECURSIVE ancestors AS (
       SELECT id,parent_id FROM %I.%I WHERE organization_id=$1 AND id=$2
       UNION
       SELECT p.id,p.parent_id FROM %I.%I p JOIN ancestors a ON p.id=a.parent_id WHERE p.organization_id=$1
     ) SELECT EXISTS(SELECT 1 FROM ancestors WHERE id=$3)',TG_TABLE_SCHEMA,TG_TABLE_NAME,TG_TABLE_SCHEMA,TG_TABLE_NAME)
    INTO cyclic USING NEW.organization_id,NEW.parent_id,NEW.id;
  IF cyclic THEN RAISE EXCEPTION 'Hierarchy cycle' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='tasks' THEN
    SELECT project_id INTO parent_project FROM erp.tasks WHERE organization_id=NEW.organization_id AND id=NEW.parent_id;
    IF parent_project IS DISTINCT FROM NEW.project_id THEN
      RAISE EXCEPTION 'Parent and child task must share project' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.guard_task_project_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id AND EXISTS(
    SELECT 1 FROM erp.tasks WHERE organization_id=OLD.organization_id AND parent_id=OLD.id
  ) THEN RAISE EXCEPTION 'Cannot move a task with children between projects' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

-- Serialize overlapping assignment/term writes per organization. No extension is required.
CREATE FUNCTION erp.guard_effective_interval() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE predicate text := ''; k text; overlap_found boolean;
BEGIN
  PERFORM 1 FROM erp.organizations WHERE id=NEW.organization_id FOR UPDATE;
  FOREACH k IN ARRAY TG_ARGV LOOP
    predicate := predicate || format(' AND t.%I::text = ($4->>%L)',k,k);
  END LOOP;
  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM %I.%I t WHERE organization_id=$1 AND id<>$2
       AND tstzrange(valid_from,valid_to,''[)'') && tstzrange($3::timestamptz,($4->>''valid_to'')::timestamptz,''[)'') %s)',
    TG_TABLE_SCHEMA,TG_TABLE_NAME,predicate)
    INTO overlap_found USING NEW.organization_id,NEW.id,NEW.valid_from,to_jsonb(NEW);
  IF overlap_found THEN RAISE EXCEPTION 'Overlapping effective interval' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION iam.guard_grant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p iam.permissions%ROWTYPE;
BEGIN
  SELECT * INTO STRICT p FROM iam.permissions WHERE id=NEW.permission_id;
  IF NOT NEW.scope_kind = ANY(p.supported_scopes) THEN
    RAISE EXCEPTION 'Unsupported permission scope' USING ERRCODE='23514';
  END IF;
  IF NEW.amount_limit IS NOT NULL AND NOT p.supports_amount_limit THEN
    RAISE EXCEPTION 'This permission does not support an amount limit' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION iam.assert_selected_grant(p_org uuid,p_grant uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE g iam.role_grants%ROWTYPE; resource_name text; n bigint;
BEGIN
  SELECT * INTO g FROM iam.role_grants WHERE organization_id=p_org AND id=p_grant;
  IF NOT FOUND OR NOT g.is_enabled OR g.scope_kind<>'SELECTED' THEN RETURN; END IF;
  SELECT resource INTO resource_name FROM iam.permissions WHERE id=g.permission_id;
  IF resource_name IN ('inventory','stock_document') THEN
    SELECT count(*) INTO n FROM iam.grant_warehouses WHERE organization_id=p_org AND grant_id=p_grant;
  ELSIF resource_name IN ('employee','attendance') THEN
    SELECT count(*) INTO n FROM iam.grant_departments WHERE organization_id=p_org AND grant_id=p_grant;
  ELSE
    SELECT count(*) INTO n FROM iam.grant_projects WHERE organization_id=p_org AND grant_id=p_grant;
  END IF;
  IF n=0 THEN RAISE EXCEPTION 'Enabled SELECTED grant requires scope bindings' USING ERRCODE='23514'; END IF;
END $$;

CREATE FUNCTION iam.guard_selected_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g iam.role_grants%ROWTYPE; resource_name text;
BEGIN
  SELECT * INTO STRICT g FROM iam.role_grants WHERE organization_id=NEW.organization_id AND id=NEW.grant_id;
  SELECT resource INTO resource_name FROM iam.permissions WHERE id=g.permission_id;
  IF g.scope_kind<>'SELECTED'
    OR (TG_TABLE_NAME='grant_warehouses' AND resource_name NOT IN ('inventory','stock_document'))
    OR (TG_TABLE_NAME='grant_departments' AND resource_name NOT IN ('employee','attendance'))
    OR (TG_TABLE_NAME='grant_projects' AND resource_name NOT IN ('purchase_order','project','contract','production_order','acceptance','project_finance','task','work_report','trip','expense_claim'))
  THEN RAISE EXCEPTION 'Binding does not match grant scope/resource' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION iam.check_selected_after_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='role_grants' THEN
    IF TG_OP<>'DELETE' THEN PERFORM iam.assert_selected_grant(NEW.organization_id,NEW.id); END IF;
  ELSE
    IF TG_OP<>'INSERT' THEN PERFORM iam.assert_selected_grant(OLD.organization_id,OLD.grant_id); END IF;
    IF TG_OP<>'DELETE' THEN PERFORM iam.assert_selected_grant(NEW.organization_id,NEW.grant_id); END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION iam.record_policy_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org uuid; row_id uuid; actor text;
BEGIN
  IF TG_OP='DELETE' THEN org:=OLD.organization_id; row_id:=OLD.id;
  ELSE org:=NEW.organization_id; row_id:=NEW.id; END IF;
  actor:=nullif(current_setting('app.actor_user_id',true),'');
  UPDATE erp.organizations SET policy_version=policy_version+1 WHERE id=org;
  INSERT INTO erp.audit_events(organization_id,actor_user_id,actor_kind,action,resource_type,resource_id,request_id,before_redacted,after_redacted)
  VALUES(org,actor,CASE WHEN actor IS NULL THEN 'system' ELSE 'user' END,
    'policy.'||lower(TG_OP),TG_TABLE_SCHEMA||'.'||TG_TABLE_NAME,row_id::text,gen_random_uuid(),
    CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) END,CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) END);
  RETURN NULL;
END $$;

CREATE FUNCTION erp.guard_approval_decision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE req erp.approval_requests%ROWTYPE;
BEGIN
  SELECT * INTO STRICT req FROM erp.approval_requests WHERE organization_id=NEW.organization_id AND id=NEW.request_id FOR UPDATE;
  IF req.status<>'pending' OR NEW.decided_by=req.submitted_by THEN
    RAISE EXCEPTION 'Invalid approval state or self-approval' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM erp.approval_policy_steps s WHERE s.organization_id=NEW.organization_id
    AND s.policy_id=req.policy_id AND s.sequence=NEW.step_sequence) THEN
    RAISE EXCEPTION 'Approval step not found' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.guard_stock_line() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text; state text;
BEGIN
  SELECT type,status INTO kind,state FROM erp.stock_documents WHERE organization_id=NEW.organization_id AND id=NEW.document_id FOR UPDATE;
  IF state<>'draft' THEN RAISE EXCEPTION 'Only draft stock lines can change' USING ERRCODE='23514'; END IF;
  IF kind<>'adjustment' AND NEW.qty<=0 THEN RAISE EXCEPTION 'Stock quantity must be positive' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.guard_payment_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pay erp.payments%ROWTYPE; debt erp.open_items%ROWTYPE; allocated numeric;
BEGIN
  PERFORM 1 FROM erp.organizations WHERE id=NEW.organization_id FOR UPDATE;
  SELECT * INTO STRICT pay FROM erp.payments WHERE organization_id=NEW.organization_id AND id=NEW.payment_id FOR UPDATE;
  SELECT * INTO STRICT debt FROM erp.open_items WHERE organization_id=NEW.organization_id AND id=NEW.open_item_id FOR UPDATE;
  IF pay.status IN ('posted','reversed','cancelled') OR pay.partner_id IS DISTINCT FROM debt.partner_id
    OR pay.currency<>debt.currency OR (pay.direction='receipt')<>(debt.side='receivable')
  THEN RAISE EXCEPTION 'Invalid allocation parties, currency, direction or state' USING ERRCODE='23514'; END IF;
  SELECT coalesce(sum(amount),0) INTO allocated FROM erp.payment_allocations
    WHERE organization_id=NEW.organization_id AND payment_id=NEW.payment_id AND id<>NEW.id;
  IF allocated+NEW.amount>pay.amount THEN RAISE EXCEPTION 'Allocation exceeds payment' USING ERRCODE='23514'; END IF;
  -- Open-item balance is checked again under lock when the service posts payment.
  RETURN NEW;
END $$;

CREATE TRIGGER approval_decision_guard BEFORE INSERT ON erp.approval_decisions FOR EACH ROW EXECUTE FUNCTION erp.guard_approval_decision();
CREATE TRIGGER stock_line_guard BEFORE INSERT OR UPDATE ON erp.stock_document_lines FOR EACH ROW EXECUTE FUNCTION erp.guard_stock_line();
CREATE TRIGGER payment_allocation_guard BEFORE INSERT OR UPDATE ON erp.payment_allocations FOR EACH ROW EXECUTE FUNCTION erp.guard_payment_allocation();
CREATE TRIGGER grant_guard BEFORE INSERT OR UPDATE ON iam.role_grants FOR EACH ROW EXECUTE FUNCTION iam.guard_grant();
CREATE TRIGGER task_project_guard BEFORE UPDATE ON erp.tasks FOR EACH ROW EXECUTE FUNCTION erp.guard_task_project_change();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.organizations FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.memberships FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.departments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.teams FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.employees FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.team_members FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.employee_private_profiles FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.partners FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.partner_contacts FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.partner_terms FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.partner_activities FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.units FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.item_categories FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.items FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.item_unit_conversions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.supplier_prices FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.vehicles FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.warehouses FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.warehouse_members FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.warehouse_item_settings FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.project_templates FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.project_template_versions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.projects FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.project_members FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.tasks FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.task_assignees FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_templates FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_template_versions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_template_bindings FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.work_reports FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_labor_entries FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_material_usage FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.production_orders FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.production_materials FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.production_outputs FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.quotations FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.quotation_revisions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.quotation_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.estimate_components FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.sales_orders FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.sales_order_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.purchase_orders FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.purchase_order_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.contracts FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.contract_milestones FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_lots FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_documents FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_document_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.stock_postings FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.stock_movements FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_balances FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_reservations FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.inventory_counts FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.inventory_count_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.cash_accounts FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.open_items FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.open_item_adjustments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payment_allocations FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.cash_entries FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.expense_claims FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.expense_claim_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.expense_settlements FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.project_cost_entries FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.period_locks FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.trips FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.trip_stops FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.trip_stock_documents FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.field_events FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.acceptances FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.attendance_entries FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.attendance_periods FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.salary_terms FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payroll_runs FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payroll_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payroll_payments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.files FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.record_files FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.ai_runs FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.ai_run_files FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.approval_policies FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.approval_policy_steps FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.approval_requests FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.approval_decisions FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.audit_events FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.idempotency_keys FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.outbox_events FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.number_sequences FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.company_settings FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.permissions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.roles FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.role_grants FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.grant_projects FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.grant_warehouses FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.grant_departments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.user_roles FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.role_change_requests FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.permission_dependencies FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.resource_projections FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.role_read_projections FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER tree_guard BEFORE INSERT OR UPDATE ON erp.departments FOR EACH ROW EXECUTE FUNCTION erp.guard_tree();
CREATE TRIGGER tree_guard BEFORE INSERT OR UPDATE ON erp.item_categories FOR EACH ROW EXECUTE FUNCTION erp.guard_tree();
CREATE TRIGGER tree_guard BEFORE INSERT OR UPDATE ON erp.tasks FOR EACH ROW EXECUTE FUNCTION erp.guard_tree();
CREATE TRIGGER published_guard BEFORE UPDATE OR DELETE ON erp.project_template_versions FOR EACH ROW EXECUTE FUNCTION erp.guard_published_version();
CREATE TRIGGER published_guard BEFORE UPDATE OR DELETE ON erp.report_template_versions FOR EACH ROW EXECUTE FUNCTION erp.guard_published_version();
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.team_members FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('team_id','employee_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.project_members FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('project_id','membership_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.warehouse_members FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('warehouse_id','membership_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.task_assignees FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('task_id','employee_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.item_unit_conversions FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('item_id','unit_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.supplier_prices FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('partner_id','item_id','unit_id','currency');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.salary_terms FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('employee_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON iam.user_roles FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('membership_id','role_id');
CREATE CONSTRAINT TRIGGER selected_binding_required AFTER INSERT OR UPDATE OR DELETE ON iam.role_grants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION iam.check_selected_after_change();
CREATE CONSTRAINT TRIGGER selected_binding_required AFTER INSERT OR UPDATE OR DELETE ON iam.grant_projects DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION iam.check_selected_after_change();
CREATE TRIGGER binding_guard BEFORE INSERT OR UPDATE ON iam.grant_projects FOR EACH ROW EXECUTE FUNCTION iam.guard_selected_binding();
CREATE CONSTRAINT TRIGGER selected_binding_required AFTER INSERT OR UPDATE OR DELETE ON iam.grant_warehouses DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION iam.check_selected_after_change();
CREATE TRIGGER binding_guard BEFORE INSERT OR UPDATE ON iam.grant_warehouses FOR EACH ROW EXECUTE FUNCTION iam.guard_selected_binding();
CREATE CONSTRAINT TRIGGER selected_binding_required AFTER INSERT OR UPDATE OR DELETE ON iam.grant_departments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION iam.check_selected_after_change();
CREATE TRIGGER binding_guard BEFORE INSERT OR UPDATE ON iam.grant_departments FOR EACH ROW EXECUTE FUNCTION iam.guard_selected_binding();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.roles FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.role_grants FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.grant_projects FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.grant_warehouses FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.grant_departments FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.user_roles FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.role_read_projections FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.memberships FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.project_members FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.warehouse_members FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.team_members FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.task_assignees FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
