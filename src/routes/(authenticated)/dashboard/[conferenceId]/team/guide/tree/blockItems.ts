import { m } from '#lib/paraglide/messages';
import type { Outline } from '#lib/guide/outline';
import { moveBlock } from '#lib/guide/outlineEditing';
import type { TreeMenuItem } from './treeMenu';

/** "Up" and "down" for a block of the tree (a section, the template). */
export function blockMoveItems({
	outline,
	block,
	blocks,
	change
}: {
	outline: Outline;
	block: number;
	blocks: number;
	change: (outline: Outline) => void;
}): TreeMenuItem[] {
	return [
		{
			label: m.guideMoveUp(),
			icon: 'ph-arrow-up',
			disabled: block === 0,
			onSelect: () => change(moveBlock({ outline, from: block, to: block - 1 }))
		},
		{
			label: m.guideMoveDown(),
			icon: 'ph-arrow-down',
			disabled: block === blocks - 1,
			onSelect: () => change(moveBlock({ outline, from: block, to: block + 1 }))
		}
	];
}
