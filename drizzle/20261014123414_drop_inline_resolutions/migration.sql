-- Custom SQL migration file, put your code below! ---- Files move from data URL columns into the S3 bucket, and the files stored so far are not carried
-- over. A resolution is nothing but its file, so the ones holding an inline PDF go; the next
-- migration then gives every resolution a required file reference.
DELETE FROM "resolution";
