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

// Sending is emailDelivery's, tested there: here it only records what it was handed.
const sent: { to: string; userId: string | null; sentById: string; subject: string }[] = [];
let sendError: string | undefined;
vi.mock('./emailDelivery', async (importOriginal) => ({
	...(await importOriginal<typeof import('./emailDelivery')>()),
	loadWording: async () => ({ texts: [], footers: [] }),
	sendByHand: async (args: {
		to: string;
		userId: string | null;
		sentById: string;
		render: () => Promise<{ subject: string }>;
	}) => {
		sent.push({ ...args, subject: (await args.render()).subject });
		return sendError;
	}
}));

const { renderBadgeFoundEmail, sendBadgeFoundEmail } = await import('./badgeFoundEmail');
const { db } = await import('#api/db/db');

const recipient = {
	id: 'u1',
	email: 'ada@example.org',
	givenName: 'Ada',
	familyName: 'Lovelace',
	locale: 'de',
	birthday: null
};
const noWording = { texts: [], footers: [] };

describe('the found badge mail', () => {
	test("is written in the recipient's language and names the conference", async () => {
		const mail = await renderBadgeFoundEmail({
			recipient,
			conferenceTitle: 'MUN-SH 2027',
			wording: noWording
		});
		expect(mail.subject).toBe('Dein Zugangsausweis für MUN-SH 2027 wurde gefunden');
		expect(mail.html).toContain('Teilnehmendenbetreuung');
		expect(mail.text).toContain('Ada Lovelace');

		const english = await renderBadgeFoundEmail({
			recipient: { ...recipient, locale: 'en' },
			conferenceTitle: 'MUN-SH 2027',
			wording: noWording
		});
		expect(english.subject).toBe('Your badge for MUN-SH 2027 has been found');
	});

	test("uses the conference's own words and footer", async () => {
		const mail = await renderBadgeFoundEmail({
			recipient,
			conferenceTitle: 'MUN-SH 2027',
			wording: {
				texts: [
					{
						kind: 'BADGE_FOUND',
						locale: 'de',
						subject: null,
						heading: null,
						body: 'Dein Ausweis liegt im Konferenzbüro von {conference}, Raum 101.'
					}
				],
				footers: [{ locale: 'de', text: 'Dein Team von {conference}' }]
			}
		});
		expect(mail.html).toContain('Konferenzbüro von MUN-SH 2027, Raum 101.');
		expect(mail.html).toContain('Dein Team von MUN-SH 2027');
		// the subject it left alone stays the default
		expect(mail.subject).toBe('Dein Zugangsausweis für MUN-SH 2027 wurde gefunden');
	});
});

describe('sendBadgeFoundEmail', () => {
	/** Answers `participant` for any participant row asked for. */
	function fakeParticipant(participant: object | undefined) {
		Object.assign(db, {
			query: { conferenceParticipant: { findFirst: async () => participant } }
		});
	}
	const participant = {
		conferenceId: 'c1',
		user: recipient,
		conference: { title: 'MUN-SH 2027' }
	};

	test('sends it to the person, logged as sent by the team member', async () => {
		sent.length = 0;
		sendError = undefined;
		fakeParticipant(participant);
		expect(await sendBadgeFoundEmail({ participantId: 'p1', sentById: 'care' })).toBeNull();
		expect(sent).toMatchObject([
			{
				to: 'ada@example.org',
				userId: 'u1',
				sentById: 'care',
				subject: 'Dein Zugangsausweis für MUN-SH 2027 wurde gefunden'
			}
		]);
	});

	test('answers why sending failed', async () => {
		sendError = 'SMTP down';
		fakeParticipant(participant);
		expect(await sendBadgeFoundEmail({ participantId: 'p1', sentById: 'care' })).toBe('SMTP down');
	});

	test('answers nothing for a participant row that is not there', async () => {
		sent.length = 0;
		fakeParticipant(undefined);
		expect(await sendBadgeFoundEmail({ participantId: 'gone', sentById: 'care' })).toBeUndefined();
		fakeParticipant({ ...participant, user: null });
		expect(await sendBadgeFoundEmail({ participantId: 'p1', sentById: 'care' })).toBeUndefined();
		expect(sent).toEqual([]);
	});
});
