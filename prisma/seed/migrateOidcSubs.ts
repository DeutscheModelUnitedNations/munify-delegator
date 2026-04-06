import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const IdMappingSchema = z.array(
	z.object({
		zitadel_id: z.string().min(1),
		logto_id: z.string().min(1),
		identifier: z.string().email()
	})
);

const filePath = process.argv[2];
if (!filePath) {
	console.error('Usage: bun prisma/seed/migrateOidcSubs.ts <path-to-id-mapping.json>');
	process.exit(1);
}

const raw = JSON.parse(readFileSync(resolve(filePath), 'utf-8'));
const mappings = IdMappingSchema.parse(raw);

console.log(`Parsed ${mappings.length} ID mappings`);

const db = new PrismaClient();

async function migrate() {
	// Dynamically discover all FK columns referencing User.id
	const fks = await db.$queryRaw<{ table_name: string; column_name: string }[]>`
		SELECT
			kcu.table_name,
			kcu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage ccu
			ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND ccu.table_name = 'User'
			AND ccu.column_name = 'id'
	`;

	console.log(
		`Found ${fks.length} FK columns referencing User.id:`,
		fks.map((fk) => `${fk.table_name}.${fk.column_name}`)
	);

	let updated = 0;
	let skipped = 0;

	for (const mapping of mappings) {
		const existingUser = await db.user.findUnique({
			where: { id: mapping.zitadel_id }
		});

		if (!existingUser) {
			console.log(`  SKIP ${mapping.identifier} — no user with zitadel_id ${mapping.zitadel_id}`);
			skipped++;
			continue;
		}

		await db.$transaction(async (tx) => {
			const { id: _, ...userData } = existingUser;

			// 1. Create new user with temporary email to avoid unique constraint
			await tx.user.create({
				data: { id: mapping.logto_id, ...userData, email: `__migrating__${userData.email}` }
			});

			// 2. Move all FK references to the new user ID
			for (const fk of fks) {
				await tx.$executeRawUnsafe(
					`UPDATE "${fk.table_name}" SET "${fk.column_name}" = $1 WHERE "${fk.column_name}" = $2`,
					mapping.logto_id,
					mapping.zitadel_id
				);
			}

			// 3. Delete the old user
			await tx.user.delete({ where: { id: mapping.zitadel_id } });

			// 4. Restore the real email
			await tx.user.update({
				where: { id: mapping.logto_id },
				data: { email: userData.email }
			});
		});

		console.log(`  OK   ${mapping.identifier}: ${mapping.zitadel_id} → ${mapping.logto_id}`);
		updated++;
	}

	console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

migrate()
	.catch((e) => {
		console.error('Migration failed:', e);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
