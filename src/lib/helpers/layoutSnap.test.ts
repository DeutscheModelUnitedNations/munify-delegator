import { describe, expect, test } from 'vitest';
import { snapRect, type SnapSteps } from './layoutSnap';

const steps: SnapSteps = { threshold: { x: 0.01, y: 0.01 }, grid: { x: 0.005, y: 0.005 } };
const signature = { x: 0.5, y: 0.8, width: 0.3, height: 0.05 };

describe('snapRect', () => {
	test('lines a moved element up with another, edge to edge, and says where', () => {
		const placeDate = { x: 0.1, y: 0.806, width: 0.3, height: 0.05 };
		const snapped = snapRect({ rect: placeDate, others: [signature], steps, resize: false });
		expect(snapped.dy).toBeCloseTo(-0.006);
		expect(snapped.guides.horizontal).toEqual([0.8]);
		// nothing near on the other axis: the grid
		expect(snapped.guides.vertical).toEqual([]);
		expect((placeDate.x + snapped.dx) % 0.005).toBeCloseTo(0);
	});

	test('takes the nearest of the edges and centres', () => {
		const box = { x: 0.2, y: 0.4, width: 0.02, height: 0.02 };
		// its centre (0.41) is nearer the other's top (0.412) than any edge
		const other = { x: 0.6, y: 0.412, width: 0.1, height: 0.1 };
		const snapped = snapRect({ rect: box, others: [other], steps, resize: false });
		expect(snapped.dy).toBeCloseTo(0.002);
		expect(snapped.guides.horizontal).toEqual([0.412]);
	});

	test('lines up a text, a point at its baseline, with a line below a field', () => {
		const text = { x: 0.1, y: 0.853, width: 0, height: 0 };
		const snapped = snapRect({ rect: text, others: [signature], steps, resize: false });
		expect(text.y + snapped.dy).toBeCloseTo(0.85);
	});

	test('snaps only the far edges while resizing', () => {
		const box = { x: 0.1, y: 0.1, width: 0.395, height: 0.2 };
		const snapped = snapRect({ rect: box, others: [signature], steps, resize: true });
		// its right edge (0.495) meets the signature's left (0.5)
		expect(snapped.dx).toBeCloseTo(0.005);
		expect(snapped.guides.vertical).toEqual([0.5]);
	});

	test('makes a resized element as wide as another', () => {
		const placeDate = { x: 0.1, y: 0.8, width: 0.296, height: 0.05 };
		const snapped = snapRect({ rect: placeDate, others: [signature], steps, resize: true });
		expect(placeDate.width + snapped.dx).toBeCloseTo(signature.width);
		expect(snapped.guides.vertical).toEqual([0.4]);
		// the heights already match
		expect(snapped.dy).toBeCloseTo(0);
	});

	test('without others and a grid, leaves it where it is', () => {
		const free = { threshold: { x: 0.01, y: 0.01 }, grid: { x: 0, y: 0 } };
		expect(snapRect({ rect: signature, others: [], steps: free, resize: false })).toEqual({
			dx: 0,
			dy: 0,
			guides: { vertical: [], horizontal: [] }
		});
	});
});
