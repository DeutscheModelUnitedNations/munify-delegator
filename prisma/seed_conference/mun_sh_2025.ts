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
	{
		name: 'Human Rights Watch',
		abbreviation: 'HRW',
		seatAmount: 2,
		description:
			'Human Rights Watch gilt als eine der neutralsten und glaubwürdigsten Menschenrechtsorganisationen weltweit. Sie bieten eine umfassende Website für Recherchen, die wertvolle Ressourcen und Berichte über Menschenrechtsverletzungen bereitstellt und sich für Gerechtigkeit auf der ganzen Welt einsetzt.',
		fontAwesomeIcon: 'fa-shield-alt'
	},
	{
		name: 'Oceana',
		abbreviation: 'OCE',
		seatAmount: 2,
		description:
			'Oceana ist eine führende Organisation, die sich auf den Schutz der Ozeane konzentriert und umfassende Forschungen zu Themen im Zusammenhang mit der Internationalen Seeschifffahrtsorganisation (IMO) durchführt. Sie setzen sich für nachhaltige Fischereipraktiken und den Schutz mariner Ökosysteme ein und leisten bedeutende Beiträge zur Gesundheit der Ozeane.',
		fontAwesomeIcon: 'fa-water'
	},
	{
		name: 'Tax Justice Network',
		abbreviation: 'TJN',
		seatAmount: 2,
		description:
			'Das Tax Justice Network ist eine Allround-Organisation, die sich mit Fragen zu Steuerkonventionen und Korruption befasst. Sie zielen darauf ab, Transparenz in globalen Steuersystemen zu fördern und sich für faire Steuerpolitiken einzusetzen, die allen Bürgern zugutekommen.',
		fontAwesomeIcon: 'fa-money-bill-wave'
	},
	{
		name: 'Welthungerhilfe',
		abbreviation: 'WHH',
		seatAmount: 2,
		description:
			'Die Welthungerhilfe ist eine renommierte deutsche Organisation, die sich dem Kampf gegen Hunger und der Förderung nachhaltiger Entwicklung widmet. Ihre Arbeit ist eng mit verschiedenen sozioökonomischen Themen verbunden und macht sie zu einer wichtigen Ressource für Recherche und humanitäre Bemühungen in Deutschland und darüber hinaus.',
		fontAwesomeIcon: 'fa-utensils'
	},
	{
		name: 'Latin America Working Group',
		abbreviation: 'LAWG',
		seatAmount: 2,
		description:
			'Die Latin America Working Group setzt sich für die Behandlung kritischer Themen in Lateinamerika ein, darunter Menschenrechte und Umweltschutz. Ihr Fokus auf vielfältige Themen macht sie zu einem unverzichtbaren Partner für Organisationen, die mit lateinamerikanischen Gemeinschaften zusammenarbeiten möchten.',
		fontAwesomeIcon: 'fa-globe-americas'
	},
	{
		name: 'Pan American Development Foundation',
		abbreviation: 'PADF',
		seatAmount: 2,
		description:
			'Die Pan American Development Foundation ist eine vielseitige NGO, die sich an verschiedenen Entwicklungsinitiativen in den Amerikas beteiligt. Ihre Arbeit umfasst wirtschaftliche Entwicklung, Stadtplanung und soziale Gerechtigkeit und macht sie zu einem wichtigen Akteur in den regionalen Entwicklungsbemühungen.',
		fontAwesomeIcon: 'fa-building'
	},
	{
		name: 'NGO-Arbeitsgruppe für Frauen, Frieden und Sicherheit',
		abbreviation: 'NGO-FPS',
		seatAmount: 2,
		description:
			'Die NGO-Arbeitsgruppe für Frauen, Frieden und Sicherheit vereint verschiedene NGOs, um Sicherheitsfragen zu behandeln, die Frauen weltweit betreffen. Ihr kollaborativer Ansatz vereinfacht die Recherche- und Advocacy-Bemühungen und macht sie zu einem hervorragenden Einstiegspunkt für Neueinsteiger in diesem Bereich.',
		fontAwesomeIcon: 'fa-people-dress'
	},
	{
		name: 'UNICEF',
		abbreviation: 'UNICEF',
		seatAmount: 2,
		description:
			'UNICEF ist eine führende humanitäre Organisation, die eine Vielzahl von Themen behandelt, die Kinder und Familien weltweit betreffen. Mit einer robusten deutschen Website und verfügbaren Ressourcen dient sie als zugänglicher Einstiegspunkt für Interessierte an humanitären Bemühungen und Kinderwohlfahrt.',
		fontAwesomeIcon: 'fa-child-reaching'
	}
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

console.info('Seeding conference MUN-SH 2025');
console.info('==============================\n');
console.info('Creating conference');

const conference = await seedDb.conference.create({
	data: {
		title: 'MUN-SH 2025',
		longTitle: 'Model United Nations Schleswig-Holstein 2025',
		location: 'Kiel',
		website: 'https://mun-sh.de',
		language: 'Deutsch',
		startRegistration: new Date('2024-10-01T00:00:00.000Z'),
		startAssignment: new Date('2024-11-03T00:00:00.000Z'),
		startConference: new Date('2025-03-06T00:00:00.000Z'),
		endConference: new Date('2025-03-10T00:00:00.000Z')
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
