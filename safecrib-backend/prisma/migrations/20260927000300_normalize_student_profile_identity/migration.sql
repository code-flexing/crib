UPDATE "student_profiles" AS student
SET "user_id" = account."id"
FROM "users" AS account
WHERE student."user_id" IS NULL
  AND student."email" = account."email";

INSERT INTO "users" (
  "id",
  "email",
  "password_hash",
  "display_name",
  "role",
  "email_verified",
  "identity_verified",
  "created_at",
  "updated_at"
)
SELECT
  'legacy-student-' || student."id",
  student."email",
  student."passwordHash",
  student."displayName",
  'UNVERIFIED',
  TRUE,
  FALSE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "student_profiles" AS student
WHERE student."user_id" IS NULL;

UPDATE "student_profiles" AS student
SET "user_id" = account."id"
FROM "users" AS account
WHERE student."user_id" IS NULL
  AND student."email" = account."email";

DROP INDEX "student_profiles_email_key";
DROP INDEX "student_profiles_user_id_key";

ALTER TABLE "student_profiles"
DROP CONSTRAINT "student_profiles_user_id_fkey";

ALTER TABLE "student_profiles"
ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "student_profiles"
DROP COLUMN "email",
DROP COLUMN "passwordHash";

CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

ALTER TABLE "student_profiles"
ADD CONSTRAINT "student_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;