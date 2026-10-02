import { describe, expect, test } from 'vitest';
import { decodePlusCodeFull, recoverPlusCode } from './plusCode';

describe('decodePlusCodeFull', () => {
	test('decodes a 10-digit code to the centre of its cell', () => {
		const decoded = decodePlusCodeFull('8FVC9G8F+6X');
		expect(decoded?.latitude).toBeCloseTo(47.3655625, 6);
		expect(decoded?.longitude).toBeCloseTo(8.5249375, 6);
	});

	test('is case-insensitive', () => {
		expect(decodePlusCodeFull('8fvc9g8f+6x')).toEqual(decodePlusCodeFull('8FVC9G8F+6X'));
	});

	test('refines the position with grid digits after the tenth', () => {
		const decoded = decodePlusCodeFull('8FVC9G8F+6XR');
		expect(decoded?.latitude).toBeCloseTo(47.3656125, 6);
		expect(decoded?.longitude).toBeCloseTo(8.5248906, 6);
	});

	test('rejects codes without the separator after eight digits', () => {
		expect(decodePlusCodeFull('8FVC9G8F6X')).toBeNull();
		expect(decodePlusCodeFull('9G8F+6X')).toBeNull();
		// Trailing zero padding is stripped first, which leaves the separator too early.
		expect(decodePlusCodeFull('8FVC0000+')).toBeNull();
	});

	test('rejects characters outside the alphabet', () => {
		expect(decodePlusCodeFull('8FVC9G8A+6X')).toBeNull();
	});
});

describe('recoverPlusCode', () => {
	test('completes a short code from a nearby reference', () => {
		expect(recoverPlusCode('9G8F+6X', 47.4, 8.6)).toBe('8FVC9G8F+6X');
		expect(recoverPlusCode('CJ+2V', 47.36, 8.52)).toBe('8FVC9GCJ+2V');
	});

	test('moves north when the reference sits low in its cell', () => {
		expect(recoverPlusCode('9G8F+6X', 46.9, 8.6)).toBe('8FVC9G8F+6X');
	});

	test('moves south when the reference sits high in its cell', () => {
		expect(recoverPlusCode('X2X2+XX', 48.1, 8.6)).toBe('8FVFX2X2+XX');
	});

	test('moves west and east to the cell closest to the reference', () => {
		expect(recoverPlusCode('2X2X+XX', 47.4, 8.1)).toBe('8FV92X2X+XX');
		expect(recoverPlusCode('2222+22', 47.4, 8.9)).toBe('8FVF2222+22');
	});

	test('never moves past the poles', () => {
		expect(recoverPlusCode('X2X2+XX', -89.9, 8.6)).toBe('2F2FX2X2+XX');
		expect(recoverPlusCode('2222+22', 89.9, 8.6)).toBe('CFXF2222+22');
	});

	test('returns the unresolvable candidate as is', () => {
		expect(recoverPlusCode('9G8A+6X', 47.4, 8.6)).toBe('8FVC9G8A+6X');
	});
});
