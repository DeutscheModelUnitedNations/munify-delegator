import { describe, expect, test } from 'vitest';
import type { SignedCodeCheck, SignedCodeClaims } from '#lib/signedCode/signedCode';
import { placePage, readingsOf, unreadableOf, type CheckCode } from './people';
import type { ReadPage } from './pages';

const CONFERENCE = 'conf';
const signed = { field: 'termsSignature', state: 'yes' } as const;

const valid = (claims: SignedCodeClaims, code: string): SignedCodeCheck => ({
	valid: true,
	claims,
	code
});

/** Codes of the tests: `ada`'s and `bob`'s documents, another conference's, a nametag, a forgery. */
const check: CheckCode = async (text) => {
	const base = { userId: text, conferenceId: CONFERENCE, issuedAt: 0 };
	if (text === 'forged') return { valid: false, reason: 'forged' };
	if (text === 'nothing') return null;
	if (text === 'nametag') return valid({ ...base, kind: 'live', expiresAt: 1 }, text);
	if (text === 'elsewhere') {
		return valid({ ...base, kind: 'print', conferenceId: 'other' }, text);
	}
	// somebody in another conference that is scanned for: `ada@second`
	const [userId, conferenceId = CONFERENCE] = text.split('@');
	return valid({ ...base, kind: 'print', userId, conferenceId }, text);
};

const place = ({
	codes = [],
	owner,
	...page
}: Partial<Pick<ReadPage, 'blank' | 'error'>> & { codes?: string[]; owner?: string }) =>
	placePage({
		page: {
			page: 3,
			blank: false,
			codes: codes.map((text) => ({ text, readings: [signed] })),
			...page
		},
		conferenceIds: new Set([CONFERENCE, 'second']),
		check,
		owner: owner === undefined ? undefined : { userId: owner, conferenceId: CONFERENCE }
	});

describe('placePage', () => {
	test('tells whose a page is by its code, in whichever of the conferences', async () => {
		expect(await place({ codes: ['ada'] })).toMatchObject({
			userId: 'ada',
			conferenceId: CONFERENCE,
			page: 3,
			code: 'ada',
			readings: [signed]
		});
		expect(await place({ codes: ['ada@second'] })).toMatchObject({
			userId: 'ada',
			conferenceId: 'second'
		});
	});

	test('takes the code that is ours where a page shows several', async () => {
		expect(await place({ codes: ['forged', 'nothing', 'ada'] })).toMatchObject({ userId: 'ada' });
	});

	test.each([
		['forged', 'otherCode'],
		['elsewhere', 'otherCode'],
		['nametag', 'otherCode'],
		// a code, but none of ours
		['nothing', 'noCode']
	])('says why a page with a code “%s” is nobody’s: %s', async (code, reason) => {
		expect(await place({ codes: [code] })).toBe(reason);
	});

	test('tells an empty back, a page without a code and one that could not be read apart', async () => {
		expect(await place({ blank: true })).toBe('blank');
		expect(await place({})).toBe('noCode');
		expect(await place({ error: 'broken picture' })).toBe('pageUnreadable');
	});

	test('gives a page without a code of ours to whom the file was said to be of', async () => {
		for (const page of [{}, { codes: ['nothing'] }, { error: 'broken picture' }]) {
			expect(await place({ ...page, owner: 'ada' })).toMatchObject({
				userId: 'ada',
				code: null,
				readings: null
			});
		}
		expect(await place({ codes: ['bob'], owner: 'ada' })).toMatchObject({ userId: 'bob' });
		expect(await place({ codes: ['elsewhere'], owner: 'ada' })).toBe('otherCode');
		expect(await place({ blank: true, owner: 'ada' })).toBe('blank');
	});
});

test('a person’s pages together, and those whose fields were not readable', () => {
	const page = { code: 'ada', fields: [] };
	const person = {
		userId: 'ada',
		conferenceId: CONFERENCE,
		pages: [
			{ ...page, page: 1, readings: [signed] },
			{ ...page, page: 4, readings: null },
			{ ...page, page: 5, code: null, readings: null }
		]
	};
	expect(readingsOf(person)).toEqual([signed]);
	expect(unreadableOf(person)).toEqual([4]);
});
