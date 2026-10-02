import type { Committee, CustomConferenceRole, NonStateActor } from '@prisma/client';

// Realistic names for the dev seed so screenshots and docs look like an actual MUN conference.
// fontAwesomeIcon values are bare icon names (no `fa-` prefix), rendered as `fa-duotone fa-<name>`.

export type ConferenceTemplate = { title: string; longTitle: string; location: string };

export const CONFERENCES: ConferenceTemplate[] = [
	{
		title: 'MUN-SH',
		longTitle: 'Model United Nations Schleswig-Holstein',
		location: 'Kiel'
	},
	{
		title: 'MUN-BW',
		longTitle: 'Model United Nations Baden-Württemberg',
		location: 'Stuttgart'
	},
	{
		title: 'MUNBB',
		longTitle: 'Model United Nations Berlin-Brandenburg',
		location: 'Berlin'
	},
	{
		title: 'MUN-NDS',
		longTitle: 'Model United Nations Niedersachsen',
		location: 'Hannover'
	},
	{
		title: 'MUN-SAX',
		longTitle: 'Model United Nations Sachsen',
		location: 'Dresden'
	}
];

export type CommitteeTemplate = Pick<
	Committee,
	'name' | 'abbreviation' | 'numOfSeatsPerDelegation'
>;

export const COMMITTEES: CommitteeTemplate[] = [
	{ name: 'Generalversammlung', abbreviation: 'GV', numOfSeatsPerDelegation: 1 },
	{ name: 'Sicherheitsrat', abbreviation: 'SR', numOfSeatsPerDelegation: 2 },
	{ name: 'Wirtschafts- und Sozialrat', abbreviation: 'WiSo', numOfSeatsPerDelegation: 1 },
	{ name: 'Menschenrechtsrat', abbreviation: 'MRR', numOfSeatsPerDelegation: 1 },
	{ name: 'Umweltversammlung', abbreviation: 'UV', numOfSeatsPerDelegation: 1 },
	{ name: 'Weltgesundheitsversammlung', abbreviation: 'WGV', numOfSeatsPerDelegation: 1 },
	{
		name: 'Ernährungs- und Landwirtschaftsorganisation',
		abbreviation: 'FAO',
		numOfSeatsPerDelegation: 1
	},
	{
		name: 'Internationale Seeschifffahrtsorganisation',
		abbreviation: 'IMO',
		numOfSeatsPerDelegation: 1
	},
	{
		name: 'Kommission für Friedenskonsolidierung',
		abbreviation: 'KFK',
		numOfSeatsPerDelegation: 1
	},
	{ name: 'Abrüstungskommission', abbreviation: 'ABK', numOfSeatsPerDelegation: 1 }
];

export type NonStateActorTemplate = Pick<
	NonStateActor,
	'name' | 'abbreviation' | 'description' | 'fontAwesomeIcon'
>;

