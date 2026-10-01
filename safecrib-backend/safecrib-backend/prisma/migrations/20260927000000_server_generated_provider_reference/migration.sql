-- Replace legacy client-provided references with stable values derived from
-- the unique Page ID before enforcing the server-owned reference contract.
UPDATE "provider_pages"
SET "business_reg_number" = 'SC-' || UPPER(REPLACE("id", '-', ''));

ALTER TABLE "provider_pages"
ALTER COLUMN "business_reg_number" SET NOT NULL;

CREATE UNIQUE INDEX "provider_pages_business_reg_number_key"
ON "provider_pages"("business_reg_number");