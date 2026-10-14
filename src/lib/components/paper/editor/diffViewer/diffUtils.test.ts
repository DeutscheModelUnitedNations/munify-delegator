import { describe, expect, it } from 'vitest';
import { computeDiff, splitIntoDiffLines } from './diffUtils';

describe('splitIntoDiffLines', () => {
	it('splits segments at newlines and marks the kind of change per line', () => {
		const lines = splitIntoDiffLines([
			{ text: 'same\nold', type: 'equal' },
			{ text: ' added', type: 'insert' },
			{ text: ' gone\n', type: 'delete' },
			{ text: 'tail', type: 'equal' }
		]);

		expect(lines.map((line) => line.changeType)).toEqual(['none', 'mixed', 'none']);
		expect(lines[1].parts.map((part) => part.text)).toEqual(['old', ' added', ' gone']);
		expect(lines[1].hasChange).toBe(true);
		expect(lines[2].parts).toEqual([{ text: 'tail', type: 'equal' }]);
	});

	it('keeps a line of only inserted text as an insert', () => {
		const [line] = splitIntoDiffLines([{ text: 'new', type: 'insert' }]);
		expect(line.changeType).toBe('insert');
	});

	it('returns no lines for no segments', () => {
		expect(splitIntoDiffLines([])).toEqual([]);
	});
});

/** A TipTap document of one paragraph per text. */
const doc = (...paragraphs: string[]) => ({
	type: 'doc',
	content: paragraphs.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] }))
});

describe('computeDiff', () => {
	it('splits a change into what the before and after panels show', () => {
		const { beforeSegments, afterSegments } = computeDiff(
			doc('The council decides.'),
			doc('The council firmly decides.')
		);

		expect(beforeSegments.map((segment) => segment.type)).not.toContain('insert');
		expect(afterSegments.map((segment) => segment.type)).not.toContain('delete');
		expect(afterSegments).toContainEqual({
			text: expect.stringContaining('firmly'),
			type: 'insert'
		});
		expect(beforeSegments.map((segment) => segment.text).join('')).toBe('The council decides.');
		expect(afterSegments.map((segment) => segment.text).join('')).toBe(
			'The council firmly decides.'
		);
	});

	it('marks removed text as deleted on the before side only', () => {
		const { beforeSegments, afterSegments } = computeDiff(
			doc('Keep this. Drop this.'),
			doc('Keep this.')
		);

		expect(beforeSegments).toContainEqual({
			text: expect.stringContaining('Drop'),
			type: 'delete'
		});
		expect(afterSegments.map((segment) => segment.text).join('')).toBe('Keep this.');
	});

	it('shows identical documents as one unchanged segment on both sides', () => {
		const same = doc('Nothing changed.');
		expect(computeDiff(same, same)).toEqual({
			beforeSegments: [{ text: 'Nothing changed.', type: 'equal' }],
			afterSegments: [{ text: 'Nothing changed.', type: 'equal' }]
		});
	});
});
