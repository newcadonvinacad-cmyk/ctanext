-- OPTIONAL: run AFTER SIGNAGE_ERP_INSTALL.sql and AFTER creating real Better Auth users.
-- Replace the user id below. Run once per intended administrator (two recommended for dual approval).
-- This does not create a user, password or session. SQL Editor/database owner access is required.
BEGIN;
DO $bootstrap$
DECLARE
  target_user_id text := 'REPLACE_WITH_EXISTING_BETTER_AUTH_USER_ID';
  org uuid;
  member uuid;
  admin_role uuid;
  state text;
BEGIN
  SELECT id,bootstrap_state INTO STRICT org,state FROM erp.organizations WHERE code='SIGNAGE' FOR UPDATE;
  IF state<>'pending' THEN RAISE EXCEPTION 'Bootstrap is locked; use the role change workflow'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public."user" WHERE id=target_user_id) THEN
    RAISE EXCEPTION 'Replace target_user_id with an existing Better Auth user id';
  END IF;
  INSERT INTO erp.memberships(organization_id,user_id,created_by,updated_by)
  VALUES(org,target_user_id,target_user_id,target_user_id)
  ON CONFLICT(organization_id,user_id) DO NOTHING;
  SELECT id INTO STRICT member FROM erp.memberships
    WHERE organization_id=org AND user_id=target_user_id AND status='active';
  SELECT id INTO STRICT admin_role FROM iam.roles WHERE organization_id=org AND code='SUPER_ADMIN' AND is_active;
  IF NOT EXISTS(SELECT 1 FROM iam.user_roles WHERE organization_id=org AND membership_id=member AND role_id=admin_role
    AND valid_from<=now() AND (valid_to IS NULL OR valid_to>now())) THEN
    INSERT INTO iam.user_roles(organization_id,membership_id,role_id,assigned_by,reason,created_by,updated_by)
    VALUES(org,member,admin_role,target_user_id,'Initial database-owner bootstrap',target_user_id,target_user_id);
    INSERT INTO erp.audit_events(organization_id,actor_user_id,actor_kind,action,resource_type,resource_id,request_id)
    VALUES(org,target_user_id,'user','system.bootstrap','iam.user_roles',member::text,gen_random_uuid());
  END IF;
END $bootstrap$;
COMMIT;

-- After assigning the intended administrators, explicitly lock bootstrap:
-- UPDATE erp.organizations SET bootstrap_state='locked' WHERE code='SIGNAGE' AND bootstrap_state='pending';
