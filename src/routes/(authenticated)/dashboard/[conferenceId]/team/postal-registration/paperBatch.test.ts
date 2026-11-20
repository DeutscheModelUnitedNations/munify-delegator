import { describe, expect, test } from 'vitest';
import { pagesByPerson, strayPages, type ScannedPage } from './paperBatch';

const page = (outcome: ScannedPage['outcome'], number = 1): ScannedPage => ({
	file: 'scan.pdf',
	page: number,
	outcome
});

describe('pagesByPerson', () => {
	test("gathers each person's pages and readings, the unreadable ones counted", () => {
		const pages = [
			page(
				{ kind: 'read', userId: 'ada', readings: [{ field: 'termsSignature', state: 'yes' }] },
				1
			),
			page({ kind: 'noCode' }, 2),
			page({ kind: 'read', userId: 'bob', readings: [] }, 3),
			page({ kind: 'unreadable', userId: 'ada' }, 4),
			page({ kind: 'read', userId: 'ada', readings: [{ field: 'mediaAll', state: 'no' }] }, 5)
		];
		expect(pagesByPerson(pages)).toEqual([
			{
				userId: 'ada',
				pages: 3,
				unreadable: 1,
				readings: [
					{ field: 'termsSignature', state: 'yes' },
					{ field: 'mediaAll', state: 'no' }
				]
			},
			{ userId: 'bob', pages: 1, unreadable: 0, readings: [] }
		]);
	});
});

describe('strayPages', () => {
	test('are the pages without a code or with a refused one', () => {
		const pages = [
			page({ kind: 'noCode' }, 1),
			page({ kind: 'refused', message: 'forged' }, 2),
			page({ kind: 'unreadable', userId: 'ada' }, 3)
		];
		expect(strayPages(pages).map(({ page }) => page)).toEqual([1, 2]);
	});
});
