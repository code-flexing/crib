ALTER TABLE "provider_pages"
ADD COLUMN "account_mode_conversion_consented" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "provider_pages" AS page
SET "verification_state" = 'REJECTED',
		"verification_notes" = 'Confirm provider account conversion and resubmit.',
		"submitted_at" = NULL
FROM "users" AS account
WHERE page."owner_id" = account."id"
	AND account."role" = 'STUDENT'
	AND page."verification_state" = 'SUBMITTED';

UPDATE "admin_review_queue"
SET "status" = 'REJECTED',
		"review_notes" = 'Confirm provider account conversion and resubmit.',
		"rejection_reason" = 'Confirm provider account conversion and resubmit.',
		"reviewed_at" = CURRENT_TIMESTAMP
WHERE "entity_type" = 'provider_page'
	AND "reviewType" = 'CREATE_PAGE'
	AND "status" = 'PENDING'
	AND "entity_id" IN (
		SELECT page."id"
		FROM "provider_pages" AS page
		JOIN "users" AS account ON account."id" = page."owner_id"
		WHERE account."role" = 'STUDENT'
			AND page."verification_state" = 'REJECTED'
			AND page."verification_notes" = 'Confirm provider account conversion and resubmit.'
	);