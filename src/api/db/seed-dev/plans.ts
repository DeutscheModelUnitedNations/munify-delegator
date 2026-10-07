import type { Insert } from '../rows';

/**
 * The conferences the dev seed creates. Each one pins down one stage of a conference's life, and
 * the ones sharing a state differ in the flags and dates the UI branches on:
 *
 * - the registration window has three distinct moments: open, closed in the UI but still inside
 *   the server's grace period, and closed for good while the team assigns seats;
 * - preparation comes once with every step unlocked and once with nothing unlocked, no fee, no
 *   templates and no announcement - the "not yet possible" and "missing configuration" paths.
 *   The locked one has not released its assignment either, so its participants are still
 *   waiting for their role while the team already sees it.
 */

export type ConferenceKey =
	| 'pre'
	| 'registration'
	| 'grace'
	| 'closed'
	| 'preparation'
	| 'locked'
	| 'active'
	| 'post'
	| 'second';

export interface ConferencePlan {
	key: ConferenceKey;
	/** Short summary for the console overview. */
	summary: string;
	conference: Pick<Insert<'conference'>, 'title' | 'longTitle' | 'state'> &
		Partial<Insert<'conference'>>;
	/** Days from now; negative is in the past. */
	days: { startAssignment: number; startConference: number; endConference: number };
	/** Whether seats are handed out: delegations hold nations, singles hold roles. */
	assigned: boolean;
	/** Which optional parts of the conference are filled in. */
	with: {
		templates: boolean;
		certificate: boolean;
		calendar: boolean;
		papers: boolean;
		surveys: boolean;
		attendance: boolean;
		participantStatus: boolean;
		/** Shape the waiting list to show this status light; absent = no waiting list. */
		waitingList?: 'VACANCIES' | 'LONG_LIST';
		invitations: boolean;
		/** An assignment draft in progress: ratings, a split and a few planned roles. */
		assignmentDraft?: boolean;
	};
	/** How much anonymous crowd to add around the personas. */
	crowd: {
		committees: number;
		nationsPerCommittee: [number, number];
		nonStateActors: number;
		customRoles: number;
		delegations: number;
		singles: number;
		supervisors: number;
		team: number;
	};
}

export const seedConferenceId = (key: ConferenceKey) => `seed-conference-${key}`;

const fullCrowd: ConferencePlan['crowd'] = {
	committees: 8,
	nationsPerCommittee: [8, 30],
	nonStateActors: 12,
	customRoles: 6,
	delegations: 14,
	singles: 10,
	supervisors: 5,
	team: 6
};

const noExtras: ConferencePlan['with'] = {
	templates: false,
	certificate: false,
	calendar: false,
	papers: false,
	surveys: false,
	attendance: false,
	participantStatus: false,
	invitations: false
};

