-- Papers, reviews and reviewer snippets saved by the Prisma version of the app could hold their
-- document as a JSON string ("{\"type\":\"doc\",…}") rather than as the JSON object itself. The
-- editor takes a string for HTML and showed the raw JSON as text. Every such value that parses as
-- a JSON object (or array) is replaced by what it parses to; anything else is left alone, so a
-- string that is not JSON cannot fail the migration.
--
-- Pasted text can carry NUL characters, escaped as \u0000 in the string. jsonb cannot hold NUL
-- (22P05 untranslatable_character), so those escapes are dropped before parsing; an escaped
-- backslash followed by "u0000" (\\u0000, literal text) is kept. Any other value that still does
-- not parse is skipped rather than failing the whole migration.
DO $unwrap$
DECLARE
	target record;
	row_ record;
	raw text;
	parsed jsonb;
BEGIN
	FOR target IN
		SELECT * FROM (VALUES
			('paper_version', 'content'),
			('paper_review', 'comments'),
			('reviewer_snippet', 'content')
		) AS t(tbl, col)
	LOOP
		FOR row_ IN EXECUTE format(
			'SELECT id, %I #>> ''{}'' AS raw FROM %I WHERE jsonb_typeof(%I) = ''string''',
			target.col, target.tbl, target.col
		)
		LOOP
			BEGIN
				raw := row_.raw;
				LOOP
					parsed := regexp_replace(raw, '(?<!\\)((?:\\\\)*)\\u0000', '\1', 'g')::jsonb;
					-- some were encoded twice
					EXIT WHEN jsonb_typeof(parsed) <> 'string';
					raw := parsed #>> '{}';
				END LOOP;
			EXCEPTION WHEN data_exception THEN
				CONTINUE;
			END;
			IF jsonb_typeof(parsed) IN ('object', 'array') THEN
				EXECUTE format('UPDATE %I SET %I = $1 WHERE id = $2', target.tbl, target.col)
					USING parsed, row_.id;
			END IF;
		END LOOP;
	END LOOP;
END
$unwrap$;
