-- Carries the agreements given so far (version 1, one confirmation, stored on the user row) over
-- into `messaging_terms_acceptance`. What they were shown is not known any more, so locale and
-- content hash stay empty. Version 2 asks everybody again; these rows are the record.
INSERT INTO messaging_terms_acceptance (id, created_at, user_id, version, revision, locale, content_hash, confirmation_ids)
SELECT
	replace(gen_random_uuid()::text, '-', ''),
	coalesce(messaging_terms_accepted_at, CURRENT_TIMESTAMP),
	id,
	messaging_terms_version,
	0,
	NULL,
	NULL,
	ARRAY['read-and-follow']
FROM "user"
WHERE messaging_terms_version IS NOT NULL;
