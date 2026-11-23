import { expect, test, vi } from 'vitest';
import type { Outline } from '#lib/guide/outline';
import { blockMoveItems } from './blockItems';

const outline: Outline = {
	sections: [
		{ id: 'a', title: 'A', audience: { type: 'everyone' }, entries: [] },
		{ id: 'b', title: 'B', audience: { type: 'everyone' }, entries: [] }
	]
};

test('moves a block up or down, not past either end', () => {
	const change = vi.fn();
	const [up, down] = blockMoveItems({ outline, block: 0, blocks: 2, change });
	expect(up.disabled).toBe(true);
	expect(down.disabled).toBe(false);
	down.onSelect?.();
	expect(change).toHaveBeenCalledWith({ sections: [outline.sections[1], outline.sections[0]] });
	const [last] = blockMoveItems({ outline, block: 1, blocks: 2, change });
	last.onSelect?.();
	expect(change).toHaveBeenLastCalledWith({ sections: [outline.sections[1], outline.sections[0]] });
});
