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

	test('merges sessions of one name, in the order they first ran, and lists only those attended', () => {
		expect(
			certificateSessions([
				{
					occasion: 'Abendveranstaltung',
					startedAt: at(19),
					attended: false,
					showOnCertificate: true
				},
				{
					occasion: 'Eröffnung',
					startedAt: at(9),
					attended: false,
					showOnCertificate: true
				},
				{
					occasion: ' eröffnung ',
					startedAt: at(10),
					attended: true,
					showOnCertificate: true
				}
			])
		).toEqual([{ name: 'Eröffnung', attended: true }]);
	});

	test('leaves out occasions the holder was not scanned at and empty names', () => {
		expect(
			certificateSessions([
				{
					occasion: 'Test',
					startedAt: at(8),
					attended: false,
					showOnCertificate: true
				},
				{ occasion: '  ', startedAt: at(9), attended: true, showOnCertificate: true }
			])
		).toEqual([]);
	});
});

test('leaves out an occasion the team took off the certificates, even if one session still shows', () => {
	const at = (hour: number) => new Date(Date.UTC(2026, 2, 1, hour));
	expect(
		certificateSessions([
			{
				occasion: 'Probelauf',
				startedAt: at(8),
				attended: true,
				showOnCertificate: false
			},
			{
				occasion: 'probelauf',
				startedAt: at(9),
				attended: true,
				showOnCertificate: true
			},
			{
				occasion: 'Eröffnung',
				startedAt: at(10),
				attended: true,
				showOnCertificate: true
			}
		])
	).toEqual([{ name: 'Eröffnung', attended: true }]);
});

describe('certificateContents with sessions', () => {
	test('signs the sessions in compactly, and leaves the claim out without any', () => {
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
				sessions: [
					{ name: 'Eröffnung', attended: true },
					{ name: 'Abschluss', attended: false }
				]
			})?.payload.a
		).toEqual([
			['Eröffnung', 1],
			['Abschluss', 0]
		]);
		expect(
			certificateContents({ didAttend: true, conference, user, sessions: [] })?.payload
		).not.toHaveProperty('a');
	});
});
