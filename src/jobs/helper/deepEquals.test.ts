import { describe, expect, test } from 'vitest';
import deepEquals from './deepEquals';

describe('deepEquals', () => {
	test('compares primitives with Object.is', () => {
		expect(deepEquals({ a: 1, b: 1 })).toBe(true);
		expect(deepEquals({ a: NaN, b: NaN })).toBe(true);
		expect(deepEquals({ a: -0, b: +0 })).toBe(false);
		expect(deepEquals({ a: 'a', b: 'b' })).toBe(false);
	});

	test('never equates an object with a primitive or null', () => {
		expect(deepEquals({ a: {}, b: null })).toBe(false);
		expect(deepEquals({ a: null, b: {} })).toBe(false);
		expect(deepEquals({ a: 1, b: { a: 1 } })).toBe(false);
		expect(deepEquals({ a: { a: 1 }, b: 'x' })).toBe(false);
	});

	test('compares arrays by position and length', () => {
		expect(deepEquals({ a: [1, [2, 3]], b: [1, [2, 3]] })).toBe(true);
		expect(deepEquals({ a: [1, 2], b: [2, 1] })).toBe(false);
		expect(deepEquals({ a: [1, undefined], b: [1] })).toBe(false);
	});

	test('never equates an array with an object', () => {
		expect(deepEquals({ a: [], b: {} })).toBe(false);
		expect(deepEquals({ a: { 0: 'a', length: 1 }, b: ['a'] })).toBe(false);
	});

	test('compares objects by their defined keys', () => {
		expect(deepEquals({ a: { a: 1, b: { c: [1] } }, b: { b: { c: [1] }, a: 1 } })).toBe(true);
		expect(deepEquals({ a: { a: 1 }, b: { a: 1, b: undefined } })).toBe(true);
		expect(deepEquals({ a: { a: 1, b: undefined }, b: { a: 1 } })).toBe(true);
		expect(deepEquals({ a: { a: 1 }, b: { a: 2 } })).toBe(false);
		expect(deepEquals({ a: { a: 1 }, b: { a: 1, b: 2 } })).toBe(false);
		expect(deepEquals({ a: { a: 1, c: 2 }, b: { a: 1, b: 2 } })).toBe(false);
	});

	test('terminates on cyclic structures', () => {
		const x: { self?: unknown; value: number } = { value: 1 };
		x.self = x;
		const y: { self?: unknown; value: number } = { value: 1 };
		y.self = y;
		expect(deepEquals({ a: x, b: y })).toBe(true);

		const z: { self?: unknown; value: number } = { value: 2 };
		z.self = z;
		expect(deepEquals({ a: x, b: z })).toBe(false);
	});
});
