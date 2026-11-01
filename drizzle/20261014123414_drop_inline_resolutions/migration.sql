-- Custom SQL migration file, put your code below! --
-- Deleted every resolution once, when inline files were not carried over into the bucket. They
-- are now (`stored_files` moves each inline file into a `stored_file`), so this does nothing.
SELECT 1;
