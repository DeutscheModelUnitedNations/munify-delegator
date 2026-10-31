import { describe, expect, it, vi } from 'vitest';
import { keepWhileEqual, memoizeLast } from './memoizeLast';

describe('memoizeLast', () => {
	const rows = [{ id: 'a' }, { id: 'b' }];

	it('works a result out once for the same arguments', () => {
		const fn = vi.fn((items: { id: string }[], factor: number) => items.length * factor);
		const memo = memoizeLast(fn);
		expect(memo(rows, 2)).toBe(4);
		expect(memo(rows, 2)).toBe(4);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('sees a new array with the same items as the same', () => {
		const fn = vi.fn((items: { id: string }[]) => items.map((item) => item.id));
		const memo = memoizeLast(fn);
		const first = memo(rows);
		expect(memo([...rows])).toBe(first);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('looks into the properties of an object of arrays', () => {
		const fn = vi.fn((input: { rows: { id: string }[]; size: number }) => input.rows.length);
		const memo = memoizeLast(fn);
		memo({ rows, size: 4 });
		memo({ rows: [...rows], size: 4 });
		expect(fn).toHaveBeenCalledTimes(1);
		memo({ rows, size: 5 });
		memo({ rows: [rows[0]], size: 5 });
		memo({ rows: [rows[0], { id: 'b' }], size: 5 });
		expect(fn).toHaveBeenCalledTimes(4);
	});

	it('works it out again when anything differs, and only remembers the last call', () => {
		const fn = vi.fn((items: { id: string }[]) => items.length);
		const memo = memoizeLast(fn);
		memo(rows);
		memo([rows[0]]);
		memo(rows);
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('does not look deeper than one level', () => {
		const fn = vi.fn((input: { nested: { rows: { id: string }[] } }) => input.nested.rows.length);
		const memo = memoizeLast(fn);
		memo({ nested: { rows } });
		memo({ nested: { rows } });
		expect(fn).toHaveBeenCalledTimes(2);
	});
});

describe('keepWhileEqual', () => {
	it('hands back the last value while an equal one comes in', () => {
		const keep = keepWhileEqual<{ id: string; n: number }[]>();
		const first = keep([{ id: 'a', n: 1 }]);
		expect(keep([{ id: 'a', n: 1 }])).toBe(first);
		const changed = keep([{ id: 'a', n: 2 }]);
		expect(changed).not.toBe(first);
		expect(changed).toEqual([{ id: 'a', n: 2 }]);
		expect(keep([{ id: 'a', n: 2 }])).toBe(changed);
	});
});
