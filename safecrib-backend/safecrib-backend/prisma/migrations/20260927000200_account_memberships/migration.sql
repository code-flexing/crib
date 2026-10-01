ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'UNVERIFIED';

UPDATE "users" AS account
SET "role" = 'UNVERIFIED'
WHERE account."role" = 'STUDENT'
  AND NOT EXISTS (
    SELECT 1
    FROM "student_profiles" AS student
    WHERE student."user_id" = account."id"
      AND student."status" = 'APPROVED'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "provider_pages" AS provider
    WHERE provider."owner_id" = account."id"
      AND provider."verification_state" = 'VERIFIED'
  );

CREATE TABLE "admin_profiles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_profiles_user_id_key" ON "admin_profiles"("user_id");

INSERT INTO "admin_profiles" ("id", "user_id")
SELECT "id", "id" FROM "users" WHERE "role" = 'ADMIN';

ALTER TABLE "admin_profiles"
ADD CONSTRAINT "admin_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;