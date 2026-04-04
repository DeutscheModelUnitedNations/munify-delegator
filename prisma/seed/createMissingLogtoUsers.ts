import { PrismaClient } from '@prisma/client';

const LOGTO_ENDPOINT = process.env.LOGTO_ENDPOINT || 'http://localhost:3001';
const LOGTO_TOKEN = process.env.LOGTO_TOKEN;

if (!LOGTO_TOKEN) {
	console.error(
		'Error: LOGTO_TOKEN not set. Get one from the Logto admin console (http://localhost:3002).'
	);
	process.exit(1);
}

const db = new PrismaClient();

const ZITADEL_IDS = ['287932620396822530', '274935677744381955', '280288225489059842'];

async function main() {
	const users = await db.user.findMany({
		where: { id: { in: ZITADEL_IDS } },
		select: { id: true, email: true, given_name: true, family_name: true, preferred_username: true }
	});

	console.log(`Found ${users.length} users to create in Logto\n`);

	// Discover all FK columns referencing User.id
	const fks = await db.$queryRaw<{ table_name: string; column_name: string }[]>`
		SELECT kcu.table_name, kcu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage ccu
			ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND ccu.table_name = 'User' AND ccu.column_name = 'id'
	`;

	for (const user of users) {
		// 1. Create user in Logto
		const response = await fetch(`${LOGTO_ENDPOINT}/api/users`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${LOGTO_TOKEN}`
			},
			body: JSON.stringify({
				primaryEmail: user.email,
				username: user.preferred_username.replace(/[@.]/g, '_'),
				name: `${user.given_name} ${user.family_name}`,
				customData: {
					zitadelId: user.id,
					migratedAt: new Date().toISOString(),
					firstName: user.given_name,
					lastName: user.family_name
				}
			})
		});

		const body = await response.json();

		if (!response.ok) {
			console.error(`  FAIL ${user.email}:`, body.message || JSON.stringify(body));
			continue;
		}

		const logtoId = body.id;
		console.log(`  Created ${user.email} in Logto: ${logtoId}`);

		// 2. Migrate the sub in the DB
		const existingUser = await db.user.findUnique({ where: { id: user.id } });
		if (!existingUser) continue;

		await db.$transaction(async (tx) => {
			const { id: _, ...userData } = existingUser;

			await tx.user.create({
				data: { id: logtoId, ...userData, email: `__migrating__${userData.email}` }
			});

			for (const fk of fks) {
				await tx.$executeRawUnsafe(
					`UPDATE "${fk.table_name}" SET "${fk.column_name}" = $1 WHERE "${fk.column_name}" = $2`,
					logtoId,
					user.id
				);
			}

			await tx.user.delete({ where: { id: user.id } });
			await tx.user.update({ where: { id: logtoId }, data: { email: userData.email } });
		});

		console.log(`  Migrated ${user.email}: ${user.id} → ${logtoId}`);
	}

	console.log('\nDone.');
}

main()
	.catch((e) => {
		console.error('Failed:', e);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
