import { describe, expect, test } from 'vitest';
import type { SignedCodeCheck, SignedCodeClaims } from '#lib/signedCode/signedCode';
import {
	describeScanProblem,
	peopleOfPages,
	readingsOf,
	unreadableOf,
	type CheckCode
} from './people';
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
	return valid({ ...base, kind: 'print' }, text);
};

const page = ({
	number,
	codes = [],
	blank = false,
	readings = [signed]
}: {
	number: number;
	codes?: string[];
	blank?: boolean;
	readings?: ReadPage['codes'][number]['readings'];
}): ReadPage => ({ page: number, blank, codes: codes.map((text) => ({ text, readings })) });

const people = (pages: ReadPage[], owner?: string) =>
	peopleOfPages({ pages, conferenceId: CONFERENCE, check, owner });

describe('peopleOfPages', () => {
	test("gathers each person's pages, and names those whose fields were not readable", async () => {
		const result = await people([
			page({ number: 1, codes: ['ada'] }),
			page({ number: 2, blank: true }),
			page({ number: 3, codes: ['bob'], readings: [] }),
			page({ number: 4, codes: ['ada'], readings: null })
		]);
		expect(result.stray).toEqual({ noCode: [], otherCode: [] });
		const [ada, bob] = result.people;
		expect(ada).toMatchObject({
			userId: 'ada',
			pages: [
				{ page: 1, code: 'ada', readings: [signed] },
				{ page: 4, code: 'ada', readings: null }
			]
		});
		expect(bob).toMatchObject({ userId: 'bob', pages: [{ page: 3, readings: [] }] });
		expect([readingsOf(ada), unreadableOf(ada)]).toEqual([[signed], [4]]);
		expect([readingsOf(bob), unreadableOf(bob)]).toEqual([[], []]);
	});

	test('takes the code that is ours where a page shows several', async () => {
		const result = await people([page({ number: 1, codes: ['forged', 'nothing', 'ada'] })]);
		expect(result.people.map(({ userId }) => userId)).toEqual(['ada']);
	});

	test("names pages without a code, and with a forged, another kind's or conference's one", async () => {
		const result = await people([
			page({ number: 1 }),
			page({ number: 2, codes: ['forged'] }),
			page({ number: 3, codes: ['elsewhere'] }),
			page({ number: 4, codes: ['nametag'] }),
			// a code, but none of ours
			page({ number: 5, codes: ['nothing'] })
		]);
		expect(result).toEqual({ people: [], stray: { noCode: [1, 5], otherCode: [2, 3, 4] } });
	});

	test('gives a page without a code of ours to whom the file was said to be of', async () => {
		const result = await people(
			[
				page({ number: 1 }),
				page({ number: 2, codes: ['nothing'] }),
				page({ number: 3, codes: ['bob'] }),
				page({ number: 4, codes: ['elsewhere'] }),
				page({ number: 5, blank: true })
			],
			'ada'
		);
		expect(result.stray).toEqual({ noCode: [], otherCode: [4] });
		expect(
			result.people.map(({ userId, pages }) => [userId, pages.map(({ page }) => page)])
		).toEqual([
			['ada', [1, 2]],
			['bob', [3]]
		]);
		// nothing was to be read on them
		expect(unreadableOf(result.people[0])).toEqual([]);
	});
});

describe('describeScanProblem', () => {
	test('names the file and its pages', () => {
		const line = describeScanProblem({ file: 'a.pdf', pages: [2, 3], reason: 'noCode' });
		expect(line).toContain('a.pdf');
		expect(line).toContain('2, 3');
		expect(describeScanProblem({ file: 'a.tif', pages: [], reason: 'fileTypeUnknown' })).toMatch(
			/^a\.tif: /
		);
	});
});
