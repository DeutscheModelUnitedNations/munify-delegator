import { PrismaClient, Prisma } from '@prisma/client';
const seedDb = new PrismaClient();

await seedDb.conference.create({
	data: {
		title: 'MUN-SH 2025',
		start: undefined,
		end: undefined,
		location: 'Kiel',
		website: 'https://mun-sh.de'
	}
});
