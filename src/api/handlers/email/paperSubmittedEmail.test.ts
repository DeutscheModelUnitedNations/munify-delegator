// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({
	DATABASE_URL: '',
	DATABASE_POOL_SIZE: 1,
	REDIS_URL: undefined
}));

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({ emailLogPubsub: { updated: () => undefined } }));

// The stored choices: none, unless a test hands some in.
let preferences = new Map<string, unknown[]>();
vi.mock('#api/handlers/notification/notificationStore', () => ({
	preferencesOfMembers: async () => preferences
}));

// Sending is emailDelivery's, tested there: here it only records what it was handed.
const sent: {
	to: string;
	userId: string | null;
	sentById: string | null;
	subjectKey: string;
	subject: string;
	text: string;
}[] = [];
vi.mock('./emailDelivery', async (importOriginal) => ({
	...(await importOriginal<typeof import('./emailDelivery')>()),
	loadWording: async () => ({ texts: [], footers: [] }),
	sendByHand: async (args: {
		to: string;
		userId: string | null;
		sentById: string | null;
		subjectKey: string;
		render: () => Promise<{ subject: string; text: string }>;
	}) => {
		const { subject, text } = await args.render();
		sent.push({
			to: args.to,
			userId: args.userId,
			sentById: args.sentById,
			subjectKey: args.subjectKey,
			subject,
			text
		});
		return undefined;
	}
}));

const { renderPaperSubmittedEmail, sendPaperSubmittedEmails, paperSubmissionValues } =
	await import('./paperSubmittedEmail');
const { overwriteGetLocale } = await import('#lib/paraglide/runtime');

/** Runs `fn` in `locale`: under vitest no request store holds one, so `getLocale` is replaced. */
function inLocale<T>(locale: 'de' | 'en', fn: () => T): T {
	overwriteGetLocale(() => locale);
	try {
		return fn();
	} finally {
		overwriteGetLocale(() => 'de');
	}
}
const { db } = await import('#api/db/db');

const recipient = {
	id: 'u-chair',
	email: 'chair@example.org',
	givenName: 'Ada',
	familyName: 'Lovelace',
	locale: 'de',
	birthday: null
};
const paper = {
	paperId: 'p1',
	versionId: 'v2',
	conferenceId: 'c1',
	conferenceTitle: 'MUN-SH 2027',
	committeeId: 'ga',
	committeeAbbreviation: 'GV',
	agendaItem: 'Klimaschutz',
	type: 'POSITION_PAPER' as const,
	status: 'REVISED' as const,
	version: 2,
	role: { id: 'r1', kind: 'NATION' as const, name: null, nationAlpha3Code: 'FRA' }
};
const noWording = { texts: [], footers: [] };

describe('paperSubmissionValues', () => {
	test('names the committee, agenda item, type, role, version and status, in the locale', () => {
		expect(inLocale('de', () => paperSubmissionValues({ paper }))).toEqual({
			conference: 'MUN-SH 2027',
			committee: 'GV',
			paper: 'Klimaschutz',
			paperType: 'Positionspapier',
			delegation: 'Frankreich',
			version: '2',
			status: 'Überarbeitet'
		});
		expect(inLocale('en', () => paperSubmissionValues({ paper })).delegation).toBe('France');
	});

	test('names a non-state actor by its own name', () => {
		const nsa = {
			id: 'r2',
			kind: 'NON_STATE_ACTOR' as const,
			name: 'Greenpeace',
			nationAlpha3Code: null
		};
		expect(
			inLocale('de', () => paperSubmissionValues({ paper: { ...paper, role: nsa } })).delegation
		).toBe('Greenpeace');
	});
});

describe('paperSubmissionValues with an escape', () => {
	test('passes what the team wrote through the escape, and only that', () => {
		const slack = (text: string) => `[${text}]`;
		const values = inLocale('de', () =>
			paperSubmissionValues({
				paper: { ...paper, agendaItem: 'Klima <2°C> & mehr', committeeAbbreviation: 'G&V' },
				escape: slack
			})
		);
		expect(values.paper).toBe('[Klima <2°C> & mehr]');
		expect(values.committee).toBe('[G&V]');
		expect(values.delegation).toBe('[Frankreich]');
		expect(values.version).toBe('2');
		expect(values.paperType).toBe('Positionspapier');
	});

	test('names a delegation without a role as such', () => {
		expect(
			inLocale('de', () => paperSubmissionValues({ paper: { ...paper, role: null } })).delegation
		).toBe('einer Delegation ohne Rolle');
	});
});

