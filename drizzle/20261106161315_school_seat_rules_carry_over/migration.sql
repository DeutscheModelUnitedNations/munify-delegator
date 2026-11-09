-- The limit per school becomes the size up to which a school's group is decided on together; a
-- conference keeps the number it had, and one that had none keeps the rule switched off.
UPDATE "conference" SET "max_collective_group_size" = "max_seats_per_school";
