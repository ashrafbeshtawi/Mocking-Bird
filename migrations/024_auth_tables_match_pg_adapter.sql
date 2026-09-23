-- Migration 018 created users/accounts with snake_case columns, but
-- @auth/pg-adapter (src/lib/auth.ts) queries the quoted camelCase columns of the
-- official Auth.js schema ("userId", "providerAccountId", "emailVerified") plus
-- accounts.session_state. A database built from these migrations therefore
-- failed on the first OAuth login with `column a.userId does not exist`.
--
-- Renames are conditional so a database that already carries the adapter
-- schema is left untouched. Indexes, the unique constraint and the FK follow
-- the renamed columns automatically. sessions / verification_token are not
-- created: the app uses the JWT session strategy and has no e-mail provider.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'accounts' AND column_name = 'user_id') THEN
    ALTER TABLE accounts RENAME COLUMN user_id TO "userId";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'accounts' AND column_name = 'provider_account_id') THEN
    ALTER TABLE accounts RENAME COLUMN provider_account_id TO "providerAccountId";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'email_verified') THEN
    ALTER TABLE users RENAME COLUMN email_verified TO "emailVerified";
  END IF;
END $$;

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS session_state TEXT;