describe('the paper submitted mail', () => {
	test("tells what and where, links to the paper, in the recipient's language", async () => {
		const mail = await renderPaperSubmittedEmail({
			recipient,
			paper,
			origin: 'https://delegator.example',
			wording: noWording
		});
		expect(mail.subject).toBe('Papier eingereicht im GV: Positionspapier von Frankreich');
		expect(mail.text).toContain('Klimaschutz');
		expect(mail.text).toContain('Version 2');
		expect(mail.html).toContain('https://delegator.example/dashboard/c1/paperhub/p1');

		overwriteGetLocale(() => 'en');
		const english = await renderPaperSubmittedEmail({
			recipient: { ...recipient, locale: 'en' },
			paper,
			origin: 'https://delegator.example',
			wording: noWording
		}).finally(() => overwriteGetLocale(() => 'de'));
		expect(english.subject).toBe('Paper submitted in GV: Position paper by France');
	});

	test("uses the conference's own words", async () => {
		const mail = await renderPaperSubmittedEmail({
			recipient,
			paper,
			origin: 'https://delegator.example',
			wording: {
				texts: [
					{
						kind: 'PAPER_SUBMITTED',
						locale: 'de',
						subject: 'Neu im {committee}: {delegation} (v{version})',
						heading: null,
						body: null
					}
				],
				footers: []
			}
		});
		expect(mail.subject).toBe('Neu im GV: Frankreich (v2)');
	});
});

describe('sendPaperSubmittedEmails', () => {
	const member = (
		id: string,
		role: string,
		functions: { id: string; committeeId: string | null; kind: string }[],
		messageNotificationEmails = true
	) => ({
		id,
		userId: `u-${id}`,
		role,
		user: { ...recipient, id: `u-${id}`, email: `${id}@example.org`, messageNotificationEmails },
		functions
	});
	function fakeTeam(members: ReturnType<typeof member>[]) {
		Object.assign(db, { query: { teamMember: { findMany: async () => members } } });
	}

	test("mails the committee's chairs and consultants on the paper team, once each, without a sender", async () => {
		sent.length = 0;
		preferences = new Map();
		fakeTeam([
			member('chair', 'REVIEWER', [{ id: 'f1', committeeId: 'ga', kind: 'CHAIR' }]),
			member('both', 'CONTENT_LEAD', [
				{ id: 'f2', committeeId: 'ga', kind: 'CHAIR' },
				{ id: 'f3', committeeId: 'ga', kind: 'CONSULTANT' }
			]),
			// not on the paper team
			member('member', 'MEMBER', [{ id: 'f4', committeeId: 'ga', kind: 'CHAIR' }]),
			// another committee
			member('other', 'REVIEWER', [{ id: 'f5', committeeId: 'sc', kind: 'CONSULTANT' }]),
			// the paper team without a function
			member('reviewer', 'REVIEWER', [])
		]);
		await sendPaperSubmittedEmails({ paper, origin: 'https://delegator.example' });
		expect(
			sent.map(({ to, userId, sentById, subjectKey }) => ({ to, userId, sentById, subjectKey }))
		).toEqual([
			{ to: 'chair@example.org', userId: 'u-chair', sentById: null, subjectKey: 'v2' },
			{ to: 'both@example.org', userId: 'u-both', sentById: null, subjectKey: 'v2' }
		]);
	});

	test('leaves out whoever switched the mail off', async () => {
		sent.length = 0;
		preferences = new Map([
			[
				'off',
				[{ topic: 'COMMITTEE_PAPERS', teamFunctionId: 'f1', channel: 'EMAIL', enabled: false }]
			]
		]);
		fakeTeam([
			member('off', 'REVIEWER', [{ id: 'f1', committeeId: 'ga', kind: 'CHAIR' }]),
			member('quiet', 'REVIEWER', [{ id: 'f2', committeeId: 'ga', kind: 'CHAIR' }], false),
			member('on', 'REVIEWER', [{ id: 'f3', committeeId: 'ga', kind: 'CONSULTANT' }])
		]);
		await sendPaperSubmittedEmails({ paper, origin: 'https://delegator.example' });
		expect(sent.map(({ to }) => to)).toEqual(['on@example.org']);
	});

	test('never names the author', async () => {
		sent.length = 0;
		preferences = new Map();
		fakeTeam([member('chair', 'REVIEWER', [{ id: 'f1', committeeId: 'ga', kind: 'CHAIR' }])]);
		await sendPaperSubmittedEmails({ paper, origin: 'https://delegator.example' });
		// the only person the mail names is its recipient, in the greeting
		expect(sent[0]?.text.match(/Lovelace/g)).toHaveLength(1);
	});
});
