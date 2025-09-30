-- Drop plaintext secret columns and introduce encrypted storage for data source credentials.
ALTER TABLE "DataSource"
  ADD COLUMN "passwordCiphertext" TEXT,
  ADD COLUMN "passwordIv" TEXT,
  ADD COLUMN "passwordTag" TEXT,
  ADD COLUMN "urlCiphertext" TEXT,
  ADD COLUMN "urlIv" TEXT,
  ADD COLUMN "urlTag" TEXT;

ALTER TABLE "DataSource"
  DROP COLUMN IF EXISTS "password",
  DROP COLUMN IF EXISTS "url";
