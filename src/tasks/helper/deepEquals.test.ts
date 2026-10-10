import { describe, expect, test } from 'vitest';
import deepEquals from './deepEquals';

describe('deepEquals', () => {
	test('compares primitives with Object.is', () => {
		expect(deepEquals(1, 1)).toBe(true);
		expect(deepEquals(NaN, NaN)).toBe(true);
		expect(deepEquals(-0, +0)).toBe(false);
		expect(deepEquals('a', 'b')).toBe(false);
	});

	test('never equates an object with a primitive or null', () => {
		expect(deepEquals({}, null)).toBe(false);
		expect(deepEquals(null, {})).toBe(false);
		expect(deepEquals(1, { a: 1 })).toBe(false);
		expect(deepEquals({ a: 1 }, 'x')).toBe(false);
	});

	test('compares arrays by position and length', () => {
		expect(deepEquals([1, [2, 3]], [1, [2, 3]])).toBe(true);
		expect(deepEquals([1, 2], [2, 1])).toBe(false);
		expect(deepEquals([1, undefined], [1])).toBe(false);
	});

	test('never equates an array with an object', () => {
		expect(deepEquals([], {})).toBe(false);
		expect(deepEquals({ 0: 'a', length: 1 }, ['a'])).toBe(false);
	});

	test('compares objects by their defined keys', () => {
		expect(deepEquals({ a: 1, b: { c: [1] } }, { b: { c: [1] }, a: 1 })).toBe(true);
		expect(deepEquals({ a: 1 }, { a: 1, b: undefined })).toBe(true);
		expect(deepEquals({ a: 1, b: undefined }, { a: 1 })).toBe(true);
		expect(deepEquals({ a: 1 }, { a: 2 })).toBe(false);
		expect(deepEquals({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(deepEquals({ a: 1, c: 2 }, { a: 1, b: 2 })).toBe(false);
	});

	test('terminates on cyclic structures', () => {
		const x: { self?: unknown; value: number } = { value: 1 };
		x.self = x;
		const y: { self?: unknown; value: number } = { value: 1 };
		y.self = y;
		expect(deepEquals(x, y)).toBe(true);

		const z: { self?: unknown; value: number } = { value: 2 };
		z.self = z;
		expect(deepEquals(x, z)).toBe(false);
	});
});
