CREATE TABLE "provider_recommendations" (
    "id" TEXT NOT NULL,
    "recommender_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provider_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_activity_days" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "active_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provider_activity_days_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_likes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "gif_url" TEXT,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comment_mentions" (
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_mentions_pkey" PRIMARY KEY ("comment_id", "user_id")
);

CREATE TABLE "user_follows" (
    "follower_id" TEXT NOT NULL,
    "followed_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id", "followed_id"),
    CONSTRAINT "user_follows_no_self_follow" CHECK ("follower_id" <> "followed_id")
);

CREATE TABLE "page_follows" (
    "follower_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_follows_pkey" PRIMARY KEY ("follower_id", "page_id")
);

CREATE TABLE "listing_views" (
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "first_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_views_pkey" PRIMARY KEY ("user_id", "listing_id")
);

CREATE UNIQUE INDEX "provider_recommendations_recommender_id_provider_id_key"
ON "provider_recommendations"("recommender_id", "provider_id");
CREATE INDEX "provider_recommendations_provider_id_created_at_idx"
ON "provider_recommendations"("provider_id", "created_at");
CREATE UNIQUE INDEX "provider_activity_days_provider_id_active_date_key"
ON "provider_activity_days"("provider_id", "active_date");
CREATE INDEX "provider_activity_days_provider_id_active_date_idx"
ON "provider_activity_days"("provider_id", "active_date");
CREATE UNIQUE INDEX "listing_likes_user_id_listing_id_key"
ON "listing_likes"("user_id", "listing_id");
CREATE INDEX "listing_likes_listing_id_created_at_idx"
ON "listing_likes"("listing_id", "created_at");
CREATE INDEX "listing_comments_listing_id_parent_id_created_at_idx"
ON "listing_comments"("listing_id", "parent_id", "created_at");
CREATE INDEX "comment_mentions_user_id_created_at_idx"
ON "comment_mentions"("user_id", "created_at");
CREATE INDEX "user_follows_followed_id_created_at_idx"
ON "user_follows"("followed_id", "created_at");
CREATE INDEX "page_follows_page_id_created_at_idx"
ON "page_follows"("page_id", "created_at");
CREATE INDEX "listing_views_listing_id_first_viewed_at_idx"
ON "listing_views"("listing_id", "first_viewed_at");

ALTER TABLE "provider_recommendations"
ADD CONSTRAINT "provider_recommendations_recommender_id_fkey"
FOREIGN KEY ("recommender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_recommendations"
ADD CONSTRAINT "provider_recommendations_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_activity_days"
ADD CONSTRAINT "provider_activity_days_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_likes"
ADD CONSTRAINT "listing_likes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_likes"
ADD CONSTRAINT "listing_likes_listing_id_fkey"
FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_comments"
ADD CONSTRAINT "listing_comments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_comments"
ADD CONSTRAINT "listing_comments_listing_id_fkey"
FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_comments"
ADD CONSTRAINT "listing_comments_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "listing_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment_mentions"
ADD CONSTRAINT "comment_mentions_comment_id_fkey"
FOREIGN KEY ("comment_id") REFERENCES "listing_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment_mentions"
ADD CONSTRAINT "comment_mentions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_follows"
ADD CONSTRAINT "user_follows_follower_id_fkey"
FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_follows"
ADD CONSTRAINT "user_follows_followed_id_fkey"
FOREIGN KEY ("followed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "page_follows"
ADD CONSTRAINT "page_follows_follower_id_fkey"
FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "page_follows"
ADD CONSTRAINT "page_follows_page_id_fkey"
FOREIGN KEY ("page_id") REFERENCES "provider_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_views"
ADD CONSTRAINT "listing_views_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_views"
ADD CONSTRAINT "listing_views_listing_id_fkey"
FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "users" SET "trust_score" = NULL, "trust_score_updated_at" = NULL;
