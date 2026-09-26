-- Auth tables: generated from installed Better Auth schema. Existing auth data is never overwritten.
DO $auth$
BEGIN
  IF to_regclass('public."user"') IS NULL THEN
CREATE TABLE public."user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."user" FROM PUBLIC;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='id' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column id; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='name' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column name; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='email' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column email; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='emailVerified' AND data_type IN ('boolean') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column emailVerified; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='image' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column image; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='createdAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column createdAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='updatedAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column updatedAt; migration stopped'; END IF;
  END IF;
  IF to_regclass('public."session"') IS NULL THEN
CREATE TABLE public."session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES public."user"("id") ON DELETE CASCADE
);
CREATE INDEX "session_userId_idx" ON public."session"("userId");
ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."session" FROM PUBLIC;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='id' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column id; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='expiresAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column expiresAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='token' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column token; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='createdAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column createdAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='updatedAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column updatedAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='ipAddress' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column ipAddress; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='userAgent' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column userAgent; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='userId' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column userId; migration stopped'; END IF;
  END IF;
  IF to_regclass('public."account"') IS NULL THEN
CREATE TABLE public."account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES public."user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
CREATE INDEX "account_userId_idx" ON public."account"("userId");
ALTER TABLE public."account" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."account" FROM PUBLIC;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='id' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column id; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='accountId' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column accountId; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='providerId' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column providerId; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='userId' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column userId; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='accessToken' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column accessToken; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='refreshToken' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column refreshToken; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='idToken' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column idToken; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='accessTokenExpiresAt' AND data_type IN ('timestamp with time zone','timestamp without time zone')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column accessTokenExpiresAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='refreshTokenExpiresAt' AND data_type IN ('timestamp with time zone','timestamp without time zone')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column refreshTokenExpiresAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='scope' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column scope; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='password' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column password; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='createdAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column createdAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='updatedAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column updatedAt; migration stopped'; END IF;
  END IF;
  IF to_regclass('public."verification"') IS NULL THEN
CREATE TABLE public."verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
CREATE INDEX "verification_identifier_idx" ON public."verification"("identifier");
ALTER TABLE public."verification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."verification" FROM PUBLIC;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='id' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column id; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='identifier' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column identifier; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='value' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column value; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='expiresAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column expiresAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='createdAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column createdAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='updatedAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column updatedAt; migration stopped'; END IF;
  END IF;
END $auth$;
