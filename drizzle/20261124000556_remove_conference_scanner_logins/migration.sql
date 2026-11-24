-- Scanner logins belong to a person from the next migration on; those of a conference cannot be taken over.
DELETE FROM "scanner_access";
