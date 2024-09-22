import { CustomConferenceRole, NonStateActor, PrismaClient } from '@prisma/client';
import committees from './countries_mun-sh_2025.json';

const NSAs = [
	{
		name: 'Global Witness',
		abbreviation: 'GW',
		seatAmount: 2,
		description:
			'Global Witness ist eine führende Organisation, die sich der Aufdeckung und Bekämpfung von Korruption sowie Umweltproblemen widmet, die unseren Planeten bedrohen. Sie konzentrieren sich auf aktuelle digitale Bedrohungen im Zusammenhang mit globalen Ereignissen wie den US-Wahlen und dem Klimawandel und liefern wichtige Einblicke in diese drängenden Themen.',
		fontAwesomeIcon: 'fa-globe'
	},
];

const singleRoles = [
	{
		name: 'Einzelanmeldung als Delegierte*r (Nation und NA)',
		description:
			'Die Einzelanmeldung als Delegierte*r eines Landes/als Vertreter*in einer NA ermöglicht es dir, an der Konferenz teilzunehmen, ohne anfangs einer Delegation anzugehören. Du wirst nach Ende der Anmeldung einer freien Delegation zugeordnet.',
		fontAwesomeIcon: 'fa-user-tie'
	},
	{
		name: 'Konferenzpresse',
		description:
			'Die Konferenzpresse ist für die Berichterstattung über das Konferenzgeschehen verantwortlich.',
		fontAwesomeIcon: 'fa-newspaper'
	}
];

const seedDb = new PrismaClient();

console.info('Seeding conference MUNBW 2025');
console.info('==============================\n');
console.info('Creating conference');

const conference = await seedDb.conference.create({
	data: {
		title: 'MUNBW 2025',
		longTitle: 'Model United Nations Baden-Württemberg 2025',
		location: 'Stuttgart',
		website: 'https://munbw.de',
		start: '2025-05-29T00:00:00.000Z',
		end: '2025-06-02T00:00:00.000Z',
		startRegistration: '2024-09-23T00:00:00.000Z',
		endRegistration: '2024-11-03T23:59:59.000Z',
		language: 'Deutsch',
		status: 'PRE'
	}
});
console.info("Creating conference's committees");

for (const committeeInput of committees) {
	const committee = await seedDb.committee.create({
		data: {
			name: committeeInput.name,
			abbreviation: committeeInput.abbreviation,
			conferenceId: conference.id,
			numOfSeatsPerDelegation: 1
		}
	});
	console.info(`  - Committee ${committeeInput.name} created`);

	for (const nationInput of committeeInput.nations) {
		console.info(`    - Connecting nation ${nationInput}`);
		try {
			await seedDb.nation.update({
				where: {
					alpha2Code: nationInput.toLowerCase()
				},
				data: {
					committees: {
						connect: {
							id: committee.id
						}
					}
				}
			});
		} catch (error) {
			console.error(`!! Nation ${nationInput} not found.`);
		}
	}
}

console.info('Creating NSAs and single roles');

for (const NSA of NSAs) {
	console.info(`  - Creating NSA ${NSA.name}`);
	await seedDb.nonStateActor.create({
		data: {
			...NSA,
			conferenceId: conference.id
		}
	});
}

console.info('Creating Custom Conference Roles');

for (const singleRole of singleRoles) {
	console.info(`  - Creating Role ${singleRole.name}`);
	await seedDb.customConferenceRole.create({
		data: {
			...singleRole,
			conferenceId: conference.id
		}
	});
}
