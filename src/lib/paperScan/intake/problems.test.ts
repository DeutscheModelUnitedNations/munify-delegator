import { describe, expect, test } from 'vitest';
import { describeScanProblem, pageRuns, problemsOfPages } from './problems';

const file = 'stack.pdf';

describe('problemsOfPages', () => {
	test('tells each problem once, with its pages, conference by conference', () => {
		const other = { reason: 'otherCode' as const };
		const unreadable = (conferenceId: string) => ({ reason: 'unreadable' as const, conferenceId });
		expect(
			problemsOfPages({
				file,
				pages: [
					{ page: 4, problem: other },
					{ page: 1 },
					{ page: 2, problem: other },
					{ page: 3, problem: unreadable('a') },
					{ page: 5, problem: unreadable('b') },
					{ page: 6, ignored: 'noCode' }
				]
			})
		).toEqual([
			{ file, pages: [2, 4], reason: 'otherCode' },
			{ file, pages: [3], reason: 'unreadable', conferenceId: 'a' },
			{ file, pages: [5], reason: 'unreadable', conferenceId: 'b' }
		]);
	});

	test('tells of no page without a code, but of a file of nothing else', () => {
		const noCode = { ignored: 'noCode' as const };
		const blank = { ignored: 'blank' as const };
		expect(problemsOfPages({ file, pages: [{ page: 1 }, { page: 2, ...noCode }] })).toEqual([]);
		expect(
			problemsOfPages({
				file,
				pages: [
					{ page: 1, ...blank },
					{ page: 2, ...noCode }
				]
			})
		).toEqual([{ file, pages: [], reason: 'noCode' }]);
		expect(problemsOfPages({ file, pages: [{ page: 1, ...blank }] })).toEqual([]);
	});
});

test('pageRuns tells runs of pages together, and no more than say something', () => {
	expect(pageRuns([1, 2, 3, 7, 9, 10])).toBe('1–3, 7, 9, 10');
	const many = pageRuns(Array.from({ length: 500 }, (_, index) => index * 3));
	expect(many.endsWith('…')).toBe(true);
	expect(many.length).toBeLessThan(200);
});

test('describeScanProblem names the file and its pages', () => {
	const line = describeScanProblem({ file: 'a.pdf', pages: [2, 3], reason: 'otherCode' });
	expect(line).toContain('a.pdf');
	expect(line).toContain('2, 3');
	expect(describeScanProblem({ file: 'a.tif', pages: [], reason: 'fileTypeUnknown' })).toMatch(
		/^a\.tif: /
	);
});
