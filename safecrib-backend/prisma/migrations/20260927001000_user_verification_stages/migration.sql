CREATE TYPE "VerificationStage" AS ENUM (
  'PROFILE_VERIFIED',
  'AGENT_VERIFIED',
  'TRUST_CROWN'
);

CREATE TYPE "VerificationBadge" AS ENUM (
  'GREEN_CHECK',
  'BLUE_SHIELD',
  'GOLD_CROWN'
);

CREATE TYPE "VerificationBadgeColor" AS ENUM (
  'green',
  'blue',
  'gold'
);

CREATE TABLE "user_verifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "stage" "VerificationStage" NOT NULL DEFAULT 'PROFILE_VERIFIED',
  "badge" "VerificationBadge" NOT NULL DEFAULT 'GREEN_CHECK',
  "badge_color" "VerificationBadgeColor" NOT NULL DEFAULT 'green',
  "risk_blocked" BOOLEAN NOT NULL DEFAULT FALSE,
  "identity_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "provider_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "student_profile_approved" BOOLEAN NOT NULL DEFAULT FALSE,
  "trust_score" INTEGER,
  "next_milestone" TEXT,
  "last_computed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_verifications_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "user_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_verifications_stage_idx"
  ON "user_verifications" ("stage");

CREATE INDEX "user_verifications_risk_blocked_idx"
  ON "user_verifications" ("risk_blocked");

INSERT INTO "user_verifications" (
  "id",
  "user_id",
  "stage",
  "badge",
  "badge_color",
  "risk_blocked",
  "identity_verified",
  "provider_verified",
  "student_profile_approved",
  "trust_score",
  "next_milestone",
  "last_computed_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid()::TEXT,
  u."id",
  CASE
    WHEN u."role" = 'ADMIN' THEN 'PROFILE_VERIFIED'::"VerificationStage"
    WHEN p."verification_state" = 'VERIFIED' AND COALESCE(u."trust_score", 0) >= 85 AND u."identity_verified" = TRUE THEN 'TRUST_CROWN'::"VerificationStage"
    WHEN p."verification_state" = 'VERIFIED' AND u."identity_verified" = TRUE THEN 'AGENT_VERIFIED'::"VerificationStage"
    ELSE 'PROFILE_VERIFIED'::"VerificationStage"
  END AS "stage",
  CASE
    WHEN u."role" = 'ADMIN' THEN 'GREEN_CHECK'::"VerificationBadge"
    WHEN p."verification_state" = 'VERIFIED' AND COALESCE(u."trust_score", 0) >= 85 AND u."identity_verified" = TRUE THEN 'GOLD_CROWN'::"VerificationBadge"
    WHEN p."verification_state" = 'VERIFIED' AND u."identity_verified" = TRUE THEN 'BLUE_SHIELD'::"VerificationBadge"
    ELSE 'GREEN_CHECK'::"VerificationBadge"
  END AS "badge",
  CASE
    WHEN u."role" = 'ADMIN' THEN 'green'::"VerificationBadgeColor"
    WHEN p."verification_state" = 'VERIFIED' AND COALESCE(u."trust_score", 0) >= 85 AND u."identity_verified" = TRUE THEN 'gold'::"VerificationBadgeColor"
    WHEN p."verification_state" = 'VERIFIED' AND u."identity_verified" = TRUE THEN 'blue'::"VerificationBadgeColor"
    ELSE 'green'::"VerificationBadgeColor"
  END AS "badge_color",
  FALSE AS "risk_blocked",
  COALESCE(u."identity_verified", FALSE) AS "identity_verified",
  COALESCE(p."verification_state" = 'VERIFIED', FALSE) AS "provider_verified",
  COALESCE(sp."status" = 'APPROVED', FALSE) AS "student_profile_approved",
  CAST(COALESCE(u."trust_score", 0) AS INTEGER) AS "trust_score",
  CASE
    WHEN u."identity_verified" = FALSE THEN 'Complete identity verification'
    WHEN p."verification_state" = 'VERIFIED' AND COALESCE(u."trust_score", 0) < 85 THEN 'Reach a trust score of 85 for the crown badge'
    WHEN p."verification_state" = 'VERIFIED' AND u."identity_verified" = TRUE THEN NULL
    ELSE 'Complete profile verification to unlock recognition'
  END AS "next_milestone",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users" u
LEFT JOIN "provider_pages" p ON p."owner_id" = u."id"
LEFT JOIN "student_profiles" sp ON sp."user_id" = u."id";
