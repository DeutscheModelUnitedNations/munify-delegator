import { afterEach, describe, expect, test, vi } from 'vitest';
import {
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
		expect(await requestBadgeSession('http://gen.test', { id: 'u1' })).toBe(
			'https://badges.test/s/1'
		);
	});

	test('throws on an error status', async () => {
		respond(new Response('nope', { status: 500 }));
		await expect(requestBadgeSession('http://gen.test', {})).rejects.toThrow('(500): nope');
	});

	test('throws on a malformed response', async () => {
		respond(Response.json({ other: 1 }));
		await expect(requestBadgeSession('http://gen.test', {})).rejects.toThrow('invalid response');
	});
});

describe('seatBadgeValues', () => {
	test('names the nation and committee', () => {
		expect(
			seatBadgeValues(
				{
					delegation: { assignedNation: { alpha3Code: 'DEU', alpha2Code: 'DE' } },
					assignedCommittee: { abbreviation: 'GA' }
				},
				(code) => `name of ${code}`
			)
		).toEqual({ countryName: 'name of DEU', countryAlpha2Code: 'DE', committee: 'GA' });
	});

	test('is empty without a seat', () => {
		const values = seatBadgeValues({ delegation: {} }, () => 'unused');
		expect(values.countryName).toBeFalsy();
		expect(values.committee).toBeUndefined();
		expect(seatBadgeValues(undefined, () => 'unused').countryAlpha2Code).toBeUndefined();
	});
});
