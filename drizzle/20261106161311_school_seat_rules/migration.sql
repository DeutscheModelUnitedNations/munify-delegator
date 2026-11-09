ALTER TABLE "conference" ADD COLUMN "max_collective_group_size" integer DEFAULT 16;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "max_guaranteed_seats_per_foreign_school" integer DEFAULT 12;--> statement-breakpoint
ALTER TABLE "school" ADD COLUMN "is_foreign_school" boolean DEFAULT false NOT NULL;