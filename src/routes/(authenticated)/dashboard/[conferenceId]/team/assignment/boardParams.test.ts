import { describe, expect, it } from 'vitest';
import { boardParams, withBoardParams } from './boardParams';

describe('boardParams', () => {
	it('reads the size and the filter, falling back to the defaults', () => {
		expect(boardParams(new URLSearchParams('size=4&disqualified=true'))).toEqual({
			size: 4,
			disqualified: true
		});
		expect(boardParams(new URLSearchParams(''))).toEqual({ size: 0, disqualified: false });
		expect(boardParams(new URLSearchParams('size=abc&disqualified=1'))).toEqual({
			size: 0,
			disqualified: false
		});
	});

	it('writes them back, leaving defaults and other parameters alone', () => {
		const url = new URL('http://x/board?tab=2&size=4');
		expect(withBoardParams(url, { size: 7, disqualified: true }).search).toBe(
			'?tab=2&size=7&disqualified=true'
		);
		expect(withBoardParams(url, { size: 0, disqualified: false }).search).toBe('?tab=2');
	});

	it('reads back what it writes', () => {
		const params = { size: 3, disqualified: true };
		expect(boardParams(withBoardParams(new URL('http://x/'), params).searchParams)).toEqual(params);
	});
});
