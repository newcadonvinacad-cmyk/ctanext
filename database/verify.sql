-- Read-only assertions: run after installation. Raises an error on mismatch.
DO $verify$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM information_schema.tables WHERE table_schema IN ('erp','iam') AND table_type='BASE TABLE' AND table_name<>'schema_migrations';
  IF n<>108 THEN RAISE EXCEPTION 'Expected 108 ERP/IAM tables, got %',n; END IF;
  SELECT count(*) INTO n FROM iam.permissions;
  IF n<>170 THEN RAISE EXCEPTION 'Expected 170 permissions, got %',n; END IF;
  SELECT count(*) INTO n FROM iam.roles r JOIN erp.organizations o ON o.id=r.organization_id WHERE o.code='SIGNAGE';
  IF n<>5 THEN RAISE EXCEPTION 'Expected 5 seed roles, got %',n; END IF;
  SELECT count(*) INTO n FROM iam.role_grants g JOIN erp.organizations o ON o.id=g.organization_id WHERE o.code='SIGNAGE';
  IF n<>410 THEN RAISE EXCEPTION 'Expected 410 seed grants, got %',n; END IF;
  IF EXISTS(SELECT 1 FROM iam.role_grants g JOIN iam.permissions p ON p.id=g.permission_id WHERE NOT g.scope_kind=ANY(p.supported_scopes)) THEN
    RAISE EXCEPTION 'Unsupported grant scope';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace WHERE s.nspname IN ('erp','iam') AND c.relkind='r' AND c.relname<>'schema_migrations' AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Missing RLS on application table';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_namespace s ON s.oid=c.connamespace WHERE s.nspname IN ('erp','iam') AND NOT c.convalidated) THEN
    RAISE EXCEPTION 'Unvalidated constraints';
  END IF;
END $verify$;
