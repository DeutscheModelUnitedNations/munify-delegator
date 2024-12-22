import { type PrismaClient } from '@prisma/client';

export async function devSeed(seedDb: PrismaClient) {
	console.info('---\n\n');
	console.info('Dev seeding');
	console.info('---');
	console.info('Creating conference');

	const conference = await seedDb.conference.create({
		data: {
			title: 'MUN-SH 2025',
			location: 'Kiel',
			website: 'https://mun-sh.de',
			startAssignment: new Date('2024-11-03T00:00:00.000Z'),
			startConference: new Date('2025-03-06T00:00:00.000Z'),
			endConference: new Date('2025-03-10T00:00:00.000Z')
		}
	});
	console.info(`  Created conference ${conference.title}`);

	console.info('Creating committees');

	const gvCountries = [
		// Overlap
		'KEN',
		'IND',
		'FRA',
		'USA',
		'BRA',
		'AUS',
		'ZAF',
		'JPN',
		'DEU',
		// New additions
		'ARG',
		'CAN',
		'CHN',
		'EGY',
		'GBR',
		'ITA',
		'MEX',
		'NGA',
		'RUS',
		'ESP',
		'THA',
		'TUR',
		'VNM',
		'SAU',
		'NZL',
		'PHL',
		'COL',
		'IRL',
		'NOR',
		'SWE'
	];

	const wisoCountries = ['KEN', 'IND', 'FRA', 'USA', 'BRA', 'AUS', 'ZAF', 'JPN', 'DEU'];

	console.info('  Creating Generalversammlung');

	const gv = await seedDb.committee.create({
		data: {
			name: 'Generalversammlung',
			conferenceId: conference.id,
			abbreviation: 'GV',
			numOfSeatsPerDelegation: 1
		}
	});

	console.info('  Creating Wirtschafts- und Sozialrat');

	const wiso = await seedDb.committee.create({
		data: {
			name: 'Wirtschafts- und Sozialrat',
			conferenceId: conference.id,
			abbreviation: 'WISO',
			numOfSeatsPerDelegation: 1
		}
	});

	console.info('Creating nations for committees');

	const gvNations = await seedDb.committee.update({
		where: { id: gv.id },
		data: {
			nations: {
				connect: gvCountries.map((c) => ({ alpha3Code: c.toLowerCase() }))
			}
		}
	});
	console.info(`  Connected nations to Generalversammlung`);

	const wisoNations = await seedDb.committee.update({
		where: { id: wiso.id },
		data: {
			nations: {
				connect: wisoCountries.map((c) => ({ alpha3Code: c.toLowerCase() }))
			}
		}
	});
	console.info(`  Connected nations to Wirtschafts- und Sozialrat`);
}
