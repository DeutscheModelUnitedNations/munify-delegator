import { createContext } from 'svelte';
import type { TreeDrag, TreeDrop } from '#lib/guide/outlineEditing';

/**
 * Dragging in the guide tree: what is held, which target it is over, and what a drop does
 * (`dropInTree`). Every row and heading of the tree is a source or a target through this.
 */
export function createTreeDrag(onDrop: (args: { drag: TreeDrag; drop: TreeDrop }) => void) {
	let held = $state<TreeDrag | null>(null);
	let over = $state<string | null>(null);

	return {
		get dragging() {
			return held !== null;
		},
		/** Whether the target `key` would take the held item now (for its drop marker). */
		isOver(key: string) {
			return over === key;
		},
		start({ drag, event }: { drag: TreeDrag; event: DragEvent }) {
			held = drag;
			// Firefox starts no drag without data
			event.dataTransfer?.setData('text/plain', drag.type);
			if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
		},
		enter({ key, accepts, event }: { key: string; accepts: boolean; event: DragEvent }) {
			if (!held || !accepts) return;
			event.preventDefault();
			over = key;
		},
		leave(key: string) {
			if (over === key) over = null;
		},
		drop({ drop, event }: { drop: TreeDrop; event: DragEvent }) {
			if (!held) return;
			event.preventDefault();
			event.stopPropagation();
			const drag = held;
			held = null;
			over = null;
			onDrop({ drag, drop });
		},
		end() {
			held = null;
			over = null;
		},
		/** What is held: blocks only go onto blocks. */
		holdsBlock() {
			return held?.type === 'block';
		}
	};
}

export type TreeDragState = ReturnType<typeof createTreeDrag>;

export const [getTreeDrag, setTreeDrag] = createContext<TreeDragState>();
