import { describe, expect, test } from 'vitest';
import { describeHint, pageInPlace } from './pageCameraHints';

describe('describeHint', () => {
	test('names the covered corner as the person sees it', () => {
		expect(describeHint({ kind: 'covered', where: 'bottomLeft' })).toContain('unten links');
		expect(describeHint({ kind: 'covered' })).toBe('Nicht alle vier Ecken sind zu sehen');
	});

	test('words every hint', () => {
		const kinds = [
			'findPage',
			'dark',
			'nextPage',
			'closer',
			'farther',
			'holdStill',
			'ready'
		] as const;
		for (const kind of [...kinds, 'reading', 'noCode'] as const) {
			expect(describeHint({ kind })).not.toBe('');
		}
	});
});

describe('pageInPlace', () => {
	test('shows the page in place while it is held still or read', () => {
		expect(pageInPlace({ kind: 'holdStill' })).toBe(true);
		expect(pageInPlace({ kind: 'reading' })).toBe(true);
		expect(pageInPlace({ kind: 'closer' })).toBe(false);
	});
});
