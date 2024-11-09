import { CustomConferenceRole, NonStateActor, PrismaClient } from '@prisma/client';
import committees from './countries_munbw_2025.json';
import NSAs from './nsa_munbw_2025.json';

const singleRoles = [
	{
		name: 'Einzelanmeldung als Delegierte*r (Nation und NA)',
		description:
			'Die Einzelanmeldung als Delegierte*r eines Landes/als Vertreter*in einer NA ermöglicht es dir, an der Konferenz teilzunehmen, ohne anfangs einer Delegation anzugehören. Du wirst nach Ende der Anmeldung einer freien Delegation zugeordnet.',
		fontAwesomeIcon: 'fa-user-tie'
	},
	{
		name: 'IGH Richter',
		description:
			'Richter des Internationalen Gerichtshofs (IGH) sind für die Rechtsprechung nach internationalem Recht verantwortlich. Dies beinhaltet Entscheidungen über Verantwortungen von Staaten oder auch Schuld von Individuen.',
		fontAwesomeIcon: 'fa-gavel'
	},
	{
		name: 'Prozessbevollmächtigte',
		description:
			'Prozessbevollmächtigte vertreten Parteien in Gerichtsverfahren. Sie sprechen und handeln zum Beispiel im Namen einer Angeklagten oder anderweitig betroffenen Partei.',
		fontAwesomeIcon: 'fa-book-section'
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
		language: 'Deutsch',
		startRegistration: new Date('2024-10-01T00:00:00.000Z'),
		startAssignment: new Date('2024-11-30T00:00:00.000Z'),
		startConference: new Date('2025-05-29T00:00:00.000Z'),
		endConference: new Date('2025-06-02T00:00:00.000Z')
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
					alpha3Code: nationInput.toLowerCase()
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
