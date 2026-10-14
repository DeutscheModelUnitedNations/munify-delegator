-- Hand-edited on top of drizzle-kit's output: the Prisma version of the app gained the content lead
-- role and the committees' regional baselines after the baseline was cut, so a database Prisma
-- already migrated has them ("RegionalBaseline", camelCase columns, a nullable target list). There
-- they are renamed into place, keeping their values; everywhere else they are created.
ALTER TYPE "team_role" ADD VALUE IF NOT EXISTS 'CONTENT_LEAD';--> statement-breakpoint
DO $seat_planning$
BEGIN
	IF to_regtype('"RegionalBaseline"') IS NOT NULL THEN
		ALTER TYPE "RegionalBaseline" RENAME TO "regional_baseline";
		ALTER TABLE "committee" RENAME COLUMN "regionalBaseline" TO "regional_baseline";
		ALTER TABLE "committee" RENAME COLUMN "regionalBaselineTargets" TO "regional_baseline_targets";
		UPDATE "committee" SET "regional_baseline_targets" = '{}' WHERE "regional_baseline_targets" IS NULL;
		ALTER TABLE "committee" ALTER COLUMN "regional_baseline_targets" SET DEFAULT '{}'::integer[];
		ALTER TABLE "committee" ALTER COLUMN "regional_baseline_targets" SET NOT NULL;
		RETURN;
	END IF;

CREATE TYPE "regional_baseline" AS ENUM('UN_MEMBERS', 'HUMAN_RIGHTS_COUNCIL', 'ECOSOC', 'SECURITY_COUNCIL', 'MANUAL');
ALTER TABLE "committee" ADD COLUMN "regional_baseline" "regional_baseline" DEFAULT 'UN_MEMBERS'::"regional_baseline" NOT NULL;
ALTER TABLE "committee" ADD COLUMN "regional_baseline_targets" integer[] DEFAULT '{}'::integer[] NOT NULL;
END
$seat_planning$;
