import { afterEach, describe, expect, test, vi } from 'vitest';
import {
	badgeSeatOf,
	badgeSessionBody,
	badgeSessionUrl,
	requestBadgeSession,
	seatBadgeValues
} from './badgeSession';

describe('badgeSessionBody', () => {
	test('joins the name and drops what is unknown', () => {
		expect(
			badgeSessionBody({
				givenName: 'Ada',
				familyName: 'Lovelace',
				countryName: null,
				pronouns: '',
				id: 'u1',
				committee: 'GA'
			})
		).toEqual({ name: 'Ada Lovelace', id: 'u1', committee: 'GA' });
	});

	test('needs both name parts', () => {
		expect(badgeSessionBody({ givenName: 'Ada', familyName: null })).toEqual({});
	});
});

describe('badgeSessionUrl', () => {
	test('upgrades the url to https', () => {
		expect(badgeSessionUrl({ url: 'http://badges.test/s/1' })).toBe('https://badges.test/s/1');
	});

	test('rejects anything without a usable url', () => {
		expect(badgeSessionUrl(null)).toBeUndefined();
		expect(badgeSessionUrl('url')).toBeUndefined();
		expect(badgeSessionUrl({})).toBeUndefined();
		expect(badgeSessionUrl({ url: 4 })).toBeUndefined();
		expect(badgeSessionUrl({ url: '  ' })).toBeUndefined();
	});
});

describe('requestBadgeSession', () => {
	const respond = (response: Response) =>
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => response)
		);
	afterEach(() => vi.unstubAllGlobals());

	test('returns the session url', async () => {
		respond(Response.json({ url: 'http://badges.test/s/1' }));
		expect(await requestBadgeSession({ baseUrl: 'http://gen.test', body: { id: 'u1' } })).toBe(
			'https://badges.test/s/1'
		);
	});

	test('throws on an error status', async () => {
		respond(new Response('nope', { status: 500 }));
		await expect(requestBadgeSession({ baseUrl: 'http://gen.test', body: {} })).rejects.toThrow(
			'(500): nope'
		);
	});

	test('throws on a malformed response', async () => {
		respond(Response.json({ other: 1 }));
		await expect(requestBadgeSession({ baseUrl: 'http://gen.test', body: {} })).rejects.toThrow(
			'invalid response'
		);
	});
});

describe('seatBadgeValues', () => {
	test('names the nation and committee', () => {
		expect(
			seatBadgeValues({
				member: {
					delegation: { assignedRole: { nation: { alpha3Code: 'DEU', alpha2Code: 'DE' } } },
					assignedCommittee: { abbreviation: 'GA' }
				},
				countryName: (code) => `name of ${code}`
			})
		).toEqual({ countryName: 'name of DEU', countryAlpha2Code: 'DE', committee: 'GA' });
	});

	test('is empty without a seat', () => {
		const values = seatBadgeValues({ member: { delegation: {} }, countryName: () => 'unused' });
		expect(values.countryName).toBeFalsy();
		expect(values.committee).toBeUndefined();
		expect(
			seatBadgeValues({ member: undefined, countryName: () => 'unused' }).countryAlpha2Code
		).toBeUndefined();
	});
});

describe('badgeSeatOf', () => {
	const labels = {
		countryName: (alpha3: string) => (alpha3 === 'deu' ? 'Deutschland' : alpha3),
		supervisor: 'Betreuung',
		team: 'Team'
	};

	test('shows a delegate by nation and committee, or by their non-state actor', () => {
		expect(
			badgeSeatOf({
				roles: {
					delegationMember: {
						assignedCommittee: { abbreviation: 'GV' },
						delegation: { assignedRole: { nation: { alpha2Code: 'de', alpha3Code: 'deu' } } }
					}
				},
				labels
			})
		).toEqual({ kind: 'nation', alpha2Code: 'de', countryName: 'Deutschland', committee: 'GV' });
		expect(
			badgeSeatOf({
				roles: {
					delegationMember: { delegation: { assignedRole: { name: 'Amnesty', nation: null } } }
				},
				labels
			})
		).toEqual({ kind: 'label', label: 'Amnesty', committee: undefined });
	});

	test('falls back to the single role, the supervisor image, the team, else nothing', () => {
		expect(
			badgeSeatOf({ roles: { singleParticipant: { assignedRole: { name: 'Presse' } } }, labels })
		).toEqual({ kind: 'label', label: 'Presse' });
		expect(badgeSeatOf({ roles: { conferenceSupervisor: {} }, labels })?.kind).toBe('image');
		expect(badgeSeatOf({ roles: { teamMember: {} }, labels })).toEqual({
			kind: 'label',
			label: 'Team'
		});
		expect(
			badgeSeatOf({ roles: { delegationMember: { delegation: { assignedRole: null } } }, labels })
		).toBeUndefined();
	});
});