export const NON_STATE_ACTORS: NonStateActorTemplate[] = [
	{
		name: 'Human Rights Watch',
		abbreviation: 'HRW',
		description:
			'Dokumentiert weltweit Menschenrechtsverletzungen und übt Druck auf Regierungen aus.',
		fontAwesomeIcon: 'scale-balanced'
	},
	{
		name: 'Amnesty International',
		abbreviation: 'AI',
		description:
			'Setzt sich mit Kampagnen und Eilaktionen für gewaltlose politische Gefangene ein.',
		fontAwesomeIcon: 'bullhorn'
	},
	{
		name: 'Greenpeace',
		abbreviation: 'GP',
		description:
			'Macht mit friedlichem Protest auf Umweltzerstörung und die Klimakrise aufmerksam.',
		fontAwesomeIcon: 'leaf'
	},
	{
		name: 'World Wide Fund for Nature',
		abbreviation: 'WWF',
		description:
			'Schützt bedrohte Arten und ihre Lebensräume und fördert nachhaltige Ressourcennutzung.',
		fontAwesomeIcon: 'paw'
	},
	{
		name: 'Transparency International',
		abbreviation: 'TI',
		description:
			'Bekämpft Korruption in Politik und Wirtschaft und veröffentlicht den Korruptionsindex.',
		fontAwesomeIcon: 'eye'
	},
	{
		name: 'Plan International',
		abbreviation: 'Plan',
		description: 'Fördert Kinderrechte und die Gleichberechtigung von Mädchen weltweit.',
		fontAwesomeIcon: 'hands-holding-child'
	},
	{
		name: 'Internationales Komitee vom Roten Kreuz',
		abbreviation: 'IKRK',
		description:
			'Leistet neutrale humanitäre Hilfe und schützt Zivilpersonen in bewaffneten Konflikten.',
		fontAwesomeIcon: 'kit-medical'
	},
	{
		name: 'Ärzte ohne Grenzen',
		abbreviation: 'MSF',
		description:
			'Leistet medizinische Nothilfe in Krisengebieten, unabhängig von politischen Interessen.',
		fontAwesomeIcon: 'user-doctor'
	},
	{
		name: 'Oxfam',
		abbreviation: 'OXF',
		description: 'Bekämpft Armut und soziale Ungleichheit durch Nothilfe, Projekte und Advocacy.',
		fontAwesomeIcon: 'hand-holding-heart'
	},
	{
		name: 'Reporter ohne Grenzen',
		abbreviation: 'RSF',
		description: 'Setzt sich weltweit für Pressefreiheit und den Schutz von Journalist*innen ein.',
		fontAwesomeIcon: 'newspaper'
	},
	{
		name: 'Save the Children',
		abbreviation: 'STC',
		description:
			'Verbessert die Lebensbedingungen von Kindern durch Bildung, Gesundheit und Schutz.',
		fontAwesomeIcon: 'child'
	},
	{
		name: 'Internationale Organisation für Migration',
		abbreviation: 'IOM',
		description: 'Unterstützt Staaten und Migrierende bei einer geordneten und sicheren Migration.',
		fontAwesomeIcon: 'route'
	},
	{
		name: 'Fridays for Future',
		abbreviation: 'FFF',
		description: 'Globale Jugendbewegung, die entschlossenes Handeln gegen die Klimakrise fordert.',
		fontAwesomeIcon: 'earth-europe'
	},
	{
		name: 'Internationales Olympisches Komitee',
		abbreviation: 'IOC',
		description:
			'Organisiert die Olympischen Spiele und fördert Sport als Mittel der Völkerverständigung.',
		fontAwesomeIcon: 'medal'
	},
	{
		name: 'Weltwirtschaftsforum',
		abbreviation: 'WEF',
		description: 'Bringt Akteur*innen aus Wirtschaft, Politik und Zivilgesellschaft zusammen.',
		fontAwesomeIcon: 'chart-line'
	},
	{
		name: 'Afrikanische Union',
		abbreviation: 'AU',
		description:
			'Fördert Einheit, Frieden und wirtschaftliche Integration der afrikanischen Staaten.',
		fontAwesomeIcon: 'earth-africa'
	},
	{
		name: 'Europäische Union',
		abbreviation: 'EU',
		description: 'Politischer und wirtschaftlicher Staatenverbund mit Beobachterstatus bei den VN.',
		fontAwesomeIcon: 'flag'
	},
	{
		name: 'Internationaler Gewerkschaftsbund',
		abbreviation: 'IGB',
		description:
			'Vertritt die Interessen von Arbeitnehmer*innen und setzt sich für faire Arbeit ein.',
		fontAwesomeIcon: 'people-group'
	},
	{
		name: 'Wikimedia Foundation',
		abbreviation: 'WMF',
		description: 'Betreibt Wikipedia und setzt sich für freien Zugang zu Wissen ein.',
		fontAwesomeIcon: 'book-open'
	},
	{
		name: 'Internationale Atomenergie-Organisation',
		abbreviation: 'IAEO',
		description: 'Fördert die friedliche Nutzung der Kernenergie und überwacht Nichtverbreitung.',
		fontAwesomeIcon: 'atom'
	}
];

export type CustomConferenceRoleTemplate = Pick<
	CustomConferenceRole,
	'name' | 'description' | 'fontAwesomeIcon' | 'seatAmount'
>;

export const CUSTOM_CONFERENCE_ROLES: CustomConferenceRoleTemplate[] = [
	{
		name: 'Konferenzpresse',
		description: 'Berichtet über die Gremien, führt Interviews und veröffentlicht Artikel.',
		fontAwesomeIcon: 'newspaper',
		seatAmount: 8
	},
	{
		name: 'Einzelanmeldung Delegierte*r',
		description: 'Anmeldung als Einzelperson für einen zufällig zugeteilten freien Platz.',
		fontAwesomeIcon: 'user-tie',
		seatAmount: 20
	},
	{
		name: 'Richter*in am Internationalen Gerichtshof',
		description: 'Verhandelt einen fiktiven Rechtsstreit zwischen zwei Staaten.',
		fontAwesomeIcon: 'gavel',
		seatAmount: 5
	},
	{
		name: 'Konferenzfotograf*in',
		description: 'Dokumentiert die Konferenz in Bildern für Presse und soziale Medien.',
		fontAwesomeIcon: 'camera',
		seatAmount: 2
	},
	{
		name: 'Assistenz des Generalsekretariats',
		description: 'Unterstützt das Generalsekretariat bei der Organisation während der Konferenz.',
		fontAwesomeIcon: 'briefcase',
		seatAmount: 3
	},
	{
		name: 'NGO-Beobachter*in',
		description:
			'Beobachtet die Verhandlungen und bringt die Perspektive der Zivilgesellschaft ein.',
		fontAwesomeIcon: 'binoculars',
		seatAmount: 4
	}
];