export const conferencePlans: ConferencePlan[] = [
	{
		key: 'pre',
		summary: 'PRE: registration not open yet',
		conference: {
			title: 'Seed 1 · Pre',
			longTitle: 'Seed-Konferenz in Planung',
			state: 'PRE',
			info: 'Die Anmeldung öffnet bald. Diese Ankündigung ist eingeklappt.'
		},
		days: { startAssignment: 60, startConference: 120, endConference: 123 },
		assigned: false,
		with: noExtras,
		crowd: { ...fullCrowd, delegations: 0, singles: 0, supervisors: 0 }
	},
	{
		key: 'registration',
		summary: 'PARTICIPANT_REGISTRATION: open, deadline in three weeks',
		conference: {
			title: 'Seed 2 · Registration open',
			longTitle: 'Seed-Konferenz mit offener Anmeldung',
			state: 'PARTICIPANT_REGISTRATION'
		},
		days: { startAssignment: 21, startConference: 60, endConference: 63 },
		assigned: false,
		with: noExtras,
		crowd: fullCrowd
	},
	{
		key: 'grace',
		summary:
			'PARTICIPANT_REGISTRATION: deadline 5 min ago, 24 h grace - UI says closed, server still accepts',
		conference: {
			title: 'Seed 3 · Registration grace period',
			longTitle: 'Seed-Konferenz in der Kulanzzeit nach Anmeldeschluss',
			state: 'PARTICIPANT_REGISTRATION',
			registrationDeadlineGracePeriodMinutes: 24 * 60
		},
		days: { startAssignment: -5 / (24 * 60), startConference: 45, endConference: 48 },
		assigned: false,
		with: noExtras,
		crowd: { ...fullCrowd, delegations: 6, singles: 4 }
	},
	{
		key: 'closed',
		summary:
			'PARTICIPANT_REGISTRATION: deadline and grace period over, seats being assigned (draft in progress)',
		conference: {
			title: 'Seed 4 · Registration closed',
			longTitle: 'Seed-Konferenz nach Anmeldeschluss, Zuteilung läuft',
			state: 'PARTICIPANT_REGISTRATION'
		},
		days: { startAssignment: -3, startConference: 40, endConference: 43 },
		assigned: false,
		with: { ...noExtras, assignmentDraft: true },
		crowd: fullCrowd
	},
	{
		key: 'preparation',
		summary:
			'PREPARATION: payments, postal and papers unlocked; surveys, invitations, waiting list (vacancies)',
		conference: {
			title: 'Seed 5 · Preparation',
			longTitle: 'Seed-Konferenz in der Vorbereitung',
			state: 'PREPARATION',
			unlockPayments: true,
			unlockPostals: true,
			isOpenPaperSubmission: true,
			info: 'Willkommen! Bitte erledigt Zahlung und Postanmeldung bis Monatsende. Diese Ankündigung ist ausgeklappt.',
			showInfoExpanded: true,
			showCalendar: false,
			linkToPaperInbox: 'https://example.org/paper-inbox',
			linkToTeamWiki: 'https://example.org/team-wiki',
			linkToServicesPage: 'https://example.org/services'
		},
		days: { startAssignment: -30, startConference: 14, endConference: 17 },
		assigned: true,
		with: {
			templates: true,
			certificate: false,
			calendar: true,
			papers: true,
			surveys: true,
			attendance: false,
			participantStatus: true,
			waitingList: 'VACANCIES',
			invitations: true
		},
		crowd: fullCrowd
	},
	{
		key: 'locked',
		summary:
			'PREPARATION: nothing unlocked, assignment not released, no fee, no templates, no papers; waiting list is long',
		conference: {
			title: 'Seed 6 · Preparation, locked',
			longTitle: 'Seed-Konferenz in der Vorbereitung ohne Freischaltungen',
			state: 'PREPARATION',
			// Seats are handed out, but participants are still waiting for the release.
			assignmentReleased: false,
			assignmentReleasedAt: null,
			feeAmount: null,
			linkToPreparationGuide: null,
			info: null
		},
		days: { startAssignment: -20, startConference: 28, endConference: 31 },
		assigned: true,
		with: { ...noExtras, waitingList: 'LONG_LIST' },
		crowd: {
			committees: 3,
			nationsPerCommittee: [6, 8],
			nonStateActors: 3,
			customRoles: 3,
			delegations: 5,
			singles: 3,
			supervisors: 2,
			team: 2
		}
	},
	{
		key: 'active',
		summary: 'ACTIVE: started yesterday; calendar, attendance, surveys, registration mode',
		conference: {
			title: 'Seed 7 · Active',
			longTitle: 'Seed-Konferenz, die gerade läuft',
			state: 'ACTIVE',
			unlockPayments: true,
			unlockPostals: true,
			isOpenPaperSubmission: true,
			showCalendar: true,
			info: 'Die Konferenz läuft! Raumänderungen stehen im Kalender.'
		},
		days: { startAssignment: -60, startConference: -1, endConference: 2 },
		assigned: true,
		with: {
			templates: true,
			certificate: false,
			calendar: true,
			papers: true,
			surveys: true,
			attendance: true,
			participantStatus: true,
			invitations: false
		},
		crowd: fullCrowd
	},
	{
		key: 'post',
		summary: 'POST: ended a month ago; certificates (attended vs. not), papers read-only',
		conference: {
			title: 'Seed 8 · Post',
			longTitle: 'Seed-Konferenz, die vorbei ist',
			state: 'POST',
			unlockPayments: true,
			unlockPostals: true,
			isOpenPaperSubmission: false,
			showCalendar: true
		},
		days: { startAssignment: -120, startConference: -30, endConference: -27 },
		assigned: true,
		with: {
			templates: true,
			certificate: true,
			calendar: true,
			papers: true,
			surveys: false,
			attendance: true,
			participantStatus: true,
			invitations: false
		},
		crowd: fullCrowd
	},
	{
		key: 'second',
		summary:
			'PREPARATION: a second, smaller conference - dev-admin takes part in none, so its management dashboard shows without a role',
		conference: {
			title: 'Seed 9 · Second conference',
			longTitle: 'Zweite Seed-Konferenz',
			state: 'PREPARATION',
			unlockPayments: true,
			unlockPostals: true
		},
		days: { startAssignment: -25, startConference: 21, endConference: 24 },
		assigned: true,
		with: { ...noExtras, templates: true },
		crowd: {
			committees: 3,
			nationsPerCommittee: [6, 10],
			nonStateActors: 3,
			customRoles: 3,
			delegations: 5,
			singles: 3,
			supervisors: 2,
			team: 2
		}
	}
];

