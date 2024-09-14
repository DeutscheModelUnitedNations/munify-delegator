import { PrismaClient, Prisma } from '@prisma/client';
import { devSeed } from './dev.seed';
import worldCountries from 'world-countries';

const seedDb = new PrismaClient();

const isDev = process.env.NODE_ENV === 'development';

console.info('Main seeding script');
console.info('Devmode: ', isDev);
console.info('---');

console.info('Creating nations');
const countries = worldCountries.filter((c) => c.unMember);
await seedDb.nation.createMany({
	data: countries.map((c) => {
		console.info(`  Creating nation ${c.name.common}`);
		return { alpha2Code: c.cca2.toLowerCase(), alpha3Code: c.cca3.toLowerCase() };
	})
});

if (isDev) {
	await devSeed(seedDb);
}
