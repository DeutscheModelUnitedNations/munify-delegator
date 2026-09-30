import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * One-time step for deploying this migration to a database that already has the schema from
 * before the Drizzle switch (i.e. production, migrated by the old Prisma migrations).
 *
 * The baseline migration's `migration.sql` is a full `CREATE TABLE` dump — running it against a
 * database that already has those tables fails. Drizzle's migrator has an `init` mode for exactly
 * this: given a migrations folder holding a single migration, and an empty migrations bookkeeping
 * table, it records that migration as applied without executing its SQL. `init` refuses to run
 * (`{ exitCode: 'localMigrations' }`) when the folder holds more than one migration, so this
 * copies out just the baseline folder — `20260924224020_baseline` — into a temp directory rather
 * than pointing it at `./drizzle`, which also holds the two migrations that follow the baseline
 * and must actually run. Verified end-to-end against a throwaway database: init-mark the baseline,
 * then `drizzle-kit migrate` against the real `./drizzle` folder applies exactly the two
 * follow-up migrations (matched by folder name, not hash) and nothing tries to recreate a table.
 *
 * This step is a no-op if the bookkeeping table already has rows, so running it more than once,
 * or against a database that never had the pre-Drizzle schema, is safe.
 *
 * Run this once, then `bun run db:migrate` as usual to apply the two migrations that follow the
 * baseline for real (`snake_case_alignment`, `join_table_surrogate_ids`).
 *
 * Run outside SvelteKit (`bun run db:migrate:baseline`), so the connection string comes straight
 * off the process rather than through `$config/private`.
 */
const db = drizzle(process.env.DATABASE_URL!);

const baselineOnly = mkdtempSync(join(tmpdir(), 'delegator-baseline-'));
cpSync('./drizzle/20260924224020_baseline', join(baselineOnly, '20260924224020_baseline'), {
	recursive: true
});

try {
	// TYPE-SAFETY-EXCEPTION: `init` is real at runtime (drizzle-orm's migrator checks
	// `config.init` as a plain property) but the published `MigrationConfig` type only exposes it
	// for drizzle-kit's own internal `pull --init` caller, not for `migrate()`. Verified by reading
	// node_modules/drizzle-orm/pg-core/async/session.cjs and by running this exact call against a
	// throwaway database.
	const result = await migrate(db, {
		migrationsFolder: baselineOnly,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see TYPE-SAFETY-EXCEPTION above
		...({ init: true } as any)
	});

	if (result?.exitCode === 'databaseMigrations') {
		console.info('Migrations bookkeeping table already has rows; nothing to do.');
	} else {
		console.info('Baseline migration marked as applied.');
	}
} finally {
	rmSync(baselineOnly, { recursive: true, force: true });
}

process.exit(0);