/** Codes a fresh account can type to join seeded delegations or link to a supervisor. */
export const joinCodes = {
	/** "Registration open": the delegation that was just created (dev-reg-head-new). */
	newDelegation: 'DLG666',
	/** "Registration open": the delegation that is ready to apply (dev-reg-head-ready). */
	readyDelegation: 'DLG777',
	/** "Registration open": the applied delegation; joining is refused. */
	appliedDelegation: 'DLG888',
	/** "Grace" and "Closed": dev-reg-late's delegation. */
	lateDelegation: 'DLG999',
	/** Assigned conferences: the German delegation. */
	germanDelegation: 'DLGBRD',
	/** Supervisors: dev-reg-supervisor / dev-supervisor. */
	supervisor: 'TCH777',
	supervisorAbsent: 'TCH888',
	supervisorRejected: 'TCH999'
} as const;

/**
 * Plaintext invitation tokens for "Preparation". The database holds only their SHA-256 hash; the
 * seed prints the accept links. Each is 32 characters, like a real one.
 */
export const invitationTokens = {
	pending: 'DevSeedPendingInvitation00000001',
	expired: 'DevSeedExpiredInvitation00000001',
	revoked: 'DevSeedRevokedInvitation00000001',
	used: 'DevSeedUsedInvitation00000000001'
} as const;

export const COMMITTEE_CATALOG = [
	{ name: 'Generalversammlung', abbreviation: 'GV' },
	{ name: 'Sicherheitsrat', abbreviation: 'SR' },
	{ name: 'Menschenrechtsrat', abbreviation: 'MRR' },
	{ name: 'Wirtschafts- und Sozialrat', abbreviation: 'WiSo' },
	{ name: 'Weltgesundheitsversammlung', abbreviation: 'WHA' },
	{ name: 'Umweltversammlung', abbreviation: 'UNEA' },
	{ name: 'Internationale Seeschifffahrtsorganisation', abbreviation: 'IMO' },
	{ name: 'Abrüstungsausschuss', abbreviation: 'AA' }
] as const;

export const NSA_CATALOG = [
	{ name: 'Amnesty International', abbreviation: 'AI', icon: 'candle-holder' },
	{ name: 'Ärzte ohne Grenzen', abbreviation: 'MSF', icon: 'kit-medical' },
	{ name: 'Greenpeace', abbreviation: 'GP', icon: 'leaf' },
	{ name: 'Internationales Komitee vom Roten Kreuz', abbreviation: 'IKRK', icon: 'plus' },
	{ name: 'Human Rights Watch', abbreviation: 'HRW', icon: 'eye' },
	{ name: 'Oxfam', abbreviation: 'OXF', icon: 'hand-holding-heart' },
	{ name: 'Weltwirtschaftsforum', abbreviation: 'WEF', icon: 'chart-line' },
	{ name: 'Reporter ohne Grenzen', abbreviation: 'RSF', icon: 'newspaper' },
	{ name: 'Transparency International', abbreviation: 'TI', icon: 'magnifying-glass' },
	{ name: 'World Wide Fund for Nature', abbreviation: 'WWF', icon: 'paw' },
	{ name: 'Save the Children', abbreviation: 'STC', icon: 'children' },
	{ name: 'Internationaler Gewerkschaftsbund', abbreviation: 'IGB', icon: 'people-group' }
] as const;

export const CUSTOM_ROLE_CATALOG = [
	{ name: 'Presse', description: 'Berichtet für die Konferenzzeitung.', icon: 'newspaper' },
	{
		name: 'Internationaler Gerichtshof',
		description: 'Richter*in am Internationalen Gerichtshof.',
		icon: 'scale-balanced'
	},
	{
		name: 'Generalsekretariat',
		description: 'Unterstützt den Generalsekretär.',
		icon: 'briefcase'
	},
	{ name: 'Fotografie', description: 'Dokumentiert die Konferenz.', icon: 'camera' },
	{ name: 'Dolmetschen', description: 'Übersetzt in den Ausschüssen.', icon: 'language' },
	{ name: 'Logistik', description: 'Sorgt für einen reibungslosen Ablauf.', icon: 'truck' }
] as const;
