import { describe, expect, test } from 'vitest';
import { uprightTurn, type FoundMarker } from './markers';

/** A marker seen turned by `angle` degrees, clockwise. */
function marker(angle: number): FoundMarker {
	const corners = [45, 135, 225, 315].map((from) => {
		const at = ((from + 180 + angle) * Math.PI) / 180;
		return { x: 100 + Math.cos(at) * 10, y: 100 + Math.sin(at) * 10 };
	});
	return { corner: 0, corners, wrongBits: 0 };
}

describe('uprightTurn', () => {
	test.each([
		[0, 0],
		[4, 0],
		[-12, 0],
		[90, 3],
		[82, 3],
		[180, 2],
		[-175, 2],
		[183, 2],
		[270, 1],
		[-95, 1]
	])('turns a page lying at %i degrees by %i quarter turns', (angle, turn) => {
		expect(uprightTurn([marker(angle), marker(angle + 2)])).toBe(turn);
		expect(uprightTurn([marker(angle)])).toBe(turn);
	});

	test('turns nothing without markers, or where they do not agree', () => {
		expect(uprightTurn([])).toBe(0);
		expect(uprightTurn([marker(180), marker(0)])).toBe(0);
	});
});
