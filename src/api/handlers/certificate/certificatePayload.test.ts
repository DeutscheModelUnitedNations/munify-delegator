import { describe, expect, test } from 'vitest';
import { certificateContents, certificateSessions } from './certificatePayload';

const start = new Date('2026-03-05T08:00:00Z');
const end = new Date('2026-03-08T16:00:00Z');

const conference = {
	title: 'MUN-SH 2026',
	longTitle: 'Model United Nations Schleswig-Holstein 2026',
	startConference: start,
	endConference: end
};
const user = { givenName: 'erika', familyName: 'mustermann' };

describe('certificateContents', () => {
	test('certifies who attended which conference, and when', () => {
		expect(certificateContents({ didAttend: true, conference, user })).toEqual({
			fullName: 'Erika Mustermann',
			payload: {
				n: 'Erika Mustermann',
				t: 'Model United Nations Schleswig-Holstein 2026',
				s: start.getTime(),
				e: end.getTime()
			}
		});
	});

	test('falls back to the short title and to zero for missing dates', () => {
		const contents = certificateContents({
			didAttend: true,
			conference: {
				title: 'MUN-SH 2026',
				longTitle: null,
				startConference: null,
				endConference: null
			},
			user
		});
		expect(contents?.payload).toEqual({ n: 'Erika Mustermann', t: 'MUN-SH 2026', s: 0, e: 0 });
	});

	test('certifies an unnamed participant with an empty name', () => {
		expect(certificateContents({ didAttend: true, conference, user: null })?.fullName).toBe('');
	});

	test('is undefined before attendance is recorded', () => {
		expect(certificateContents({ didAttend: false, conference, user })).toBeUndefined();
		expect(certificateContents({ didAttend: true, conference: null, user })).toBeUndefined();
	});
});

describe('certificateSessions', () => {
	const at = (hour: number) => new Date(Date.UTC(2026, 2, 1, hour));
	const session = ({
		occasion,
		hour,
		attended = true,
		showOnCertificate = true
	}: {
		occasion: string;
		hour: number;
		attended?: boolean;
		showOnCertificate?: boolean;
	}) => ({ occasion, startedAt: at(hour), attended, showOnCertificate });

	test('lists the sessions attended, in the order they started', () => {
		expect(
			certificateSessions([
				session({ occasion: 'Abendveranstaltung', hour: 19 }),
				session({ occasion: ' Eröffnung ', hour: 9 }),
				session({ occasion: 'Mittag', hour: 12, attended: false })
			])
		).toEqual(['Eröffnung', 'Abendveranstaltung']);
	});

	test('leaves out empty names', () => {
		expect(certificateSessions([session({ occasion: '  ', hour: 9 })])).toEqual([]);
	});

	test('leaves out a session the team took off the certificates', () => {
		expect(
			certificateSessions([
				session({ occasion: 'Probelauf', hour: 8, showOnCertificate: false }),
				session({ occasion: 'Eröffnung', hour: 10 })
			])
		).toEqual(['Eröffnung']);
	});
});

describe('certificateContents with sessions', () => {
	test('signs in only the names, and leaves the claim out without any', () => {
		const conference = {
			title: 'MUN',
			longTitle: null,
			startConference: new Date(0),
			endConference: new Date(0)
		};
		const user = { givenName: 'Ada', familyName: 'Lovelace' };
		expect(
			certificateContents({
				didAttend: true,
				conference,
				user,
				sessions: ['Eröffnung', 'Abschluss']
			})?.payload.a
		).toEqual(['Eröffnung', 'Abschluss']);
		expect(
			certificateContents({ didAttend: true, conference, user, sessions: [] })?.payload
		).not.toHaveProperty('a');
	});
});
