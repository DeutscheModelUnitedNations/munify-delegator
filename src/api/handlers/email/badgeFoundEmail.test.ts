// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/pubsub', () => ({ emailLogPubsub: { updated: () => undefined } }));

const { renderBadgeFoundEmail } = await import('./badgeFoundEmail');

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
		expect(mail.subject).toBe('Ihr Zugangsausweis für MUN-SH 2027 wurde gefunden');
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
						body: 'Ihr Ausweis liegt im Konferenzbüro von {conference}, Raum 101.'
					}
				],
				footers: [{ locale: 'de', text: 'Ihr Team von {conference}' }]
			}
		});
		expect(mail.html).toContain('Konferenzbüro von MUN-SH 2027, Raum 101.');
		expect(mail.html).toContain('Ihr Team von MUN-SH 2027');
		// the subject it left alone stays the default
		expect(mail.subject).toBe('Ihr Zugangsausweis für MUN-SH 2027 wurde gefunden');
	});
});
