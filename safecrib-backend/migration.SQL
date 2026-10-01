-- Migration: add-avatar-fields
-- Adds avatar_url to users and creates the avatar_history table

-- 1. Add avatar_url column to users (nullable, so safe on existing rows)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

-- 2. Create avatar_history table
CREATE TABLE IF NOT EXISTS "avatar_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'upload',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avatar_history_pkey" PRIMARY KEY ("id")
);

-- 3. Index on user_id for lookups (matches @@index([userId]) in schema)
CREATE INDEX IF NOT EXISTS "avatar_history_user_id_idx" ON "avatar_history"("user_id");

-- 4. Foreign key to users, cascade on delete (matches onDelete: Cascade)
ALTER TABLE "avatar_history"
  ADD CONSTRAINT "avatar_history_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;