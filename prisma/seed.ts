import { PrismaClient, Prisma } from '@prisma/client';
import { devSeed } from './dev.seed';
import worldCountries from 'world-countries';

const seedDb = new PrismaClient();

console.info('Main seeding script');
console.info('Devmode: ', process.env.DEVMODE === 'true');
console.info('---');

console.info('Creating nations');
const countries = worldCountries.filter((c) => c.unMember);
await seedDb.nation.createMany({
	data: countries.map((c) => {
		console.info(`  Creating nation ${c.name.common}`);
		return { alpha2Code: c.cca2.toLowerCase(), alpha3Code: c.cca3.toLowerCase() };
	})
});

if (process.env.DEVMODE) {
	await devSeed(seedDb);
}
